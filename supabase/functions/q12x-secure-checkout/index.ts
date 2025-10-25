// @ts-nocheck
import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'
import bcrypt from 'https://esm.sh/bcryptjs@2.4.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

const isExpiryValid = (expiry: string) => {
  if (!/^\d{2}\/\d{2}$/.test(expiry)) return false;
  const [month, year] = expiry.split('/');
  const expiryMonth = parseInt(month, 10);
  const expiryYear = 2000 + parseInt(year, 10);
  if (expiryMonth < 1 || expiryMonth > 12) return false;
  const now = new Date();
  const lastDayOfExpiryMonth = new Date(expiryYear, expiryMonth, 0);
  return lastDayOfExpiryMonth >= now;
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const { checkoutId, card_number, expiry_date, pin, amount, fraud_signals } = await req.json();
  const ipAddress = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? null;
  
  let confidenceScore = 100;
  const riskReasons = [];
  let profile = null;
  let card = null;
  let decision = 'ALLOW';

  const analysis_log = [];
  const startTime = Date.now();
  const logStep = (step, result, impact) => {
    analysis_log.push({
        timestamp: Date.now() - startTime,
        step,
        result,
        impact: `${impact > 0 ? '+' : ''}${impact}`
    });
  };

  try {
    logStep('Initialisation', 'Début de l\'analyse de la transaction', 0);
    if (!checkoutId || !card_number || !expiry_date || !pin || !amount || !fraud_signals) {
      throw new Error('Missing required payment information.');
    }

    const { data: cardData, error: cardError } = await supabaseAdmin
      .from('cards').select('id, pin, expires_at, profile_id, profiles(*)').match({
        user_initials: card_number.initials, issuer_id: card_number.issuer_id,
        random_letters: card_number.random_letters, unique_identifier: card_number.unique_identifier,
        check_digit: card_number.check_digit,
      }).single();

    if (cardError || !cardData || !cardData.profiles) {
      riskReasons.push('Carte non trouvée');
      logStep('Validation de la carte', 'Carte non trouvée dans le système', -100);
      throw new Error('Payment declined by issuer.');
    }
    card = cardData;
    profile = cardData.profiles;
    logStep('Validation de la carte', `Carte ${card.id} trouvée, associée au profil ${profile.id}`, 0);

    if (!isExpiryValid(expiry_date)) {
      riskReasons.push('Format d\'expiration invalide');
      confidenceScore -= 100;
      logStep('Validation de l\'expiration', 'Format invalide ou date expirée', -100);
    } else {
      const [month, year] = expiry_date.split('/');
      const cardExpiresAt = new Date(card.expires_at);
      if (parseInt(month, 10) !== cardExpiresAt.getUTCMonth() + 1 || (2000 + parseInt(year, 10)) !== cardExpiresAt.getUTCFullYear()) {
        riskReasons.push('Date d\'expiration ne correspond pas');
        confidenceScore -= 100;
        logStep('Validation de l\'expiration', 'La date ne correspond pas à celle du dossier', -100);
      } else {
        logStep('Validation de l\'expiration', 'Date valide et correspondante', 0);
      }
    }

    if (!bcrypt.compareSync(pin, card.pin)) {
      riskReasons.push('NIP incorrect');
      confidenceScore -= 80;
      logStep('Validation du NIP', 'Le NIP fourni est incorrect', -80);
    } else {
      logStep('Validation du NIP', 'Le NIP est correct', 0);
    }

    if (fraud_signals.pan_entry_duration_ms < 1000) { confidenceScore -= 25; riskReasons.push('Saisie du PAN trop rapide'); logStep('Analyse comportementale', 'Saisie du PAN trop rapide', -25); }
    if (fraud_signals.pan_entry_duration_ms > 20000) { confidenceScore -= 15; riskReasons.push('Saisie du PAN trop lente'); logStep('Analyse comportementale', 'Saisie du PAN trop lente', -15); }
    if (fraud_signals.expiry_entry_duration_ms > 7000) { confidenceScore -= 10; riskReasons.push('Saisie de l\'expiration trop lente'); logStep('Analyse comportementale', 'Saisie de l\'expiration trop lente', -10); }
    if (fraud_signals.pin_entry_duration_ms < 500) { confidenceScore -= 20; riskReasons.push('Saisie du NIP trop rapide'); logStep('Analyse comportementale', 'Saisie du NIP trop rapide', -20); }
    if (fraud_signals.pin_inter_digit_avg_ms < 50) { confidenceScore -= 30; riskReasons.push('Cadence de saisie du NIP trop rapide (script ?)'); logStep('Analyse comportementale', 'Cadence NIP suspecte (rapide)', -30); }
    if (fraud_signals.pin_inter_digit_avg_ms > 2000) { confidenceScore -= 15; riskReasons.push('Cadence de saisie du NIP trop lente (hésitation ?)'); logStep('Analyse comportementale', 'Cadence NIP suspecte (lente)', -15); }
    if (fraud_signals.paste_events > 0) { confidenceScore -= 5; riskReasons.push('Événements de collage détectés'); logStep('Analyse comportementale', 'Collage détecté dans le formulaire', -5); }
    
    if (profile.avg_transaction_amount > 0 && profile.transaction_amount_stddev > 0) {
      const deviation = Math.abs(amount - profile.avg_transaction_amount) / profile.transaction_amount_stddev;
      logStep('Analyse de la baseline', `Écart-type du montant: ${deviation.toFixed(2)}`, 0);
      if (deviation > 2.5) { confidenceScore -= 30; riskReasons.push('Écart de montant significatif'); logStep('Analyse de la baseline', 'Montant inhabituellement élevé', -30); }
    } else {
      logStep('Analyse de la baseline', 'Aucun historique pour comparer le montant', 0);
    }

    if (profile.last_transaction_at) {
      const timeSinceLast = (new Date() - new Date(profile.last_transaction_at)) / 1000;
      logStep('Analyse de vélocité', `Dernière transaction il y a ${timeSinceLast.toFixed(0)}s`, 0);
      if (timeSinceLast < 15) { confidenceScore -= 40; riskReasons.push('Vélocité des transactions trop élevée'); logStep('Analyse de vélocité', 'Transactions trop rapprochées', -40); }
    } else {
      logStep('Analyse de vélocité', 'Première transaction pour ce profil', 0);
    }
    
    confidenceScore = Math.max(0, confidenceScore);
    decision = confidenceScore <= 40 ? 'BLOCK' : 'ALLOW';
    logStep('Décision finale', `Score de confiance final: ${confidenceScore}. Décision: ${decision}`, 0);

    if (decision === 'BLOCK') {
      throw new Error('Payment declined by issuer.');
    }

    const { data: transactionResult, error: rpcError } = await supabaseAdmin.rpc('process_transaction', {
      p_card_id: card.id, p_amount: parseFloat(amount), p_type: 'purchase',
      p_description: `Paiement: ${checkoutId}`,
      p_merchant_account_id: (await supabaseAdmin.from('checkouts').select('merchant_account_id').eq('id', checkoutId).single()).data.merchant_account_id,
      p_ip_address: ipAddress,
    });
    if (rpcError) throw rpcError;

    await supabaseAdmin.from('transaction_risk_assessments').insert({
      transaction_id: transactionResult.transaction_id, profile_id: profile.id,
      risk_score: confidenceScore, decision: decision,
      signals: { ...fraud_signals, ipAddress, riskReasons, analysis_log },
    });
    await supabaseAdmin.from('profiles').update({ last_transaction_at: new Date().toISOString() }).eq('id', profile.id);

    // Mettre à jour les statistiques du profil de manière asynchrone
    await supabaseAdmin.rpc('update_profile_transaction_stats', { profile_id_to_update: profile.id });

    return new Response(JSON.stringify({ success: true, transaction: transactionResult }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200,
    });

  } catch (error) {
    await supabaseAdmin.from('transaction_risk_assessments').insert({
      profile_id: profile ? profile.id : null,
      risk_score: Math.max(0, confidenceScore), decision: 'BLOCK',
      signals: { ...fraud_signals, ipAddress, riskReasons, analysis_log, error: error.message },
    });
    return new Response(JSON.stringify({ error: "Le paiement a été refusé par l'institution émettrice de la carte." }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400,
    });
  }
})