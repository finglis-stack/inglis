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

  try {
    const { checkoutId, card_token, amount, fraud_signals } = await req.json();
    const ipAddress = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? null;
    
    const startTime = Date.now();
    const analysisLog = [];
    let riskScore = 100; // Score de confiance, commence à 100

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
      .from('cards')
      .select('id, status, pin, expires_at, profile_id, profiles(*, debit_accounts(id, currency), credit_accounts(id, currency))')
      .eq('id', cardId)
      .single();
    
    if (cardError || !cardData) throw new Error('Payment declined by issuer.');
    if (cardData.status !== 'active') {
      analysisLog.push({ step: "Validation de la carte", result: `Carte ${cardData.id} statut: ${cardData.status}`, impact: "-100", timestamp: Date.now() - startTime });
      throw new Error('Cette carte est bloquée ou inactive. Paiement refusé.');
    }
    analysisLog.push({ step: "Validation de la carte", result: `Carte ${cardData.id} active`, impact: "+0", timestamp: Date.now() - startTime });

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

    // --- ADVANCED RISK ANALYSIS ---
    const profile = cardData.profiles;

    // Charger préférences anti-fraude par profil (avec valeurs sûres par défaut)
    const defaultCfg = {
      amount: { low_value_threshold: 25, high_value_threshold: 10000, absolute_max: 1000000, high_value_no_baseline_penalty: 30, below_mean_bonus: 5 },
      zscore: { mild: 1.5, high: 2.5, extreme: 3.5, weights: { mild: 20, high: 40, extreme: 80 } },
      geo: { impossible_speed_kmh: 900, very_fast_speed_kmh: 500, distance_min_km: 1 },
      velocity: { burst_window_minutes: 10, penalty_3: 20, penalty_5: 40 },
      decision: { block_threshold: 40 },
      device: { blocked_penalty: 100, trusted_bonus: 15, recognized_bonus: 10, new_device_penalty: 15, low_confidence_threshold: 0.5, low_confidence_penalty: 10 },
      behavioral: { bot_penalty: 60, no_mouse_penalty: 25, short_time_ms: 3000, short_time_penalty: 20, suspicious_pattern_weight: 5, pan_fast_ms: 1000, pan_fast_penalty: 15, paste_penalty: 20 },
      ip: { blocked_penalty: 100, vpn_proxy_tor_penalty: 30, block_on_vpn: false }
    };
    let cfg = defaultCfg;
    try {
      const { data: pref } = await supabaseAdmin
        .from('fraud_preferences')
        .select('settings')
        .eq('profile_id', profile.id)
        .maybeSingle();
      if (pref?.settings) {
        const s = pref.settings;
        cfg = {
          amount: { ...defaultCfg.amount, ...(s.amount || {}) },
          zscore: { ...defaultCfg.zscore, ...(s.zscore || {}), weights: { ...defaultCfg.zscore.weights, ...(s.zscore?.weights || {}) } },
          geo: { ...defaultCfg.geo, ...(s.geo || {}) },
          velocity: { ...defaultCfg.velocity, ...(s.velocity || {}) },
          decision: { ...defaultCfg.decision, ...(s.decision || {}) },
          device: { ...defaultCfg.device, ...(s.device || {}) },
          behavioral: { ...defaultCfg.behavioral, ...(s.behavioral || {}) },
          ip: { ...defaultCfg.ip, ...(s.ip || {}) }
        };
      }
    } catch (_) {}

    // 1. DEVICE FINGERPRINTING ANALYSIS
    if (fraud_signals?.device_fingerprint) {
      const deviceId = fraud_signals.device_fingerprint.visitorId;
      
      const { data: existingDevice } = await supabaseAdmin
        .from('device_fingerprints')
        .select('*')
        .eq('visitor_id', deviceId)
        .eq('profile_id', profile.id)
        .single();

      if (existingDevice) {
        await supabaseAdmin
          .from('device_fingerprints')
          .update({
            last_seen_at: new Date().toISOString(),
            times_used: existingDevice.times_used + 1,
            device_data: fraud_signals.device_fingerprint.components
          })
          .eq('id', existingDevice.id);

        if (existingDevice.is_blocked) {
          riskScore -= cfg.device.blocked_penalty;
          analysisLog.push({ step: "Analyse du dispositif", result: "Dispositif bloqué", impact: `-${cfg.device.blocked_penalty}`, timestamp: Date.now() - startTime });
        } else if (existingDevice.is_trusted) {
          riskScore += cfg.device.trusted_bonus;
          analysisLog.push({ step: "Analyse du dispositif", result: "Dispositif de confiance", impact: `+${cfg.device.trusted_bonus}`, timestamp: Date.now() - startTime });
        } else {
          riskScore += cfg.device.recognized_bonus;
          analysisLog.push({ step: "Analyse du dispositif", result: "Dispositif reconnu", impact: `+${cfg.device.recognized_bonus}`, timestamp: Date.now() - startTime });
        }
      } else {
        await supabaseAdmin
          .from('device_fingerprints')
          .insert({
            profile_id: profile.id,
            visitor_id: deviceId,
            confidence_score: fraud_signals.device_fingerprint.confidence,
            device_data: fraud_signals.device_fingerprint.components
          });

        riskScore -= cfg.device.new_device_penalty;
        analysisLog.push({ step: "Analyse du dispositif", result: "Nouveau dispositif jamais vu", impact: `-${cfg.device.new_device_penalty}`, timestamp: Date.now() - startTime });
      }

      if (fraud_signals.device_fingerprint.confidence < cfg.device.low_confidence_threshold) {
        riskScore -= cfg.device.low_confidence_penalty;
        analysisLog.push({ step: "Analyse du dispositif", result: `Confiance faible (${fraud_signals.device_fingerprint.confidence})`, impact: `-${cfg.device.low_confidence_penalty}`, timestamp: Date.now() - startTime });
      }

      await supabaseAdmin
        .from('fraud_network_edges')
        .upsert({
          source_type: 'device',
          source_id: deviceId,
          target_type: 'card',
          target_id: cardId,
          relationship_type: 'used_by',
          last_seen_at: new Date().toISOString()
        }, {
          onConflict: 'source_type,source_id,target_type,target_id,relationship_type',
          ignoreDuplicates: false
        });
    }

    // 2. BEHAVIORAL ANALYSIS
    if (fraud_signals?.behavioral_signals) {
      const behavioral = fraud_signals.behavioral_signals;
      
      await supabaseAdmin
        .from('behavioral_patterns')
        .insert({
          profile_id: profile.id,
          session_id: fraud_signals.device_fingerprint?.visitorId || 'unknown',
          mouse_velocity_avg: behavioral.mouseVelocity,
          mouse_acceleration_avg: behavioral.mouseAcceleration,
          scroll_velocity_avg: behavioral.scrollVelocity,
          typing_speed_avg: fraud_signals.pin_entry_duration_ms ? 4000 / fraud_signals.pin_entry_duration_ms : null,
          click_count: behavioral.clickEvents,
          keypress_count: behavioral.keypressEvents,
          time_on_page_ms: behavioral.totalTimeOnPage,
          idle_time_ms: behavioral.idleTime,
          is_bot_suspected: behavioral.isLikelyBot,
          suspicious_patterns: behavioral.suspiciousPatterns
        });
      
      if (behavioral.isLikelyBot) {
        riskScore -= cfg.behavioral.bot_penalty;
        analysisLog.push({ step: "Détection de bot", result: `Bot détecté: ${behavioral.suspiciousPatterns.join(', ')}`, impact: `-${cfg.behavioral.bot_penalty}`, timestamp: Date.now() - startTime });
      }
      
      if (behavioral.mouseMovements && behavioral.mouseMovements.length === 0 && behavioral.totalTimeOnPage > 5000) {
        riskScore -= cfg.behavioral.no_mouse_penalty;
        analysisLog.push({ step: "Analyse comportementale", result: "Aucun mouvement de souris", impact: `-${cfg.behavioral.no_mouse_penalty}`, timestamp: Date.now() - startTime });
      }
      
      if (behavioral.totalTimeOnPage < cfg.behavioral.short_time_ms) {
        riskScore -= cfg.behavioral.short_time_penalty;
        analysisLog.push({ step: "Analyse comportementale", result: `Temps court (${Math.round(behavioral.totalTimeOnPage / 1000)}s)`, impact: `-${cfg.behavioral.short_time_penalty}`, timestamp: Date.now() - startTime });
      }
      
      if (behavioral.suspiciousPatterns && behavioral.suspiciousPatterns.length > 0) {
        const penalty = behavioral.suspiciousPatterns.length * cfg.behavioral.suspicious_pattern_weight;
        riskScore -= penalty;
        analysisLog.push({ step: "Analyse comportementale", result: `Patterns suspects: ${behavioral.suspiciousPatterns.join(', ')}`, impact: `-${penalty}`, timestamp: Date.now() - startTime });
      }
    }

    // 3. TYPING PATTERN ANALYSIS
    if (fraud_signals?.pan_entry_duration_ms < cfg.behavioral.pan_fast_ms) {
      riskScore -= cfg.behavioral.pan_fast_penalty;
      analysisLog.push({ step: "Analyse de frappe", result: "Saisie du PAN très rapide", impact: `-${cfg.behavioral.pan_fast_penalty}`, timestamp: Date.now() - startTime });
    } else {
      analysisLog.push({ step: "Analyse de frappe", result: "Saisie du PAN normale", impact: "+0", timestamp: Date.now() - startTime });
    }

    if (fraud_signals?.paste_events > 0) {
      riskScore -= cfg.behavioral.paste_penalty;
      analysisLog.push({ step: "Analyse de frappe", result: "Utilisation du copier-coller", impact: `-${cfg.behavioral.paste_penalty}`, timestamp: Date.now() - startTime });
    } else {
      analysisLog.push({ step: "Analyse de frappe", result: "Aucun copier-coller détecté", impact: "+0", timestamp: Date.now() - startTime });
    }

    // 4. IP ADDRESS ANALYSIS & STORAGE
    if (ipAddress) {
      let ipGeoData = null;
      let isVpn = false;
      
      try {
        const { data: geoResponse, error: geoError } = await supabaseAdmin.functions.invoke('get-ip-geolocation', {
          body: { ipAddress }
        });
        
        if (geoError) {
          console.error('Geolocation edge function error:', geoError);
        } else if (geoResponse && geoResponse.status === 'success') {
          ipGeoData = {
            ip: geoResponse.query,
            city: geoResponse.city,
            region: geoResponse.regionName,
            country: geoResponse.country,
            country_code: geoResponse.countryCode,
            latitude: geoResponse.lat,
            longitude: geoResponse.lon,
            timezone: geoResponse.timezone,
            isp: geoResponse.isp,
            org: geoResponse.org,
            as: geoResponse.as,
            is_mobile: geoResponse.mobile,
            is_proxy: geoResponse.proxy,
            is_hosting: geoResponse.hosting,
            is_vpn: geoResponse.vpn,
            is_tor: geoResponse.tor
          };
          
          // Detect VPN/Proxy/Hosting/Tor
          isVpn = geoResponse.proxy || geoResponse.hosting || geoResponse.vpn || geoResponse.tor || (geoResponse.org && (
            geoResponse.org.toLowerCase().includes('vpn') || 
            geoResponse.org.toLowerCase().includes('proxy') || 
            geoResponse.org.toLowerCase().includes('hosting')
          ));
        }
      } catch (e) {
        console.error('IP geolocation failed:', e);
      }

      // Check if IP exists in database
      const { data: existingIp } = await supabaseAdmin
        .from('ip_addresses')
        .select('*')
        .eq('ip_address', ipAddress)
        .eq('profile_id', profile.id)
        .single();

      if (existingIp) {
        // Update existing IP
        await supabaseAdmin
          .from('ip_addresses')
          .update({
            last_seen_at: new Date().toISOString(),
            times_used: existingIp.times_used + 1,
            geolocation: ipGeoData,
            is_vpn: isVpn,
            is_proxy: ipGeoData?.is_proxy || false,
            is_tor: ipGeoData?.is_tor || false
          })
          .eq('id', existingIp.id);

        if (existingIp.is_blocked) {
          riskScore -= 100;
          analysisLog.push({ step: "Analyse de l'IP", result: "IP bloquée", impact: "-100", timestamp: Date.now() - startTime });
        }
      } else {
        // New IP - insert into database
        await supabaseAdmin
          .from('ip_addresses')
          .insert({
            ip_address: ipAddress,
            profile_id: profile.id,
            is_vpn: isVpn,
            is_proxy: ipGeoData?.is_proxy || false,
            is_tor: ipGeoData?.is_tor || false,
            country: ipGeoData?.country,
            city: ipGeoData?.city,
            organization: ipGeoData?.org,
            geolocation: ipGeoData
          });
      }

      // VPN/Proxy/Tor detection
      if (isVpn) {
        riskScore -= cfg.ip.vpn_proxy_tor_penalty;
        const suspectType = ipGeoData?.is_tor ? 'Tor' : ipGeoData?.is_vpn ? 'VPN' : ipGeoData?.is_proxy ? 'Proxy' : 'Hosting';
        analysisLog.push({ step: "Détection VPN/Proxy/Tor", result: `${suspectType} détecté: ${ipGeoData?.org || 'Unknown'}`, impact: `-${cfg.ip.vpn_proxy_tor_penalty}`, timestamp: Date.now() - startTime });
        if (cfg.ip.block_on_vpn) {
          riskScore -= 100;
          analysisLog.push({ step: "Blocage strict", result: "Blocage configuré si VPN/Proxy/Tor", impact: "-100", timestamp: Date.now() - startTime });
        }
      } else {
        analysisLog.push({ step: "Détection VPN/Proxy", result: "IP résidentielle normale", impact: "+0", timestamp: Date.now() - startTime });
      }

      // Store IP-card relationship in fraud network
      await supabaseAdmin
        .from('fraud_network_edges')
        .upsert({
          source_type: 'ip',
          source_id: ipAddress,
          target_type: 'card',
          target_id: cardId,
          relationship_type: 'used_by',
          last_seen_at: new Date().toISOString()
        }, {
          onConflict: 'source_type,source_id,target_type,target_id,relationship_type',
          ignoreDuplicates: false
        });

      // Store device-IP relationship
      if (fraud_signals?.device_fingerprint) {
        await supabaseAdmin
          .from('fraud_network_edges')
          .upsert({
            source_type: 'device',
            source_id: fraud_signals.device_fingerprint.visitorId,
            target_type: 'ip',
            target_id: ipAddress,
            relationship_type: 'connected_to',
            last_seen_at: new Date().toISOString()
          }, {
            onConflict: 'source_type,source_id,target_type,target_id,relationship_type',
            ignoreDuplicates: false
          });
      }
    }

    // 5. AMOUNT ANALYSIS
    if (amountToCharge >= cfg.amount.absolute_max) {
      riskScore -= 100;
      analysisLog.push({ step: "Analyse du montant", result: `Montant excessif (${new Intl.NumberFormat('fr-CA', { style: 'currency', currency: cardCurrency }).format(amountToCharge)})`, impact: "-100", timestamp: Date.now() - startTime });
    } else if (amountToCharge <= cfg.amount.low_value_threshold) {
      riskScore += cfg.amount.below_mean_bonus;
      analysisLog.push({ step: "Analyse du montant", result: "Transaction de faible valeur, tolérée", impact: `+${cfg.amount.below_mean_bonus}`, timestamp: Date.now() - startTime });
    } else if (profile.avg_transaction_amount > 0 && profile.transaction_amount_stddev > 0) {
      if (amountToCharge > profile.avg_transaction_amount) {
        const z_score = (amountToCharge - profile.avg_transaction_amount) / profile.transaction_amount_stddev;
        if (z_score > cfg.zscore.extreme) {
          riskScore -= cfg.zscore.weights.extreme;
          analysisLog.push({ step: "Analyse du montant", result: `Montant extrême vs baseline (Z-score: ${z_score.toFixed(2)})`, impact: `-${cfg.zscore.weights.extreme}`, timestamp: Date.now() - startTime });
        } else if (z_score > cfg.zscore.high) {
          riskScore -= cfg.zscore.weights.high;
          analysisLog.push({ step: "Analyse du montant", result: `Montant très élevé vs moyenne (Z-score: ${z_score.toFixed(2)})`, impact: `-${cfg.zscore.weights.high}`, timestamp: Date.now() - startTime });
        } else if (z_score > cfg.zscore.mild) {
          riskScore -= cfg.zscore.weights.mild;
          analysisLog.push({ step: "Analyse du montant", result: `Montant plus élevé que la normale (Z-score: ${z_score.toFixed(2)})`, impact: `-${cfg.zscore.weights.mild}`, timestamp: Date.now() - startTime });
        } else {
          analysisLog.push({ step: "Analyse du montant", result: "Montant dans la plage normale supérieure", impact: "+0", timestamp: Date.now() - startTime });
        }
      } else {
        riskScore += cfg.amount.below_mean_bonus;
        analysisLog.push({ step: "Analyse du montant", result: "Montant inférieur à la moyenne, non suspect", impact: `+${cfg.amount.below_mean_bonus}`, timestamp: Date.now() - startTime });
      }
    } else {
      if (amountToCharge > cfg.amount.high_value_threshold) {
        riskScore -= cfg.amount.high_value_no_baseline_penalty;
        analysisLog.push({ step: "Analyse du montant", result: `Montant élevé sans baseline`, impact: `-${cfg.amount.high_value_no_baseline_penalty}`, timestamp: Date.now() - startTime });
      } else {
        analysisLog.push({ step: "Analyse du montant", result: "Pas d'historique pour l'analyse du montant", impact: "+0", timestamp: Date.now() - startTime });
      }
    }

    // 6. VELOCITY CHECKS
    const debitAccountIds = profile.debit_accounts.map(a => a.id);
    const creditAccountIds = profile.credit_accounts.map(a => a.id);

    const orConditions = [];
    if (debitAccountIds.length > 0) orConditions.push(`debit_account_id.in.(${debitAccountIds.join(',')})`);
    if (creditAccountIds.length > 0) orConditions.push(`credit_account_id.in.(${creditAccountIds.join(',')})`);

    if (orConditions.length > 0) {
      // Fenêtre courte (10 min) pour les rafales
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
      const { data: recentTransactions, error: velocityError } = await supabaseAdmin
        .from('transactions')
        .select('id, created_at, ip_address')
        .or(orConditions.join(','))
        .gte('created_at', tenMinutesAgo)
        .order('created_at', { ascending: false });

      if (!velocityError && recentTransactions && recentTransactions.length > 0) {
        const transactionCount = recentTransactions.length;
        
        if (transactionCount >= 5) {
          riskScore -= cfg.velocity.penalty_5;
          analysisLog.push({ step: "Vélocité par carte", result: `${transactionCount} transactions en ${cfg.velocity.burst_window_minutes} minutes`, impact: `-${cfg.velocity.penalty_5}`, timestamp: Date.now() - startTime });
        } else if (transactionCount >= 3) {
          riskScore -= cfg.velocity.penalty_3;
          analysisLog.push({ step: "Vélocité par carte", result: `${transactionCount} transactions en ${cfg.velocity.burst_window_minutes} minutes`, impact: `-${cfg.velocity.penalty_3}`, timestamp: Date.now() - startTime });
        } else {
          analysisLog.push({ step: "Vélocité par carte", result: `${transactionCount} transaction(s) en ${cfg.velocity.burst_window_minutes} minutes - normal`, impact: "+0", timestamp: Date.now() - startTime });
        }
      }

      // Comparaison Haversine avec la DERNIÈRE transaction connue (hors fenêtre courte)
      let lastTransactionGlobal = null;
      try {
        const { data: lastGlobal } = await supabaseAdmin
          .from('transactions')
          .select('id, created_at, ip_address')
          .or(orConditions.join(','))
          .order('created_at', { ascending: false })
          .limit(1)
          .single();
        lastTransactionGlobal = lastGlobal;
      } catch (_) {}

      if (lastTransactionGlobal && ipAddress) {
        try {
          const timeDiffMinutes = (new Date().getTime() - new Date(lastTransactionGlobal.created_at).getTime()) / (1000 * 60);

          if (lastTransactionGlobal.ip_address) {
            const [currentGeoResult, lastGeoResult] = await Promise.all([
              supabaseAdmin.functions.invoke('get-ip-geolocation', { body: { ipAddress } }),
              supabaseAdmin.functions.invoke('get-ip-geolocation', { body: { ipAddress: lastTransactionGlobal.ip_address } })
            ]);
            
            const currentGeo = currentGeoResult.data;
            const lastGeo = lastGeoResult.data;

            if (currentGeo?.status !== 'success' || lastGeo?.status !== 'success') {
              analysisLog.push({
                step: "Vélocité géographique",
                result: `Erreur géolocalisation: ${currentGeo?.message || lastGeo?.message || 'Unknown'}`,
                impact: "+0",
                timestamp: Date.now() - startTime
              });
            } else if (currentGeo.lat && lastGeo.lat) {
              const distanceKm = haversineDistance(
                { lat: currentGeo.lat, lon: currentGeo.lon },
                { lat: lastGeo.lat, lon: lastGeo.lon }
              );
              
              const timeDiffHours = Math.max(timeDiffMinutes / 60, 0.0001);
              if (distanceKm > 1) {
                const speedKmh = distanceKm / timeDiffHours;

                if (speedKmh > cfg.geo.impossible_speed_kmh) {
                  riskScore -= 50;
                  analysisLog.push({
                    step: "Vélocité géographique",
                    result: `Déplacement impossible (${Math.round(speedKmh)} km/h, ${Math.round(distanceKm)} km en ${Math.round(timeDiffMinutes)} min)`,
                    impact: "-50",
                    timestamp: Date.now() - startTime
                  });
                } else if (speedKmh > cfg.geo.very_fast_speed_kmh) {
                  riskScore -= 25;
                  analysisLog.push({
                    step: "Vélocité géographique",
                    result: `Déplacement très rapide (${Math.round(speedKmh)} km/h, ${Math.round(distanceKm)} km)`,
                    impact: "-25",
                    timestamp: Date.now() - startTime
                  });
                }
              }
            }
          }
        } catch (e) {
          console.error("Global velocity check failed:", e.message);
        }
      }
    }

    const decision = riskScore < cfg.decision.block_threshold ? 'BLOCK' : 'APPROVE';
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
    // Return the actual error message in the JSON body
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400,
    });
  }
})