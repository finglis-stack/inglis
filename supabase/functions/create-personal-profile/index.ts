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

    const profileData = await req.json()

    // Utiliser le client admin pour les opérations en base de données
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Récupérer l'ID de l'institution de l'utilisateur
    const { data: institution, error: institutionError } = await supabaseAdmin
      .from('institutions')
      .select('id')
      .eq('user_id', user.id)
      .single()
    if (institutionError) throw institutionError;

    // Préparer l'enregistrement à insérer. Le NAS est envoyé en clair.
    // La base de données le chiffrera automatiquement grâce au chiffrement transparent.
    const recordToInsert = {
      institution_id: institution.id,
      type: 'personal',
      full_name: profileData.full_name,
      address: profileData.address,
      phone: profileData.phone,
      email: profileData.email,
      dob: profileData.dob,
      pin: profileData.pin,
      sin: profileData.sin,
    };

    // Insérer directement dans la table
    const { error: insertError } = await supabaseAdmin.from('profiles').insert(recordToInsert)
    if (insertError) throw insertError

    return new Response(JSON.stringify({ message: "Profile created successfully" }), {
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