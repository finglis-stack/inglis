// @ts-nocheck
import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { checkoutId, card_token, amount, fraud_signals } = await req.json();
    if (!checkoutId || !card_token || !amount || !fraud_signals) {
      throw new Error('checkoutId, card_token, amount, and fraud_signals are required.');
    }

    const ipAddress = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? null;

    // 1. Valider le jeton de carte pour obtenir le profil
    const { data: tokenData, error: tokenError } = await supabaseAdmin
      .from('card_tokens').select('card_id, cards(profile_id, profiles(*))').eq('token', card_token).single();
    if (tokenError || !tokenData || !tokenData.cards || !tokenData.cards.profiles) throw new Error('Invalid card token.');
    
    const profile = tokenData.cards.profiles;
    let riskScore = 0;
    const riskReasons = [];

    // 2. Évaluation des signaux de risque
    // Signal comportemental : Vitesse de saisie du NIP
    if (fraud_signals.pin_entry_duration_ms < 500) {
      riskScore += 20;
      riskReasons.push('PIN entry too fast');
    }
    // Signal comportemental : Copier-coller
    if (fraud_signals.paste_events > 0) {
      riskScore += 5;
      riskReasons.push('Paste events detected');
    }
    // Signal transactionnel : Montant
    if (profile.avg_transaction_amount > 0 && profile.transaction_amount_stddev > 0) {
      const deviation = Math.abs(amount - profile.avg_transaction_amount) / profile.transaction_amount_stddev;
      if (deviation > 2.5) { // Plus de 2.5 écarts-types
        riskScore += 30;
        riskReasons.push('Amount deviation significant');
      }
    }
    // Signal de vélocité : Temps depuis la dernière transaction
    if (profile.last_transaction_at) {
      const timeSinceLast = (new Date() - new Date(profile.last_transaction_at)) / 1000;
      if (timeSinceLast < 15) { // Moins de 15 secondes
        riskScore += 40;
        riskReasons.push('Transaction velocity too high');
      }
    }
    
    // 3. Décision basée sur le score
    const decision = riskScore >= 60 ? 'BLOCK' : 'ALLOW';

    // 4. Journaliser l'évaluation
    const { data: assessment, error: logError } = await supabaseAdmin.from('transaction_risk_assessments').insert({
      profile_id: profile.id,
      risk_score: riskScore,
      decision: decision,
      signals: { ...fraud_signals, ipAddress, riskReasons },
    }).select('id').single();
    if (logError) console.error("Failed to log risk assessment:", logError.message);

    // 5. Bloquer ou procéder
    if (decision === 'BLOCK') {
      throw new Error('Transaction declined for security reasons.');
    }

    // 6. Procéder à la transaction
    const { data: transactionResult, error: rpcError } = await supabaseAdmin.rpc('process_transaction', {
      p_card_id: tokenData.card_id,
      p_amount: parseFloat(amount),
      p_type: 'purchase',
      p_description: `Paiement: ${checkoutId}`,
      p_merchant_account_id: (await supabaseAdmin.from('checkouts').select('merchant_account_id').eq('id', checkoutId).single()).data.merchant_account_id,
      p_ip_address: ipAddress,
    });
    if (rpcError) throw rpcError;

    // 7. Mettre à jour le journal de risque avec l'ID de transaction et mettre à jour le profil
    if (assessment) {
      await supabaseAdmin.from('transaction_risk_assessments').update({ transaction_id: transactionResult.transaction_id }).eq('id', assessment.id);
    }
    // (Une logique plus complexe mettrait à jour les statistiques du profil ici)
    await supabaseAdmin.from('profiles').update({ last_transaction_at: new Date().toISOString() }).eq('id', profile.id);

    return new Response(JSON.stringify({ success: true, transaction: transactionResult }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
})