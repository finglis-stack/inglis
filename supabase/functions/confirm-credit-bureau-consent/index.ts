// @ts-nocheck
import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

async function pushDataToCreditBureau(supabaseAdmin, profile, institutionName) {
  console.log(`[CreditPush] Starting push for profile ${profile.id}`);

  if (!profile.sin) {
    console.error(`[CreditPush] Profile has no SIN. Aborting.`);
    return { success: false, error: "Aucun NAS associé au profil." };
  }

  // Vérification de compatibilité : Si le NAS ressemble à un hash Bcrypt (commence par $2), c'est un vieux profil incompatible.
  // Un hash SHA-256 est une chaîne hexadécimale de 64 caractères.
  if (profile.sin.startsWith('$2')) {
    console.error(`[CreditPush] Legacy Bcrypt SIN detected. Cannot match with Credit Bureau Index.`);
    return { success: false, error: "Format de données obsolète. Veuillez recréer le profil utilisateur." };
  }

  // 1. Récupérer les comptes
  const { data: creditAccounts, error: creditError } = await supabaseAdmin
    .from('credit_accounts')
    .select('*, cards(*, card_programs(program_name))')
    .eq('profile_id', profile.id)
    .neq('status', 'closed'); // On inclut active et inactive (suspendu)

  const { data: debitAccounts, error: debitError } = await supabaseAdmin
    .from('debit_accounts')
    .select('*, cards(*, card_programs(program_name))')
    .eq('profile_id', profile.id)
    .neq('status', 'closed');

  if (creditError || debitError) {
    console.error(`[CreditPush] DB Error fetching accounts:`, creditError || debitError);
    throw new Error("Erreur lors de la récupération des comptes.");
  }

  console.log(`[CreditPush] Found ${creditAccounts?.length || 0} credit accounts and ${debitAccounts?.length || 0} debit accounts.`);

  const newHistoryEntries = [];
  const currencyFormatter = new Intl.NumberFormat('fr-CA', { style: 'currency', currency: 'CAD' });
  const dateStr = new Date().toISOString().split('T')[0];

  // 2. Traitement des comptes de crédit
  if (creditAccounts) {
    for (const acc of creditAccounts) {
      const { data: balanceData } = await supabaseAdmin.rpc('get_credit_account_balance', { p_account_id: acc.id }).single();
      const current_balance = balanceData?.current_balance || 0;
      const debtRatio = acc.credit_limit > 0 ? (current_balance / acc.credit_limit) * 100 : 0;
      const programName = acc.cards?.card_programs?.program_name || 'Carte de Crédit';
      
      newHistoryEntries.push({
        date: dateStr,
        type: programName,
        details: `Émetteur: ${institutionName}, Solde: ${currencyFormatter.format(current_balance)}, Limite: ${currencyFormatter.format(acc.credit_limit)}, Ratio: ${debtRatio.toFixed(1)}%`,
        status: acc.status === 'active' ? 'Active' : 'Review'
      });
    }
  }

  // 3. Traitement des comptes de débit
  if (debitAccounts) {
    for (const acc of debitAccounts) {
      const { data: balanceData } = await supabaseAdmin.rpc('get_debit_account_balance', { p_account_id: acc.id }).single();
      const current_balance = balanceData?.current_balance || 0;
      const programName = acc.cards?.card_programs?.program_name || 'Carte de Débit';

      newHistoryEntries.push({
        date: dateStr,
        type: programName,
        details: `Émetteur: ${institutionName}, Solde: ${currencyFormatter.format(current_balance)}`,
        status: acc.status === 'active' ? 'Active' : 'Inactive'
      });
    }
  }

  if (newHistoryEntries.length === 0) {
    console.log(`[CreditPush] No active accounts found to report.`);
    // On continue quand même pour confirmer le consentement, même s'il n'y a rien à reporter
  }

  // 4. Mise à jour du dossier de crédit
  // On cherche le rapport existant via le SHA-256 (profile.sin)
  const { data: existingReport, error: fetchError } = await supabaseAdmin
    .from('credit_reports')
    .select('id, credit_history')
    .eq('ssn', profile.sin)
    .maybeSingle();

  if (fetchError) {
    console.error(`[CreditPush] Error fetching report:`, fetchError);
    throw fetchError;
  }

  let reportId = existingReport?.id;

  // Créer le dossier s’il n’existe pas, avec les informations disponibles
  if (!existingReport) {
    console.log(`[CreditPush] No report found; creating new credit report for SIN hash: ${profile.sin.substring(0, 10)}...`);

    const { data: created, error: createError } = await supabaseAdmin
      .from('credit_reports')
      .insert({
        full_name: profile.full_name || profile.legal_name || 'Client',
        ssn: profile.sin,
        address: profile.address || null, // conserve l’adresse chiffrée si présente
        phone_number: profile.phone || null,
        email: profile.email || null,
        credit_history: [],
        credit_score: 700 // valeur par défaut raisonnable; ajustée ensuite par le système
      })
      .select('id')
      .single();

    if (createError) {
      console.error(`[CreditPush] Failed to create credit report:`, createError);
      throw createError;
    }
    reportId = created.id;
  }

  // Fusionner l’historique: éviter les doublons pour cette institution aujourd’hui
  const previousHistory = existingReport?.credit_history || [];
  const filteredHistory = previousHistory.filter(entry =>
    !(entry.date === dateStr && entry.details.includes(`Émetteur: ${institutionName}`))
  );

  const updatedHistory = [...newHistoryEntries, ...filteredHistory];
  
  // Trier par date décroissante
  updatedHistory.sort((a, b) => new Date(b.date) - new Date(a.date));

  const { error: updateError } = await supabaseAdmin
    .from('credit_reports')
    .update({
      credit_history: updatedHistory,
      updated_at: new Date().toISOString(),
      // Petites mises à jour de cohérence si le dossier existait déjà
      full_name: profile.full_name || profile.legal_name || 'Client',
      email: profile.email || null,
      phone_number: profile.phone || null
    })
    .eq('id', reportId);

  if (updateError) {
    console.error(`[CreditPush] Update failed:`, updateError);
    throw updateError;
  }

  console.log(`[CreditPush] Successfully pushed ${newHistoryEntries.length} entries.`);
  return { success: true };

  // Fusionner l'historique : On enlève les anciennes entrées de CETTE institution pour ce jour pour éviter les doublons
  const previousHistory = existingReport.credit_history || [];
  const filteredHistory = previousHistory.filter(entry => 
    !(entry.date === dateStr && entry.details.includes(`Émetteur: ${institutionName}`))
  );

  const updatedHistory = [...newHistoryEntries, ...filteredHistory];
  
  // Trier par date décroissante
  updatedHistory.sort((a, b) => new Date(b.date) - new Date(a.date));

  const { error: updateError } = await supabaseAdmin
    .from('credit_reports')
    .update({ 
      credit_history: updatedHistory,
      updated_at: new Date().toISOString()
    })
    .eq('id', existingReport.id);

  if (updateError) {
    console.error(`[CreditPush] Update failed:`, updateError);
    throw updateError;
  }

  console.log(`[CreditPush] Successfully pushed ${newHistoryEntries.length} entries.`);
  return { success: true };
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

    // Exécuter le push
    const pushResult = await pushDataToCreditBureau(supabaseAdmin, profile, profile.institutions.name);

    if (!pushResult.success && pushResult.error) {
      throw new Error(pushResult.error);
    }

    // Marquer le consentement comme utilisé/validé
    const { error: updateProfileError } = await supabaseAdmin
      .from('profiles')
      .update({
        credit_bureau_auto_consent: autoConsent,
        credit_bureau_consent_token: null, // On invalide le token
        credit_bureau_consent_token_expires_at: null,
      })
      .eq('id', profile.id);

    if (updateProfileError) throw updateProfileError;

    return new Response(JSON.stringify({ 
      message: "Consentement confirmé et données transmises au bureau de crédit.",
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