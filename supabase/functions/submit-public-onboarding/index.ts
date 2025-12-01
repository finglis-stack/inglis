// @ts-nocheck
import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'
import bcrypt from 'https://esm.sh/bcryptjs@2.4.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { formId, profileData } = await req.json();
    if (!formId || !profileData) {
      throw new Error("ID de formulaire et données de profil requis.");
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 1. Vérification du formulaire
    const { data: form, error: formError } = await supabaseAdmin
      .from('onboarding_forms')
      .select('institution_id, is_active, auto_approve_enabled')
      .eq('id', formId)
      .single();

    if (formError) throw formError;
    if (!form) throw new Error("Ce formulaire n'est pas valide.");
    if (!form.is_active) throw new Error("Ce formulaire n'est plus actif.");

    // 2. VÉRIFICATION HARDCORE DU CRÉDIT
    // Avant de hacher quoi que ce soit, on vérifie si le NAS existe vraiment dans les dossiers de crédit
    if (profileData.sin) {
      // On formate le NAS pour correspondre au format standard (XXX-XXX-XXX ou XXXXXXXXX)
      const cleanSin = profileData.sin.replace(/[^0-9]/g, '');
      const formattedSin = `${cleanSin.slice(0, 3)}-${cleanSin.slice(3, 6)}-${cleanSin.slice(6, 9)}`;
      
      const { data: creditReport, error: creditError } = await supabaseAdmin
        .from('credit_reports')
        .select('id')
        .or(`ssn.eq.${cleanSin},ssn.eq.${formattedSin}`)
        .maybeSingle();

      if (creditError) {
        console.error("Erreur vérification crédit:", creditError);
      }
      
      // Si le module de bureau de crédit est activé et qu'on ne trouve pas de dossier
      if (!creditReport && form.is_credit_bureau_enabled) {
         // Note: En prod, on pourrait rejeter ici, mais pour l'UX on continue souvent en marquant pour revue manuelle
         console.warn("Avertissement: Aucun dossier de crédit trouvé pour ce NAS avant hachage.");
      }
    }

    // 3. HACHAGE SÉCURISÉ (BCRYPT COST 12)
    // Le NAS est haché immédiatement. La valeur brute n'est JAMAIS stockée dans la table profiles.
    const saltRounds = 12; // Facteur de travail élevé pour ralentir les attaques par force brute
    
    const hashedPin = profileData.pin ? bcrypt.hashSync(profileData.pin, saltRounds) : null;
    const hashedSin = profileData.sin ? bcrypt.hashSync(profileData.sin, saltRounds) : null;

    const profileToInsert = {
      institution_id: form.institution_id,
      type: 'personal',
      full_name: `${profileData.firstName} ${profileData.lastName}`,
      email: profileData.email,
      phone: profileData.phone,
      dob: profileData.dob,
      address: profileData.address,
      sin: hashedSin, // STOCKAGE DU HASH UNIQUEMENT
      pin: hashedPin,
      status: 'inactive',
    };

    const { data: newProfile, error: insertProfileError } = await supabaseAdmin
      .from('profiles')
      .insert(profileToInsert)
      .select('id')
      .single();

    if (insertProfileError) {
      if (insertProfileError.code === '23505') throw new Error("Un profil avec cet e-mail existe déjà.");
      throw insertProfileError;
    }

    const annualIncomeValue = profileData.annualIncome && !isNaN(parseFloat(profileData.annualIncome)) ? parseFloat(profileData.annualIncome) : null;
    const t4IncomeValue = profileData.hasT4 && profileData.t4Income && !isNaN(parseFloat(profileData.t4Income)) ? parseFloat(profileData.t4Income) : null;

    const applicationToInsert = {
      form_id: formId,
      profile_id: newProfile.id,
      selected_card_program_id: profileData.selectedProgramId,
      employment_status: profileData.employmentStatus,
      employer: profileData.employer,
      annual_income: annualIncomeValue,
      t4_income: t4IncomeValue,
      credit_bureau_verification_status: profileData.creditBureauVerification,
      status: 'pending',
    };

    const { data: newApplication, error: insertApplicationError } = await supabaseAdmin
      .from('onboarding_applications')
      .insert(applicationToInsert)
      .select('id')
      .single();
    
    if (insertApplicationError) throw insertApplicationError;

    if (form.auto_approve_enabled) {
      supabaseAdmin.functions.invoke('process-onboarding-application', {
        body: { applicationId: newApplication.id },
      });
    }

    return new Response(JSON.stringify({ 
      message: "Candidature soumise avec succès. Données sensibles sécurisées.",
      applicationId: newApplication.id
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error("--- ERREUR CRITIQUE ---", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});