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
);

const logProgress = async (applicationId, message, status = 'info') => {
  const logEntry = { timestamp: new Date().toISOString(), message, status };
  console.log(`[${applicationId}] [${status}] ${message}`);
  
  const { data: currentApp, error: fetchError } = await supabaseAdmin
    .from('onboarding_applications')
    .select('processing_log')
    .eq('id', applicationId)
    .single();

  if (fetchError) {
    console.error("Failed to fetch current logs:", fetchError.message);
    // Proceed with a new log array if fetching fails
  }

  const existingLogs = currentApp?.processing_log || [];
  const newLogs = [...existingLogs, logEntry];

  await supabaseAdmin
    .from('onboarding_applications')
    .update({ processing_log: newLogs })
    .eq('id', applicationId);
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const { applicationId } = await req.json();
  
  try {
    if (!applicationId) throw new Error("Application ID is required.");
    await logProgress(applicationId, "Début du traitement de la demande.", "info");

    // 1. Fetch all necessary data
    await logProgress(applicationId, "Récupération des données de la demande...", "info");
    const { data: application, error: appError } = await supabaseAdmin
      .from('onboarding_applications')
      .select('*, profiles(*), card_programs(*), onboarding_forms(*)')
      .eq('id', applicationId)
      .single();
    
    if (appError || !application) throw new Error("Demande non trouvée.");
    await logProgress(applicationId, "Données récupérées avec succès.", "success");

    const profile = application.profiles;
    const program = application.card_programs;
    const form = application.onboarding_forms;
    const reasons = [];
    let isApproved = true;

    // --- RULE ENGINE ---
    await logProgress(applicationId, "Démarrage du moteur de règles...", "info");

    // Rule 1: Credit Bureau Verification
    if (form.is_credit_bureau_enabled) {
      await logProgress(applicationId, `Vérification du statut du bureau de crédit: ${application.credit_bureau_verification_status}`, "info");
      if (application.credit_bureau_verification_status === 'failed') {
        isApproved = false;
        reasons.push("Échec de la vérification d'identité au bureau de crédit.");
        await logProgress(applicationId, "Règle échouée: Vérification de crédit négative.", "warning");
      }
    }

    // Rule 2: Minimum Income
    if (program.min_income_requirement && application.annual_income < program.min_income_requirement) {
      isApproved = false;
      reasons.push(`Revenu annuel (${application.annual_income}) inférieur au minimum requis (${program.min_income_requirement}).`);
      await logProgress(applicationId, "Règle échouée: Revenu insuffisant.", "warning");
    }

    // Rule 3: Minimum Credit Score
    if (isApproved && program.min_credit_score_requirement && profile.sin) {
      await logProgress(applicationId, "Vérification du score de crédit...", "info");
      const { data: report, error: reportError } = await supabaseAdmin.from('credit_reports').select('credit_score').eq('ssn', profile.sin).maybeSingle();
      if (reportError) {
        await logProgress(applicationId, `Avertissement: Impossible de récupérer le dossier de crédit: ${reportError.message}`, "warning");
      } else if (report && report.credit_score < program.min_credit_score_requirement) {
        isApproved = false;
        reasons.push(`Score de crédit (${report.credit_score}) inférieur au minimum requis (${program.min_credit_score_requirement}).`);
        await logProgress(applicationId, "Règle échouée: Score de crédit trop bas.", "warning");
      } else if (!report) {
        await logProgress(applicationId, "Aucun dossier de crédit trouvé, la vérification du score est ignorée.", "info");
      } else {
        await logProgress(applicationId, "Vérification du score de crédit réussie.", "success");
      }
    }

    // --- DECISION & ACTION ---
    await logProgress(applicationId, `Décision: ${isApproved ? 'Approuvée' : 'Rejetée'}`, "info");

    if (isApproved) {
      let approvedLimit = 0;
      if (program.card_type === 'credit') {
        if (form.credit_limit_type === 'fixed') {
          approvedLimit = form.fixed_credit_limit;
        } else {
          approvedLimit = application.annual_income * 0.10;
        }
        if (form.soft_credit_limit) approvedLimit = Math.min(approvedLimit, form.soft_credit_limit);
        if (program.max_credit_limit) approvedLimit = Math.min(approvedLimit, program.max_credit_limit);
        await logProgress(applicationId, `Limite de crédit calculée: ${approvedLimit}`, "info");
      }

      await logProgress(applicationId, "Création de la carte et du compte associé...", "info");
      const { error: createCardError } = await supabaseAdmin.functions.invoke('create-card', {
        body: {
          profile_id: profile.id,
          card_program_id: program.id,
          credit_limit: approvedLimit,
          cash_advance_limit: approvedLimit * 0.1,
          interest_rate: program.default_interest_rate || 19.99,
          cash_advance_rate: program.default_cash_advance_rate || 22.99,
        },
      });
      if (createCardError) throw createCardError;
      await logProgress(applicationId, "Carte créée avec succès.", "success");

      await logProgress(applicationId, "Mise à jour du statut de la demande à 'approved'.", "info");
      await supabaseAdmin.from('onboarding_applications').update({ status: 'approved', approved_credit_limit: approvedLimit }).eq('id', applicationId);
      
      await logProgress(applicationId, "Mise à jour du statut du profil à 'active'.", "info");
      await supabaseAdmin.from('profiles').update({ status: 'active' }).eq('id', profile.id);

    } else {
      await logProgress(applicationId, `Mise à jour du statut à 'rejected'. Raisons: ${reasons.join('; ')}`, "info");
      await supabaseAdmin.from('onboarding_applications').update({ status: 'rejected', rejection_reason: reasons.join('; ') }).eq('id', applicationId);
    }

    await logProgress(applicationId, "Traitement terminé.", "success");
    return new Response(JSON.stringify({ success: true, decision: isApproved ? 'approved' : 'rejected', reasons }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200,
    });

  } catch (error) {
    await logProgress(applicationId, `ERREUR: ${error.message}`, "error");
    await supabaseAdmin.from('onboarding_applications').update({ status: 'pending', rejection_reason: `Erreur de traitement: ${error.message}` }).eq('id', applicationId);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400,
    });
  }
});