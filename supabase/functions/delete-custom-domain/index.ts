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
    const { domainName } = await req.json();
    if (!domainName) throw new Error("Le nom de domaine est requis.");

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) throw new Error("Authentification requise.");

    const supabaseAdmin = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
    
    // Security check: ensure the domain belongs to the user's institution
    const { data: domainRecord, error: domainError } = await supabaseAdmin
      .from('custom_domains')
      .select('id, institutions(user_id)')
      .eq('domain_name', domainName)
      .single();

    if (domainError || !domainRecord || domainRecord.institutions.user_id !== user.id) {
      throw new Error("Domaine non trouvé ou accès non autorisé.");
    }

    const VERCEL_API_TOKEN = Deno.env.get('VERCEL_API_TOKEN');
    const VERCEL_TEAM_ID = Deno.env.get('VERCEL_TEAM_ID');
    const VERCEL_PROJECT_NAME = Deno.env.get('VERCEL_PROJECT_NAME');

    const vercelApiUrl = `https://api.vercel.com/v9/projects/${VERCEL_PROJECT_NAME}/domains/${domainName}${VERCEL_TEAM_ID ? `?teamId=${VERCEL_TEAM_ID}` : ''}`;

    await fetch(vercelApiUrl, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${VERCEL_API_TOKEN}` },
    });
    // We don't throw on Vercel error, to allow cleanup even if Vercel fails

    const { error: dbError } = await supabaseAdmin.from('custom_domains').delete().eq('id', domainRecord.id);
    if (dbError) throw dbError;

    return new Response(JSON.stringify({ message: "Domaine supprimé avec succès." }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
})