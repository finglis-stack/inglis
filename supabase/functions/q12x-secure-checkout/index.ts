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

  const { checkoutId, card_token, amount, fraud_signals } = await req.json();
  const ipAddress = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? null;
  
  const startTime = Date.now();
  const analysisLog = [];
  let riskScore = 100; // Score de confiance, commence à 100

  try {
    // --- VALIDATION & DATA FETCHING ---
    analysisLog.push({ step: "Début de la validation", result: "Initialisation", impact: "+0", timestamp: Date.now() - startTime });

    if (!checkoutId || !card_token || !amount) {
      throw new Error('checkoutId, card_token, and amount are required.');
    }

    // 1. Valider le jeton et récupérer l'ID de la carte
    const { data: tokenData, error: tokenError } = await supabaseAdmin
      .from('card_tokens')
      .select('card_id, expires_at, used_at')
      .eq('token', card_token)
      .single();

    if (tokenError || !tokenData) throw new Error('Jeton de paiement invalide ou expiré.');
    if (tokenData.used_at) throw new Error('Ce jeton a déjà été utilisé.');
    if (new Date(tokenData.expires_at) < new Date()) throw new Error('Ce jeton a expiré.');
    
    const cardId = tokenData.card_id;
    // Marquer le jeton comme utilisé pour empêcher sa réutilisation
    await supabaseAdmin.from('card_tokens').update({ used_at: new Date().toISOString() }).eq('token', card_token);
    analysisLog.push({ step: "Validation du jeton", result: `Jeton valide pour la carte ${cardId}`, impact: "+0", timestamp: Date.now() - startTime });


    const { data: checkout, error: checkoutError } = await supabaseAdmin
      .from('checkouts')
      .select('id, name, merchant_account_id, amount, is_amount_variable, status, currency')
      .eq('id', checkoutId)
      .single();
    if (checkoutError || !checkout) throw new Error('Checkout not found.');
    if (checkout.status !== 'active') throw new Error('This checkout is not active.');
    analysisLog.push({ step: "Validation du checkout", result: `Checkout ${checkout.id} trouvé`, impact: "+0", timestamp: Date.now() - startTime });

    const finalAmount = checkout.is_amount_variable ? parseFloat(amount) : checkout.amount;
    if (isNaN(finalAmount) || finalAmount <= 0) throw new Error('Invalid amount.');
    const checkoutCurrency = checkout.currency;

    const { data: cardData, error: cardError } = await supabaseAdmin
      .from('cards').select('id, profile_id, profiles(*, debit_accounts(currency), credit_accounts(currency))')
      .eq('id', cardId)
      .single();
    
    if (cardError || !cardData) throw new Error('Payment declined by issuer.');
    
    const cardCurrency = cardData.profiles.debit_accounts[0]?.currency || cardData.profiles.credit_accounts[0]?.currency;
    if (!cardCurrency) throw new Error("Could not determine card's currency.");

    let amountToCharge = finalAmount;
    let exchangeRate = null;

    if (cardCurrency !== checkoutCurrency) {
      const { data: rateData, error: rateError } = await supabaseAdmin.functions.invoke('get-exchange-rate', {
        body: { from: checkoutCurrency, to: cardCurrency }
      });
      if (rateError) throw new Error("Could not retrieve exchange rate.");
      exchangeRate = rateData.rate;
      amountToCharge = finalAmount * exchangeRate;
      analysisLog.push({ step: "Conversion de devise", result: `Taux de ${checkoutCurrency} à ${cardCurrency}: ${exchangeRate}`, impact: "+0", timestamp: Date.now() - startTime });
    }

    // --- RISK ANALYSIS ---
    const profile = cardData.profiles;
    if (profile.avg_transaction_amount > 0 && profile.transaction_amount_stddev > 0) {
      const z_score = Math.abs((amountToCharge - profile.avg_transaction_amount) / profile.transaction_amount_stddev);
      if (z_score > 2) { riskScore -= 30; analysisLog.push({ step: "Analyse du montant", result: `Montant inhabituel (Z-score: ${z_score.toFixed(2)})`, impact: "-30", timestamp: Date.now() - startTime }); }
      else { analysisLog.push({ step: "Analyse du montant", result: "Montant habituel", impact: "+0", timestamp: Date.now() - startTime }); }
    }

    if (fraud_signals?.pan_entry_duration_ms < 1000) { riskScore -= 15; analysisLog.push({ step: "Analyse comportementale", result: "Saisie du PAN très rapide", impact: "-15", timestamp: Date.now() - startTime }); }
    else { analysisLog.push({ step: "Analyse comportementale", result: "Saisie du PAN normale", impact: "+0", timestamp: Date.now() - startTime }); }

    if (fraud_signals?.paste_events > 0) { riskScore -= 20; analysisLog.push({ step: "Analyse comportementale", result: "Utilisation du copier-coller", impact: "-20", timestamp: Date.now() - startTime }); }
    else { analysisLog.push({ step: "Analyse comportementale", result: "Aucun copier-coller détecté", impact: "+0", timestamp: Date.now() - startTime }); }
    
    const decision = riskScore < 40 ? 'BLOCK' : 'APPROVE';
    analysisLog.push({ step: "Décision finale", result: `Score de confiance: ${riskScore}`, impact: "+0", timestamp: Date.now() - startTime });

    const { error: assessmentError } = await supabaseAdmin.from('transaction_risk_assessments').insert({
      profile_id: profile.id,
      risk_score: riskScore,
      decision: decision,
      signals: { ...fraud_signals, ipAddress, analysis_log: analysisLog, amount: amountToCharge, merchant_name: checkout.name },
    });
    if (assessmentError) console.error("Failed to log risk assessment:", assessmentError.message);

    if (decision === 'BLOCK') {
      throw new Error("Transaction bloquée en raison d'un risque de fraude élevé.");
    }

    // --- TRANSACTION PROCESSING ---
    const { data: transactionResult, error: rpcError } = await supabaseAdmin.rpc('process_transaction', {
      p_card_id: cardData.id, 
      p_amount: amountToCharge,
      p_type: 'purchase',
      p_description: `Paiement: ${checkout.name} (${checkout.id})`,
      p_merchant_account_id: checkout.merchant_account_id,
      p_ip_address: ipAddress,
    });
    if (rpcError) throw rpcError;

    if (exchangeRate) {
      await supabaseAdmin.from('transactions').update({
        original_amount: finalAmount,
        original_currency: checkoutCurrency,
        exchange_rate: exchangeRate
      }).eq('id', transactionResult.transaction_id);
    }

    await supabaseAdmin.rpc('update_profile_transaction_stats', { profile_id_to_update: profile.id });

    return new Response(JSON.stringify({ success: true, transaction: transactionResult }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200,
    });

  } catch (error) {
    console.error("Q12x Checkout Error:", error.message);
    return new Response(JSON.stringify({ error: "Le paiement a été refusé par l'institution émettrice de la carte." }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400,
    });
  }
})