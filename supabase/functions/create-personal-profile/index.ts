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
    // 1. Récupérer les données du profil depuis la requête
    const profileData = await req.json()
    if (!profileData) throw new Error("Données de profil manquantes dans le corps de la requête.");

    // 2. Créer un client Supabase avec l'authentification de l'utilisateur
    const authHeader = req.headers.get('Authorization')!
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )
    
    // 3. Vérifier que l'utilisateur est bien authentifié
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    if (userError) throw userError

    // 4. Créer un client admin pour effectuer les opérations sécurisées en base de données
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 5. Récupérer l'ID de l'institution associée à l'utilisateur authentifié
    const { data: institution, error: institutionError } = await supabaseAdmin
      .from('institutions')
      .select('id')
      .eq('user_id', user.id)
      .single()
    if (institutionError) throw institutionError;

    // 6. Préparer les données pour l'insertion.
    // Les données sensibles (NIP, NAS, adresse) sont envoyées en texte brut.
    // Un déclencheur en base de données les chiffrera automatiquement et de manière sécurisée.
    const recordToInsert = {
      institution_id: institution.id,
      type: 'personal',
      full_name: profileData.full_name,
      phone: profileData.phone,
      email: profileData.email,
      dob: profileData.dob,
      // L'objet adresse est converti en chaîne JSON avant l'envoi.
      address: profileData.address ? JSON.stringify(profileData.address) : null,
      // Le NIP et le NAS sont envoyés tels quels.
      pin: profileData.pin,
      sin: profileData.sin,
    };

    // 7. Insérer le nouveau profil dans la base de données
    const { error: insertError } = await supabaseAdmin.from('profiles').insert(recordToInsert)
    if (insertError) throw insertError

    // 8. Retourner une réponse de succès
    return new Response(JSON.stringify({ message: "Profil créé avec succès" }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    // Gérer les erreurs qui ont pu survenir durant le processus
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})