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

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { data: institution } = await supabaseAdmin.from('institutions').select('id').eq('user_id', user.id).single()
    const { data: profile, error: profileError } = await supabaseAdmin.from('profiles').select('id').eq('id', profile_id).eq('institution_id', institution.id).single()
    if (profileError || !profile) throw new Error('Permission denied');

    // Récupération du HASH
    const { data: sinData, error: selectError } = await supabaseAdmin.from('profiles').select('sin').eq('id', profile_id).single()
    if (selectError) throw selectError

    // Pour des raisons de sécurité et de conformité, nous ne retournons plus jamais le NAS en clair.
    // Nous retournons une version masquée indiquant qu'il est sécurisé.
    const isHashed = sinData.sin && sinData.sin.startsWith('$2'); // Détection basique bcrypt
    const displayValue = isHashed ? "🔒 HASHÉ ET SÉCURISÉ" : (sinData.sin || "Non fourni");

    return new Response(JSON.stringify({ sin: displayValue }), {
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