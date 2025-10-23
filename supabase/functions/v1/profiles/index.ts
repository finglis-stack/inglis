// @ts-nocheck
import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'
import bcrypt from 'https://esm.sh/bcryptjs@2.4.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

// Fonction pour authentifier la clé API et retourner l'ID de l'institution
const authenticateApiKey = async (authHeader: string | null) => {
  if (!authHeader || !authHeader.startsWith('Bearer sk_live_')) {
    throw new Error('Missing or invalid API key.');
  }
  const apiKey = authHeader.replace('Bearer ', '');
  const keyParts = apiKey.split('_');
  if (keyParts.length !== 3 || keyParts[0] !== 'sk' || keyParts[1] !== 'live') {
      throw new Error('Invalid API key format.');
  }
  const keyPrefix = `sk_live_${keyParts[2].substring(0, 8)}`;
  
  const encoder = new TextEncoder();
  const data = encoder.encode(apiKey);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashedKey = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

  const { data: apiKeyData, error } = await supabaseAdmin
    .from('api_keys')
    .select('institution_id')
    .eq('key_prefix', keyPrefix)
    .eq('hashed_key', hashedKey)
    .single();

  if (error || !apiKeyData) {
    throw new Error('Authentication failed: API key not found or invalid.');
  }
  
  await supabaseAdmin
    .from('api_keys')
    .update({ last_used_at: new Date().toISOString() })
    .eq('key_prefix', keyPrefix);

  return apiKeyData.institution_id;
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 1. Authentifier la requête via la clé API
    const institutionId = await authenticateApiKey(req.headers.get('Authorization'));

    // 2. Récupérer et valider les données du corps de la requête
    const { full_name, email, phone, dob, address, sin, pin } = await req.json();
    if (!full_name || !email || !pin) {
      throw new Error('full_name, email, and pin are required fields.');
    }
    if (pin.length !== 4 || !/^\d{4}$/.test(pin)) {
      throw new Error("PIN must be a 4-digit string.");
    }

    // 3. Hacher le NIP pour le stockage sécurisé
    const hashedPin = bcrypt.hashSync(pin, 10);

    // 4. Préparer l'enregistrement pour l'insertion
    const recordToInsert = {
      institution_id: institutionId,
      type: 'personal',
      full_name,
      email,
      phone: phone || null,
      dob: dob || null,
      address: address || null,
      sin: sin || null,
      pin: hashedPin,
    };

    // 5. Insérer le nouveau profil dans la base de données
    const { data: newProfile, error: insertError } = await supabaseAdmin
      .from('profiles')
      .insert(recordToInsert)
      .select('id')
      .single();

    if (insertError) {
      throw new Error(`Database error: ${insertError.message}`);
    }

    // 6. Retourner une réponse de succès
    return new Response(JSON.stringify({ 
      success: true, 
      message: "User profile created successfully.",
      profile_id: newProfile.id 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 201, // 201 Created
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: error.message.startsWith('Authentication failed') ? 401 : 400,
    });
  }
})