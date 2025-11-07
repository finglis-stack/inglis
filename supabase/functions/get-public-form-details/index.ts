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
    const { formId } = await req.json();
    if (!formId) throw new Error("ID de formulaire manquant.");

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 1. Valider le formulaire et vérifier s'il est actif
    const { data: form, error: formError } = await supabaseAdmin
      .from('onboarding_forms')
      .select('institution_id, is_active')
      .eq('id', formId)
      .single();

    if (formError || !form || !form.is_active) {
      throw new Error("Ce formulaire d'intégration n'est pas valide ou a expiré.");
    }

    // 2. Récupérer les détails publics de l'institution
    const { data: institution, error: institutionError } = await supabaseAdmin
      .from('institutions')
      .select('name, logo_url')
      .eq('id', form.institution_id)
      .single();

    if (institutionError || !institution) {
      throw new Error("Impossible de récupérer les détails de l'institution associée à ce formulaire.");
    }

    // 3. Retourner uniquement les données publiques nécessaires
    return new Response(JSON.stringify(institution), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});