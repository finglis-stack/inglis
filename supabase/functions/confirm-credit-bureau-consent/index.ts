// @ts-nocheck
import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

async function pushDataToCreditBureau(supabaseAdmin, profile, institutionName) {
  if (!profile.sin) {
    console.warn(`Profile ${profile.id} has no SIN, cannot push data.`);
    return;
  }

  // Fetch accounts with card and program info
  const { data: creditAccounts, error: creditAccountsError } = await supabaseAdmin
    .from('credit_accounts')
    .select('*, cards(*, card_programs(program_name))')
    .eq('profile_id', profile.id)
    .in('status', ['active', 'inactive']);
  if (creditAccountsError) throw creditAccountsError;

  const { data: debitAccounts, error: debitAccountsError } = await supabaseAdmin
    .from('debit_accounts')
    .select('*, cards(*, card_programs(program_name))')
    .eq('profile_id', profile.id)
    .in('status', ['active', 'inactive']);
  if (debitAccountsError) throw debitAccountsError;

  const newHistoryEntries = [];
  const currencyFormatter = new Intl.NumberFormat('fr-CA', { style: 'currency', currency: 'CAD' });

  // Process Credit Accounts
  for (const acc of creditAccounts) {
    const { data: balanceData, error: balanceError } = await supabaseAdmin
      .rpc('get_credit_account_balance', { p_account_id: acc.id })
      .single();
    if (balanceError) {
      console.error(`Error fetching balance for credit account ${acc.id}:`, balanceError.message);
      continue;
    }
    
    const current_balance = balanceData.current_balance;
    const debtRatio = acc.credit_limit > 0 ? (current_balance / acc.credit_limit) * 100 : 0;
    const programName = acc.cards?.card_programs?.program_name || 'N/A';

    newHistoryEntries.push({
      date: new Date().toISOString().split('T')[0],
      type: programName,
      details: `Émetteur: ${institutionName}, Solde: ${currencyFormatter.format(current_balance)}, Ratio d'endettement: ${debtRatio.toFixed(2)}%`,
      status: acc.status === 'active' ? 'Actif' : 'Inactif'
    });
  }

  // Process Debit Accounts
  for (const acc of debitAccounts) {
    const { data: balanceData, error: balanceError } = await supabaseAdmin
      .rpc('get_debit_account_balance', { p_account_id: acc.id })
      .single();
    if (balanceError) {
      console.error(`Error fetching balance for debit account ${acc.id}:`, balanceError.message);
      continue;
    }

    const current_balance = balanceData.current_balance;
    const programName = acc.cards?.card_programs?.program_name || 'N/A';

    newHistoryEntries.push({
      date: new Date().toISOString().split('T')[0],
      type: programName,
      details: `Émetteur: ${institutionName}, Solde: ${currencyFormatter.format(current_balance)}`,
      status: acc.status === 'active' ? 'Actif' : 'Inactif'
    });
  }

  const { data: report, error: reportError } = await supabaseAdmin
    .from('credit_reports')
    .select('credit_history')
    .eq('ssn', profile.sin)
    .single();

  if (reportError && reportError.code !== 'PGRST116') throw reportError;

  // Filter out old entries from this specific institution to prevent duplicates
  const filteredHistory = (report?.credit_history || []).filter(entry => 
    !entry.details.includes(`Émetteur: ${institutionName}`)
  );

  const updatedHistory = filteredHistory.concat(newHistoryEntries);

  const { error: updateError } = await supabaseAdmin
    .from('credit_reports')
    .update({ credit_history: updatedHistory, updated_at: new Date().toISOString() })
    .eq('ssn', profile.sin);

  if (updateError) throw updateError;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { token, autoConsent } = await req.json();
    if (!token) throw new Error("Jeton manquant.");

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('*, institutions(name)')
      .eq('credit_bureau_consent_token', token)
      .single();

    if (profileError || !profile) throw new Error("Jeton invalide ou expiré.");
    if (new Date(profile.credit_bureau_consent_token_expires_at) < new Date()) {
      throw new Error("Jeton expiré.");
    }

    await pushDataToCreditBureau(supabaseAdmin, profile, profile.institutions.name);

    const { error: updateProfileError } = await supabaseAdmin
      .from('profiles')
      .update({
        credit_bureau_auto_consent: autoConsent,
        credit_bureau_consent_token: null,
        credit_bureau_consent_token_expires_at: null,
      })
      .eq('id', profile.id);

    if (updateProfileError) throw updateProfileError;

    return new Response(JSON.stringify({ 
      message: "Consentement confirmé et données mises à jour.",
      institutionName: profile.institutions.name
    }), {
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