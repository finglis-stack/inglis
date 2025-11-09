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
    const { domain } = await req.json();
    if (!domain) throw new Error("Le nom de domaine est requis.");

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) throw new Error("Authentification requise.");

    const supabaseAdmin = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
    const { data: institution } = await supabaseAdmin.from('institutions').select('id').eq('user_id', user.id).single();
    if (!institution) throw new Error("Institution non trouvée.");

    const VERCEL_API_TOKEN = Deno.env.get('VERCEL_API_TOKEN');
    const VERCEL_TEAM_ID = Deno.env.get('VERCEL_TEAM_ID');
    const VERCEL_PROJECT_NAME = Deno.env.get('VERCEL_PROJECT_NAME');

    if (!VERCEL_API_TOKEN || !VERCEL_PROJECT_NAME) {
      throw new Error("La configuration Vercel est incomplète côté serveur.");
    }

    const vercelApiUrl = `https://api.vercel.com/v9/projects/${VERCEL_PROJECT_NAME}/domains${VERCEL_TEAM_ID ? `?teamId=${VERCEL_TEAM_ID}` : ''}`;

    const vercelResponse = await fetch(vercelApiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${VERCEL_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: domain }),
    });

    const vercelData = await vercelResponse.json();
    if (!vercelResponse.ok) {
      throw new Error(vercelData.error?.message || 'Erreur lors de l\'ajout du domaine à Vercel.');
    }

    const { error: dbError } = await supabaseAdmin.from('custom_domains').insert({
      institution_id: institution.id,
      domain_name: domain,
      status: 'pending',
      verification_data: vercelData.verification,
    });
    if (dbError) throw dbError;

    return new Response(JSON.stringify(vercelData), {
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