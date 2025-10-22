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
    const { profile_id, new_pin } = await req.json();
    if (!profile_id || !new_pin) throw new Error("Profile ID and new PIN are required.");
    if (new_pin.length !== 4 || !/^\d{4}$/.test(new_pin)) throw new Error("PIN must be 4 digits.");

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

    // Security check: ensure user's institution owns the profile
    const { data: institution } = await supabaseAdmin.from('institutions').select('id').eq('user_id', user.id).single();
    if (!institution) throw new Error("Institution not found for user.");

    const { data: profile, error: profileError } = await supabaseAdmin.from('profiles').select('id').eq('id', profile_id).eq('institution_id', institution.id).single();
    if (profileError || !profile) throw new Error("Profile not found or access denied.");

    // Hash the new PIN before updating
    const hashedPin = bcrypt.hashSync(new_pin, 10);

    // Update the profile with the new hashed PIN
    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({ pin: hashedPin })
      .eq('id', profile_id);
    if (updateError) throw updateError;

    return new Response(JSON.stringify({ message: "PIN updated successfully" }), {
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