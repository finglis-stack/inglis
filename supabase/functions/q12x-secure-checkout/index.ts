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

// Fonction pour calculer la distance de Haversine entre deux points
const haversineDistance = (coords1, coords2) => {
  const R = 6371; // Rayon de la Terre en km
  const dLat = (coords2.lat - coords1.lat) * Math.PI / 180;
  const dLon = (coords2.lon - coords1.lon) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(coords1.lat * Math.PI / 180) * Math.cos(coords2.lat * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

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

    const { data: tokenData, error: tokenError } = await supabaseAdmin
      .from('card_tokens')
      .select('card_id, expires_at, used_at')
      .eq('token', card_token)
      .single();

    if (tokenError || !tokenData) throw new Error('Jeton de paiement invalide ou expiré.');
    if (tokenData.used_at) throw new Error('Ce jeton a déjà été utilisé.');
    if (new Date(tokenData.expires_at) < new Date()) throw new Error('Ce jeton a expiré.');
    
    const cardId = tokenData.card_id;
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
      .from('cards').select('id, pin, expires_at, profile_id, profiles(*, debit_accounts(id, currency), credit_accounts(id, currency))').match({ id: cardId }).single();
    
    if (cardError || !cardData) throw new Error('Payment declined by issuer.');
    analysisLog.push({ step: "Validation de la carte", result: `Carte ${cardData.id} trouvée`, impact: "+0", timestamp: Date.now() - startTime });

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

    // **NOUVELLE LOGIQUE D'ANALYSE DE MONTANT**
    const LOW_VALUE_THRESHOLD = 25.00;
    if (amountToCharge <= LOW_VALUE_THRESHOLD) {
      riskScore += 5; // Bonus de confiance pour les petits montants
      analysisLog.push({ step: "Analyse du montant", result: "Transaction de faible valeur, tolérée", impact: "+5", timestamp: Date.now() - startTime });
    } else if (profile.avg_transaction_amount > 0 && profile.transaction_amount_stddev > 0) {
      if (amountToCharge > profile.avg_transaction_amount) {
        const z_score = (amountToCharge - profile.avg_transaction_amount) / profile.transaction_amount_stddev;
        if (z_score > 2.5) {
          riskScore -= 40;
          analysisLog.push({ step: "Analyse du montant", result: `Montant très élevé par rapport à la moyenne (Z-score: ${z_score.toFixed(2)})`, impact: "-40", timestamp: Date.now() - startTime });
        } else if (z_score > 1.5) {
          riskScore -= 20;
          analysisLog.push({ step: "Analyse du montant", result: `Montant plus élevé que la normale (Z-score: ${z_score.toFixed(2)})`, impact: "-20", timestamp: Date.now() - startTime });
        } else {
          analysisLog.push({ step: "Analyse du montant", result: "Montant dans la plage normale supérieure", impact: "+0", timestamp: Date.now() - startTime });
        }
      } else {
        riskScore += 5; // Bonus de confiance pour les montants inférieurs à la moyenne
        analysisLog.push({ step: "Analyse du montant", result: "Montant inférieur à la moyenne, non suspect", impact: "+5", timestamp: Date.now() - startTime });
      }
    } else {
      analysisLog.push({ step: "Analyse du montant", result: "Pas d'historique pour l'analyse du montant", impact: "+0", timestamp: Date.now() - startTime });
    }

    if (fraud_signals?.pan_entry_duration_ms < 1000) { riskScore -= 15; analysisLog.push({ step: "Analyse comportementale", result: "Saisie du PAN très rapide", impact: "-15", timestamp: Date.now() - startTime }); }
    else { analysisLog.push({ step: "Analyse comportementale", result: "Saisie du PAN normale", impact: "+0", timestamp: Date.now() - startTime }); }

    if (fraud_signals?.paste_events > 0) { riskScore -= 20; analysisLog.push({ step: "Analyse comportementale", result: "Utilisation du copier-coller", impact: "-20", timestamp: Date.now() - startTime }); }
    else { analysisLog.push({ step: "Analyse comportementale", result: "Aucun copier-coller détecté", impact: "+0", timestamp: Date.now() - startTime }); }
    
    // Velocity Check
    const debitAccountIds = profile.debit_accounts.map(a => a.id);
    const creditAccountIds = profile.credit_accounts.map(a => a.id);

    const orConditions = [];
    if (debitAccountIds.length > 0) orConditions.push(`debit_account_id.in.(${debitAccountIds.join(',')})`);
    if (creditAccountIds.length > 0) orConditions.push(`credit_account_id.in.(${creditAccountIds.join(',')})`);

    let lastTransaction = null;
    if (orConditions.length > 0) {
      const { data } = await supabaseAdmin
        .from('transactions')
        .select('ip_address, created_at')
        .or(orConditions.join(','))
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      lastTransaction = data;
    }

    // CORRECTION: Vérifier la vélocité même si l'IP est la même
    if (lastTransaction && ipAddress) {
      try {
        const timeDiffMinutes = (new Date().getTime() - new Date(lastTransaction.created_at).getTime()) / (1000 * 60);
        
        // Si moins de 1 minute entre deux transactions, c'est suspect
        if (timeDiffMinutes < 1) {
          riskScore -= 30;
          analysisLog.push({ 
            step: "Analyse de vélocité temporelle", 
            result: `Transactions trop rapprochées (${Math.round(timeDiffMinutes * 60)} secondes)`, 
            impact: "-30", 
            timestamp: Date.now() - startTime 
          });
        }

        // Vérifier la géolocalisation si on a une IP différente OU si assez de temps s'est écoulé
        if (lastTransaction.ip_address && (lastTransaction.ip_address !== ipAddress || timeDiffMinutes > 5)) {
          try {
            console.log(`Fetching geolocation for current IP: ${ipAddress} and last IP: ${lastTransaction.ip_address}`);
            
            const [currentGeoResponse, lastGeoResponse] = await Promise.all([
              fetch(`https://ipapi.co/${ipAddress}/json/`),
              fetch(`https://ipapi.co/${lastTransaction.ip_address}/json/`)
            ]);
            
            const currentGeo = await currentGeoResponse.json();
            const lastGeo = await lastGeoResponse.json();
            
            console.log('Current geo data:', JSON.stringify(currentGeo));
            console.log('Last geo data:', JSON.stringify(lastGeo));
            
            // Vérifier si on a des erreurs de l'API
            if (currentGeo.error || lastGeo.error) {
              analysisLog.push({ 
                step: "Analyse de vélocité géographique", 
                result: `Erreur API géolocalisation: ${currentGeo.reason || lastGeo.reason || 'Unknown'}`, 
                impact: "+0", 
                timestamp: Date.now() - startTime 
              });
            } else if (currentGeo.latitude && lastGeo.latitude) {
              const distanceKm = haversineDistance(
                { lat: currentGeo.latitude, lon: currentGeo.longitude }, 
                { lat: lastGeo.latitude, lon: lastGeo.longitude }
              );
              
              const timeDiffHours = timeDiffMinutes / 60;
              
              if (timeDiffHours > 0 && distanceKm > 1) { // Plus de 1km de distance
                const speedKmh = distanceKm / timeDiffHours;
                
                if (speedKmh > 900) { // Vitesse d'un avion de ligne
                  riskScore -= 50;
                  analysisLog.push({ 
                    step: "Analyse de vélocité géographique", 
                    result: `Déplacement impossible (${Math.round(speedKmh)} km/h sur ${Math.round(distanceKm)} km en ${Math.round(timeDiffMinutes)} min) - ${lastGeo.city || 'Unknown'} → ${currentGeo.city || 'Unknown'}`, 
                    impact: "-50", 
                    timestamp: Date.now() - startTime 
                  });
                } else if (speedKmh > 500) { // Vitesse très élevée mais techniquement possible
                  riskScore -= 25;
                  analysisLog.push({ 
                    step: "Analyse de vélocité géographique", 
                    result: `Déplacement très rapide (${Math.round(speedKmh)} km/h sur ${Math.round(distanceKm)} km) - ${lastGeo.city || 'Unknown'} → ${currentGeo.city || 'Unknown'}`, 
                    impact: "-25", 
                    timestamp: Date.now() - startTime 
                  });
                } else if (speedKmh > 200) { // Vitesse élevée
                  riskScore -= 10;
                  analysisLog.push({ 
                    step: "Analyse de vélocité géographique", 
                    result: `Déplacement rapide (${Math.round(speedKmh)} km/h sur ${Math.round(distanceKm)} km) - ${lastGeo.city || 'Unknown'} → ${currentGeo.city || 'Unknown'}`, 
                    impact: "-10", 
                    timestamp: Date.now() - startTime 
                  });
                } else {
                  analysisLog.push({ 
                    step: "Analyse de vélocité géographique", 
                    result: `Déplacement plausible (${Math.round(speedKmh)} km/h sur ${Math.round(distanceKm)} km) - ${lastGeo.city || 'Unknown'} → ${currentGeo.city || 'Unknown'}`, 
                    impact: "+0", 
                    timestamp: Date.now() - startTime 
                  });
                }
              } else if (distanceKm <= 1) {
                analysisLog.push({ 
                  step: "Analyse de vélocité géographique", 
                  result: `Même localisation (${Math.round(distanceKm * 1000)} mètres) - ${currentGeo.city || 'Unknown'}`, 
                  impact: "+0", 
                  timestamp: Date.now() - startTime 
                });
              }
            } else {
              analysisLog.push({ 
                step: "Analyse de vélocité géographique", 
                result: `Données de géolocalisation incomplètes (current: ${currentGeo.latitude ? 'OK' : 'MISSING'}, last: ${lastGeo.latitude ? 'OK' : 'MISSING'})`, 
                impact: "+0", 
                timestamp: Date.now() - startTime 
              });
            }
          } catch (geoError) {
            console.error("Geolocation API error:", geoError);
            analysisLog.push({ 
              step: "Analyse de vélocité géographique", 
              result: `Erreur lors de la récupération des données de géolocalisation: ${geoError.message}`, 
              impact: "+0", 
              timestamp: Date.now() - startTime 
            });
          }
        } else if (lastTransaction.ip_address === ipAddress && timeDiffMinutes <= 5) {
          analysisLog.push({ 
            step: "Analyse de vélocité", 
            result: "Même IP, intervalle court - pas de vérification géographique", 
            impact: "+0", 
            timestamp: Date.now() - startTime 
          });
        }
      } catch (e) { 
        console.error("Velocity check failed:", e.message);
        analysisLog.push({ 
          step: "Analyse de vélocité", 
          result: `Erreur: ${e.message}`, 
          impact: "+0", 
          timestamp: Date.now() - startTime 
        });
      }
    } else {
      analysisLog.push({ step: "Analyse de vélocité", result: "Première transaction ou pas d'IP", impact: "+0", timestamp: Date.now() - startTime });
    }

    const decision = riskScore < 40 ? 'BLOCK' : 'APPROVE';
    analysisLog.push({ step: "Décision finale", result: `Score de confiance: ${riskScore}`, impact: "+0", timestamp: Date.now() - startTime });

    const { data: assessmentRecord, error: assessmentError } = await supabaseAdmin.from('transaction_risk_assessments').insert({
      profile_id: profile.id,
      risk_score: riskScore,
      decision: decision,
      signals: { ...fraud_signals, ipAddress, analysis_log: analysisLog, amount: amountToCharge, merchant_name: checkout.name },
    }).select('id').single();
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

    // Mettre à jour l'enregistrement de l'analyse de risque avec l'ID de transaction
    if (assessmentRecord) {
      await supabaseAdmin.from('transaction_risk_assessments')
        .update({ transaction_id: transactionResult.transaction_id })
        .eq('id', assessmentRecord.id);
    }

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