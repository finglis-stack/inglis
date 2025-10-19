// @ts-nocheck
import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

console.log("Function api-v1-transactions cold start");

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

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
  await supabaseAdmin
    .from('api_keys')
    .update({ last_used_at: new Date().toISOString() })
    .eq('key_prefix', keyPrefix);
  return apiKeyData.institution_id;
};

async function sendWebhook(institutionId, event, payload) {
  const { data: webhooks } = await supabaseAdmin
    .from('webhooks')
    .select('url, secret')
    .eq('institution_id', institutionId)
    .eq('is_active', true)
    .in('events', [[event], ['*']]);
  if (!webhooks) return;
  for (const webhook of webhooks) {
    try {
      const body = JSON.stringify(payload);
      const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(webhook.secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
      const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body));
      const signatureHex = Array.from(new Uint8Array(signature)).map(b => b.toString(16).padStart(2, '0')).join('');
      fetch(webhook.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Inglis-Dominium-Signature': signatureHex },
        body,
      }).catch(e => console.error(`Webhook fetch failed for ${webhook.url}:`, e.message));
    } catch (e) {
      console.error(`Webhook signing failed for ${webhook.url}:`, e.message);
    }
  }
}

serve(async (req) => {
  console.log(`[api-v1-transactions] Request received: ${req.method} ${req.url}`);
  console.log("[api-v1-transactions] Request headers:", Object.fromEntries(req.headers));

  // Gérer les requêtes CORS preflight
  if (req.method === 'OPTIONS') {
    console.log("[api-v1-transactions] Handling OPTIONS request. Sending CORS headers.");
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const institutionId = await authenticateApiKey(req.headers.get('Authorization'));
    console.log(`[api-v1-transactions] Authenticated institution ID: ${institutionId}`);

    const { card_token, amount, description, capture_delay_hours } = await req.json();
    if (!card_token || !amount || !description) {
      throw new Error('card_token, amount, and description are required.');
    }

    const { data: tokenData, error: tokenError } = await supabaseAdmin
      .from('card_tokens')
      .select('card_id, expires_at, used_at')
      .eq('token', card_token)
      .single();

    if (tokenError || !tokenData) throw new Error('Invalid or expired token.');
    if (tokenData.used_at) throw new Error('This token has already been used.');
    if (new Date(tokenData.expires_at) < new Date()) throw new Error('This token has expired.');

    const cardId = tokenData.card_id;
    await supabaseAdmin.from('card_tokens').update({ used_at: new Date().toISOString() }).eq('token', card_token);

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('cards')
      .select('profiles(institution_id)')
      .eq('id', cardId)
      .single();

    if (profileError || !profile || profile.profiles.institution_id !== institutionId) {
      throw new Error('Forbidden: You do not have permission to use this card.');
    }

    const { data: transactionResult, error: rpcError } = await supabaseAdmin.rpc('create_authorization', {
      p_card_id: cardId,
      p_amount: amount,
      p_description: description,
      p_capture_delay_hours: capture_delay_hours || 0,
    });

    if (rpcError) throw rpcError;

    await sendWebhook(institutionId, 'transaction.created', transactionResult);

    return new Response(JSON.stringify(transactionResult), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error("[api-v1-transactions] An error occurred:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: error.message.startsWith('Forbidden') ? 403 : error.message.startsWith('Authentication failed') ? 401 : 400,
    });
  }
})