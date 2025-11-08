// @ts-nocheck
import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  console.log("--- Invocation de submit-public-onboarding ---");

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { formId, profileData } = await req.json();
    console.log("Données reçues:", { formId, profileData });

    if (!formId || !profileData) {
      throw new Error("ID de formulaire et données de profil requis.");
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 1. Valider le formulaire
    console.log(`Validation du formulaire ID: ${formId}`);
    const { data: form, error: formError } = await supabaseAdmin
      .from('onboarding_forms')
      .select('institution_id, is_active')
      .eq('id', formId)
      .single();

    if (formError) throw formError;
    if (!form) throw new Error("Ce formulaire n'est pas valide.");
    if (!form.is_active) throw new Error("Ce formulaire n'est plus actif.");
    console.log("Formulaire validé. Institution ID:", form.institution_id);

    // 2. Créer le profil
    const profileToInsert = {
      institution_id: form.institution_id,
      type: 'personal',
      full_name: `${profileData.firstName} ${profileData.lastName}`,
      email: profileData.email,
      phone: profileData.phone,
      dob: profileData.dob,
      address: profileData.address,
      sin: profileData.sin || null,
      status: 'pending',
    };
    console.log("Préparation de l'insertion du profil:", profileToInsert);

    const { data: newProfile, error: insertProfileError } = await supabaseAdmin
      .from('profiles')
      .insert(profileToInsert)
      .select('id')
      .single();

    if (insertProfileError) {
      if (insertProfileError.code === '23505') throw new Error("Un profil avec cet e-mail existe déjà.");
      throw insertProfileError;
    }
    console.log("Profil créé avec succès. ID:", newProfile.id);

    // 3. Créer l'enregistrement de la candidature
    const annualIncomeValue = profileData.annualIncome && !isNaN(parseFloat(profileData.annualIncome)) ? parseFloat(profileData.annualIncome) : null;
    const t4IncomeValue = profileData.hasT4 && profileData.t4Income && !isNaN(parseFloat(profileData.t4Income)) ? parseFloat(profileData.t4Income) : null;
    console.log("Revenus parsés:", { annualIncomeValue, t4IncomeValue });

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
    console.log("Préparation de l'insertion de la candidature:", applicationToInsert);

    const { error: insertApplicationError } = await supabaseAdmin
      .from('onboarding_applications')
      .insert(applicationToInsert);
    
    if (insertApplicationError) throw insertApplicationError;
    console.log("Candidature créée avec succès.");

    return new Response(JSON.stringify({ message: "Candidature soumise avec succès." }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error("--- ERREUR DANS LA FONCTION ---");
    console.error("Message:", error.message);
    console.error("Stack:", error.stack);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});