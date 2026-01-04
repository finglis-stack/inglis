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

    // 1. Valider le formulaire
    const { data: form, error: formError } = await supabaseAdmin
      .from('onboarding_forms')
      .select('*')
      .eq('id', formId)
      .single();

    if (formError || !form) {
      console.error('Error fetching form:', formError);
      throw new Error("Ce formulaire d'intégration n'est pas valide ou a expiré.");
    }
    if (!form.is_active) {
      throw new Error("Ce formulaire n'est plus actif.");
    }

    // 2. Récupérer les détails de l'institution
    const { data: institution, error: institutionError } = await supabaseAdmin
      .from('institutions')
      .select('name, logo_url')
      .eq('id', form.institution_id)
      .single();
    
    if (institutionError || !institution) {
      throw new Error("L'institution associée à ce formulaire est introuvable.");
    }

    // 3. Si des programmes de cartes sont liés, récupérer leurs détails
    let cardPrograms = [];
    if (form.linked_card_program_ids && form.linked_card_program_ids.length > 0) {
      const { data: programsData, error: programsError } = await supabaseAdmin
        .from('card_programs')
        .select('id, program_name, card_type, card_color, card_image_url')
        .in('id', form.linked_card_program_ids);
      
      if (programsError) throw programsError;
      cardPrograms = programsData;
    }

    // 4. Construire la réponse
    const responseData = {
      formDetails: {
        id: form.id,
        name: form.name,
        description: form.description,
        is_credit_bureau_enabled: form.is_credit_bureau_enabled,
        credit_limit_type: form.credit_limit_type,
        fixed_credit_limit: form.fixed_credit_limit,
        background_image_url: form.background_image_url,
        auto_approve_enabled: form.auto_approve_enabled,
      },
      institution: institution,
      cardPrograms: cardPrograms,
    };

    return new Response(JSON.stringify(responseData), {
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