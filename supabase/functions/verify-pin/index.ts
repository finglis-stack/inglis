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
    const authHeader = req.headers.get('Authorization')!
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    if (userError) throw userError

    const { profile_id, pin_to_verify } = await req.json()
    if (!profile_id || !pin_to_verify) {
      throw new Error("Paramètres manquants.");
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { data: institution } = await supabaseAdmin.from('institutions').select('id').eq('user_id', user.id).single()
    if (!institution) throw new Error("Institution non trouvée.");

    const { data: profile, error: profileError } = await supabaseAdmin.from('profiles').select('id, pin').eq('id', profile_id).eq('institution_id', institution.id).single()
    if (profileError || !profile) throw new Error('Accès refusé.');

    if (!profile.pin) {
      return new Response(JSON.stringify({ isValid: false, error: "Aucun NIP défini." }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    // Comparaison du NIP avec le hash stocké (fonctionne quelque soit le cost factor utilisé lors de la création)
    const isValid = bcrypt.compareSync(pin_to_verify, profile.pin);

    return new Response(JSON.stringify({ isValid }), {
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