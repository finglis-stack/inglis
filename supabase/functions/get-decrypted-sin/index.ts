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
    // Authentifier l'utilisateur
    const authHeader = req.headers.get('Authorization')!
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    if (userError) throw userError

    const { profile_id } = await req.json()

    // Utiliser le client admin
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Vérification de sécurité : l'utilisateur a-t-il le droit de voir ce profil ?
    const { data: institution } = await supabaseAdmin.from('institutions').select('id').eq('user_id', user.id).single()
    const { data: profile, error: profileError } = await supabaseAdmin.from('profiles').select('id').eq('id', profile_id).eq('institution_id', institution.id).single()
    if (profileError || !profile) throw new Error('Permission denied to access this profile');

    // Sélectionner le NAS.
    const { data: sinData, error: selectError } = await supabaseAdmin.from('profiles').select('sin').eq('id', profile_id).single()
    if (selectError) throw selectError

    return new Response(JSON.stringify({ sin: sinData.sin }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})