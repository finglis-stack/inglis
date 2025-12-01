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
    const profileData = await req.json();
    if (!profileData) throw new Error("Données de profil manquantes.");

    const authHeader = req.headers.get('Authorization')!;
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );
    
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError) throw userError;

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: institution, error: institutionError } = await supabaseAdmin
      .from('institutions')
      .select('id')
      .eq('user_id', user.id)
      .single();
    if (institutionError) throw institutionError;

    // HACHAGE HARDCORE COST 12
    const saltRounds = 12;
    const hashedPin = profileData.pin ? bcrypt.hashSync(profileData.pin, saltRounds) : null;
    const hashedSin = profileData.sin ? bcrypt.hashSync(profileData.sin, saltRounds) : null;

    const recordToInsert = {
      institution_id: institution.id,
      type: 'personal',
      full_name: profileData.fullName,
      phone: profileData.phone,
      email: profileData.email,
      dob: profileData.dob,
      address: profileData.address,
      pin: hashedPin,
      sin: hashedSin, // On stocke le HASH, jamais le clair
    };

    const { error: insertError } = await supabaseAdmin.from('profiles').insert(recordToInsert);
    if (insertError) throw insertError;

    // Pour le rapport de crédit, on utilise le NAS en clair TEMPORAIREMENT pour la recherche, 
    // mais on ne le stocke pas dans la table profiles.
    if (profileData.consent && profileData.sin) {
      const { data: existingReport, error: reportError } = await supabaseAdmin
        .from('credit_reports')
        .select('id')
        .eq('ssn', profileData.sin) // Recherche exacte sur le bureau de crédit (simulé)
        .single();

      if (reportError && reportError.code === 'PGRST116') {
        // Création d'un nouveau rapport si inexistant (Simulateur)
        // Note: Dans un vrai bureau de crédit, on ne créerait pas de dossier, on interrogerait seulement.
        // Ici pour la démo, on stocke le NAS en clair UNIQUEMENT dans la table credit_reports qui est isolée
        const { error: createReportError } = await supabaseAdmin.from('credit_reports').insert({
          full_name: profileData.fullName,
          ssn: profileData.sin,
          address: profileData.address,
          phone_number: profileData.phone,
          email: profileData.email,
          credit_history: [],
        });
        if (createReportError) {
          console.error("Failed to create credit report:", createReportError.message);
        }
      }
    }

    return new Response(JSON.stringify({ message: "Profil sécurisé créé avec succès" }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});