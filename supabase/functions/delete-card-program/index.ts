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
    const { program_id } = await req.json()
    if (!program_id) throw new Error("L'identifiant du programme est manquant.");

    // Authentifier l'utilisateur
    const authHeader = req.headers.get('Authorization')!
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    if (userError) throw userError

    // Utiliser le client admin pour les opérations sécurisées
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 1. Vérifier que le programme appartient bien à l'institution de l'utilisateur
    const { data: institution } = await supabaseAdmin.from('institutions').select('id').eq('user_id', user.id).single()
    const { data: program, error: programError } = await supabaseAdmin.from('card_programs').select('id').eq('id', program_id).eq('institution_id', institution.id).single()
    if (programError || !program) throw new Error("Accès non autorisé ou programme non trouvé.");

    // 2. Vérifier si des cartes sont associées à ce programme
    const { data: cards, error: cardsError } = await supabaseAdmin
      .from('cards')
      .select('id', { count: 'exact', head: true })
      .eq('card_program_id', program_id)
      
    if (cardsError) throw cardsError;
    if (cards.count > 0) {
      throw new Error("Ce programme ne peut pas être supprimé car des cartes y sont associées.");
    }

    // 3. Si aucune carte n'est associée, supprimer le programme
    const { error: deleteError } = await supabaseAdmin
      .from('card_programs')
      .delete()
      .eq('id', program_id)

    if (deleteError) throw deleteError

    return new Response(JSON.stringify({ message: "Programme supprimé avec succès" }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400, // Utiliser 400 pour les erreurs métier comme "cartes associées"
    })
  }
})