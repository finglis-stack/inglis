// @ts-nocheck
import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

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

    // 1. Valider le formulaire
    const { data: form, error: formError } = await supabaseAdmin
      .from('onboarding_forms')
      .select('institution_id, is_active')
      .eq('id', formId)
      .single();

    if (formError || !form) throw new Error("Ce formulaire n'est pas valide.");
    if (!form.is_active) throw new Error("Ce formulaire n'est plus actif.");

    // 2. Préparer les données du profil
    const recordToInsert = {
      institution_id: form.institution_id,
      type: 'personal',
      full_name: profileData.fullName,
      email: profileData.email,
      phone: profileData.phone,
      dob: profileData.dob,
      status: 'pending', // Le profil est en attente de validation par l'institution
    };

    // 3. Insérer le nouveau profil
    const { error: insertError } = await supabaseAdmin.from('profiles').insert(recordToInsert);
    if (insertError) {
      if (insertError.code === '23505') { // unique_violation
        throw new Error("Un profil avec cet e-mail existe déjà.");
      }
      throw insertError;
    }

    return new Response(JSON.stringify({ message: "Profil créé avec succès." }), {
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