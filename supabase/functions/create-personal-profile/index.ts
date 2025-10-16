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

    const recordToInsert = {
      institution_id: institution.id,
      type: 'personal',
      full_name: profileData.fullName,
      phone: profileData.phone,
      email: profileData.email,
      dob: profileData.dob,
      address: profileData.address,
      pin: profileData.pin,
      sin: profileData.sin,
    };

    const { error: insertError } = await supabaseAdmin.from('profiles').insert(recordToInsert);
    if (insertError) throw insertError;

    // Handle credit report creation if consent is given
    if (profileData.consent && profileData.sin) {
      const { data: existingReport, error: reportError } = await supabaseAdmin
        .from('credit_reports')
        .select('id')
        .eq('ssn', profileData.sin)
        .single();

      // If no report exists (error code for "No rows found"), create one.
      if (reportError && reportError.code === 'PGRST116') {
        const { error: createReportError } = await supabaseAdmin.from('credit_reports').insert({
          full_name: profileData.fullName,
          ssn: profileData.sin,
          address: profileData.address,
          phone_number: profileData.phone,
          email: profileData.email,
          credit_history: [],
        });
        if (createReportError) {
          // Log this error but don't fail the whole request, as profile creation was successful
          console.error("Failed to create credit report:", createReportError.message);
        }
      }
    }

    return new Response(JSON.stringify({ message: "Profil créé avec succès" }), {
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