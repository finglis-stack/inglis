// @ts-nocheck
import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

// Function to authenticate an API key and return the associated institution ID
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
  const keySecret = apiKey;

  // Hash the secret part of the key to compare with the stored hash
  const encoder = new TextEncoder();
  const data = encoder.encode(keySecret);
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

  // Update last used timestamp (optional, but good for auditing)
  await supabaseAdmin
    .from('api_keys')
    .update({ last_used_at: new Date().toISOString() })
    .eq('key_prefix', keyPrefix);

  return apiKeyData.institution_id;
};

// Webhook function
async function sendWebhook(institutionId, event, payload) {
  const { data: webhooks } = await supabaseAdmin
    .from('webhooks')
    .select('url, secret')
    .eq('institution_id', institutionId)
    .eq('is_active', true)
    .in('events', [[event], ['*']]); // Correct syntax for array containment

  if (!webhooks) return;

  for (const webhook of webhooks) {
    try {
      const body = JSON.stringify(payload);
      const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(webhook.secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
      const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body));
      const signatureHex = Array.from(new Uint8Array(signature)).map(b => b.toString(16).padStart(2, '0')).join('');

      fetch(webhook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Inglis-Dominium-Signature': signatureHex,
        },
        body,
      }).catch(e => console.error(`Webhook fetch failed for ${webhook.url}:`, e.message));
    } catch (e) {
      console.error(`Webhook signing failed for ${webhook.url}:`, e.message);
    }
  }
}


serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // 1. Authenticate the request using the API key
    const institutionId = await authenticateApiKey(req.headers.get('Authorization'));

    // 2. Parse the request body
    const { card_number, amount, description, capture_delay_hours } = await req.json();
    if (!card_number || !amount || !description) {
      throw new Error('card_number, amount, and description are required.');
    }

    // 3. Find the card based on its number components
    const { data: card, error: cardError } = await supabaseAdmin
      .from('cards')
      .select('id, profile_id')
      .match({
        user_initials: card_number.initials,
        issuer_id: card_number.issuer_id,
        random_letters: card_number.random_letters,
        unique_identifier: card_number.unique_identifier,
        check_digit: card_number.check_digit,
      })
      .single();

    if (cardError || !card) {
      throw new Error('Card not found.');
    }

    // 4. SECURITY CHECK: Verify the card belongs to the authenticated institution
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('institution_id')
      .eq('id', card.profile_id)
      .single();

    if (profileError || !profile || profile.institution_id !== institutionId) {
      throw new Error('Forbidden: You do not have permission to use this card.');
    }

    // 5. Call the secure PostgreSQL function to create the authorization/transaction
    const { data: transactionResult, error: rpcError } = await supabaseAdmin.rpc('create_authorization', {
      p_card_id: card.id,
      p_amount: amount,
      p_description: description,
      p_capture_delay_hours: capture_delay_hours || 0,
    });

    if (rpcError) throw rpcError;

    // 6. Send webhook notification
    await sendWebhook(institutionId, 'transaction.created', transactionResult);

    // 7. Return the successful response
    return new Response(JSON.stringify(transactionResult), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: error.message.startsWith('Forbidden') ? 403 : error.message.startsWith('Authentication failed') ? 401 : 400,
    });
  }
})