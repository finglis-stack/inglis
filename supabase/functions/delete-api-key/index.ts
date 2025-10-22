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
    const { key_id } = await req.json();
    if (!key_id) throw new Error("L'ID de la clé est manquant.");

    // 1. Authentifier l'utilisateur
    const authHeader = req.headers.get('Authorization')!
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    if (userError) throw userError

    // 2. Utiliser le client admin pour les opérations sécurisées
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 3. Vérification de sécurité : la clé appartient-elle bien à l'institution de l'utilisateur ?
    const { data: institution } = await supabaseAdmin.from('institutions').select('id').eq('user_id', user.id).single()
    const { data: apiKey, error: keyError } = await supabaseAdmin
      .from('api_keys')
      .select('id')
      .eq('id', key_id)
      .eq('institution_id', institution.id)
      .single()
      
    if (keyError || !apiKey) {
      throw new Error("Accès non autorisé ou clé non trouvée.");
    }

    // 4. Si la vérification passe, supprimer la clé
    const { error: deleteError } = await supabaseAdmin
      .from('api_keys')
      .delete()
      .eq('id', key_id)

    if (deleteError) throw deleteError

    return new Response(JSON.stringify({ message: "Clé API supprimée avec succès" }), {
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