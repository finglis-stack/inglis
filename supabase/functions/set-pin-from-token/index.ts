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

    // Find profile by token
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, pin_setup_token_expires_at')
      .eq('pin_setup_token', token)
      .single()

    if (profileError || !profile) throw new Error("Jeton invalide ou déjà utilisé.");

    // Check if token is expired
    const now = new Date();
    const expiresAt = new Date(profile.pin_setup_token_expires_at);
    if (now > expiresAt) {
      // Invalidate the expired token
      await supabaseAdmin
        .from('profiles')
        .update({ pin_setup_token: null, pin_setup_token_expires_at: null })
        .eq('id', profile.id);
      throw new Error("Le jeton a expiré.");
    }

    // Update PIN and invalidate token
    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({ 
        pin: pin,
        pin_setup_token: null,
        pin_setup_token_expires_at: null
      })
      .eq('id', profile.id)

    if (updateError) throw updateError;

    return new Response(JSON.stringify({ message: "NIP mis à jour avec succès." }), {
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