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
    const { token } = await req.json();
    if (!token) throw new Error("Jeton manquant.");

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, sin, institution_id, credit_report_pull_token_expires_at, institutions(name)')
      .eq('credit_report_pull_token', token)
      .single();

    if (profileError || !profile) throw new Error("Jeton invalide ou expiré.");
    if (new Date(profile.credit_report_pull_token_expires_at) < new Date()) {
      throw new Error("Jeton expiré.");
    }
    if (!profile.sin) {
      throw new Error("Aucun NAS n'est associé à ce profil pour la consultation.");
    }

    const { data: report, error: reportError } = await supabaseAdmin
      .from('credit_reports')
      .select('*')
      .eq('ssn', profile.sin)
      .single();
    
    if (reportError) {
      throw new Error("Dossier de crédit non trouvé pour ce profil.");
    }

    const createdAt = new Date();
    const expiresAt = new Date(createdAt.getTime() + 4 * 24 * 60 * 60 * 1000);

    const { error: insertError } = await supabaseAdmin
      .from('pulled_credit_reports')
      .insert({
        profile_id: profile.id,
        institution_id: profile.institution_id,
        report_data: report,
        created_at: createdAt.toISOString(),
        expires_at: expiresAt.toISOString(),
      });
    if (insertError) throw insertError;

    const { error: updateProfileError } = await supabaseAdmin
      .from('profiles')
      .update({
        credit_report_pull_token: null,
        credit_report_pull_token_expires_at: null,
      })
      .eq('id', profile.id);
    if (updateProfileError) throw updateProfileError;

    return new Response(JSON.stringify({ 
      message: "Consentement confirmé. Le dossier de crédit est maintenant disponible pour votre institution.",
      institutionName: profile.institutions.name,
      viewingWindow: {
        start: createdAt.toISOString(),
        end: expiresAt.toISOString(),
        durationDays: 4
      }
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