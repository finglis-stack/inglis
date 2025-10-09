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
    const { token, pin } = await req.json()
    if (!token || !pin) throw new Error("Le jeton et le NIP sont requis.");
    if (pin.length !== 4 || !/^\d{4}$/.test(pin)) throw new Error("Le NIP doit être composé de 4 chiffres.");

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { error: rpcError } = await supabaseAdmin.rpc('update_profile_pin', {
      token_to_find: token,
      new_pin: pin
    });

    if (rpcError) throw rpcError;

    return new Response(JSON.stringify({ message: "NIP du profil mis à jour avec succès." }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})