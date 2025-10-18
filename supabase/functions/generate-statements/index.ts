// @ts-nocheck
import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const today = new Date();
    const dayOfMonth = today.getDate();

    // 1. Sélectionner les comptes dont le cycle de facturation se termine aujourd'hui
    const { data: accounts, error: accountsError } = await supabaseAdmin
      .from('credit_accounts')
      .select('*, cards(card_programs(grace_period))')
      .eq('billing_cycle_anchor_day', dayOfMonth);

    if (accountsError) throw accountsError;

    for (const account of accounts) {
      const { data: previousStatement, error: prevStatementError } = await supabaseAdmin
        .from('statements')
        .select('*')
        .eq('id', account.current_statement_id)
        .single();

      if (prevStatementError && prevStatementError.code !== 'PGRST116') throw prevStatementError;

      let totalInterest = 0;
      let openingBalance = account.current_balance;

      // 2. Calculer les intérêts sur le relevé précédent s'il n'est pas payé en totalité
      if (previousStatement && !previousStatement.is_paid_in_full) {
        const { data: transactions, error: transError } = await supabaseAdmin
          .from('transactions')
          .select('*')
          .eq('statement_id', previousStatement.id);
        if (transError) throw transError;

        const dailyInterestRate = (account.interest_rate / 100) / 365;
        const dailyCashAdvanceRate = (account.cash_advance_rate / 100) / 365;

        for (const tx of transactions) {
          const txDate = new Date(tx.created_at);
          const daysSinceTx = Math.floor((today - txDate) / (1000 * 60 * 60 * 24));

          if (tx.type === 'cash_advance') {
            // Les avances de fonds accumulent des intérêts dès le premier jour
            totalInterest += tx.amount * dailyCashAdvanceRate * daysSinceTx;
          } else if (tx.type === 'purchase') {
            // Les achats accumulent des intérêts si le délai de grâce est passé
            const gracePeriodEnds = new Date(previousStatement.payment_due_date);
            if (today > gracePeriodEnds) {
              totalInterest += tx.amount * dailyInterestRate * daysSinceTx;
            }
          }
        }
      }

      // 3. Appliquer les frais d'intérêt s'il y en a
      if (totalInterest > 0) {
        openingBalance += totalInterest;
        await supabaseAdmin.from('transactions').insert({
          credit_account_id: account.id,
          amount: totalInterest,
          type: 'interest_charge',
          description: 'Frais d\'intérêt mensuels'
        });
        await supabaseAdmin.from('credit_accounts').update({ current_balance: openingBalance }).eq('id', account.id);
      }

      // 4. Créer le nouveau relevé
      const gracePeriod = account.cards.card_programs.grace_period || 21;
      const statementStartDate = new Date(today);
      const statementEndDate = new Date(today);
      statementEndDate.setMonth(statementEndDate.getMonth() + 1);
      statementEndDate.setDate(statementEndDate.getDate() - 1);
      const paymentDueDate = new Date(statementEndDate);
      paymentDueDate.setDate(paymentDueDate.getDate() + gracePeriod);

      const minimumPayment = Math.max(25, openingBalance * 0.01 + totalInterest);

      const { data: newStatement, error: newStatementError } = await supabaseAdmin
        .from('statements')
        .insert({
          credit_account_id: account.id,
          statement_period_start: statementStartDate.toISOString().split('T')[0],
          statement_period_end: statementEndDate.toISOString().split('T')[0],
          payment_due_date: paymentDueDate.toISOString().split('T')[0],
          opening_balance: previousStatement ? previousStatement.closing_balance : 0,
          closing_balance: openingBalance,
          minimum_payment: minimumPayment
        })
        .select('id')
        .single();

      if (newStatementError) throw newStatementError;

      // 5. Mettre à jour le compte de crédit avec le nouvel ID de relevé
      await supabaseAdmin
        .from('credit_accounts')
        .update({ current_statement_id: newStatement.id })
        .eq('id', account.id);
        
      // 6. Lier les transactions non facturées au nouveau relevé
      await supabaseAdmin
        .from('transactions')
        .update({ statement_id: newStatement.id })
        .eq('credit_account_id', account.id)
        .is('statement_id', null);
    }

    return new Response(JSON.stringify({ message: `Generated statements for ${accounts.length} accounts.` }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});