// @ts-nocheck
import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

console.log("Function api-v1-tokenize-card cold start");

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

serve(async (req) => {
  // Gérer les requêtes CORS preflight
  if (req.method === 'OPTIONS') {
    console.log("[api-v1-tokenize-card] Handling OPTIONS request. Sending CORS headers.");
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { card_number } = await req.json();
    if (!card_number) {
      throw new Error('card_number is required.');
    }

    // Find the card based on its number components
    const { data: card, error: cardError } = await supabaseAdmin
      .from('cards')
      .select('id')
      .match({
        user_initials: card_number.initials,
        issuer_id: card_number.issuer_id,
        random_letters: card_number.random_letters,
        unique_identifier: card_number.unique_identifier,
        check_digit: card_number.check_digit,
      })
      .single();

    if (cardError || !card) {
      console.error("[api-v1-tokenize-card] Card not found or invalid.", cardError);
      throw new Error('Card not found or invalid.');
    }

    // Generate a secure, single-use token
    const token = `tok_${crypto.randomUUID().replaceAll('-', '')}`;
    const expires_at = new Date(Date.now() + 10 * 60 * 1000); // Token expires in 10 minutes

    // Store the token
    const { error: tokenError } = await supabaseAdmin
      .from('card_tokens')
      .insert({
        token: token,
        card_id: card.id,
        expires_at: expires_at.toISOString(),
      });

    if (tokenError) {
      console.error("[api-v1-tokenize-card] Error storing token:", tokenError);
      throw tokenError;
    }

    // Return only the token
    return new Response(JSON.stringify({ token: token }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error("[api-v1-tokenize-card] An error occurred:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
})