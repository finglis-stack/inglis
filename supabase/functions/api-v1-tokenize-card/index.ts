// @ts-nocheck
import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'
import bcrypt from 'https://esm.sh/bcryptjs@2.4.3'

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
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { card_number, expiry_date, pin } = await req.json();
    if (!card_number || !expiry_date || !pin) {
      throw new Error('card_number, expiry_date, and pin are required.');
    }

    // 1. Find the card based on its number components
    const { data: card, error: cardError } = await supabaseAdmin
      .from('cards')
      .select('id, pin, expires_at')
      .match({
        user_initials: card_number.initials,
        issuer_id: card_number.issuer_id,
        random_letters: card_number.random_letters,
        unique_identifier: card_number.unique_identifier,
        check_digit: card_number.check_digit,
      })
      .single();

    if (cardError || !card) {
      throw new Error('Carte invalide ou non trouvée.');
    }

    // 2. Validate PIN by comparing hashes
    const isPinValid = bcrypt.compareSync(pin, card.pin);
    if (!isPinValid) {
      throw new Error('Le NIP est incorrect.');
    }

    // 3. Validate Expiry Date
    const [month, year] = expiry_date.split('/');
    if (!month || !year || month.length !== 2 || year.length !== 2) {
      throw new Error("Format de date d'expiration invalide. Utilisez MM/AA.");
    }
    const expiryMonth = parseInt(month, 10);
    const expiryYear = 2000 + parseInt(year, 10);
    
    const cardExpiresAt = new Date(card.expires_at);
    const lastDayOfExpiryMonth = new Date(expiryYear, expiryMonth, 0);

    // Compare year and month for expiry check
    const cardExpiryYear = cardExpiresAt.getFullYear();
    const cardExpiryMonth = cardExpiresAt.getMonth() + 1; // getMonth is 0-indexed

    if (expiryYear !== cardExpiryYear || expiryMonth !== cardExpiryMonth) {
        throw new Error("La date d'expiration ne correspond pas.");
    }
    
    const now = new Date();
    if (lastDayOfExpiryMonth < now) {
        throw new Error("Cette carte est expirée.");
    }


    // 4. Generate a secure, single-use token
    const token = `tok_${crypto.randomUUID().replaceAll('-', '')}`;
    const expires_at = new Date(Date.now() + 10 * 60 * 1000); // Token expires in 10 minutes

    // 5. Store the token
    const { error: tokenError } = await supabaseAdmin
      .from('card_tokens')
      .insert({
        token: token,
        card_id: card.id,
        expires_at: expires_at.toISOString(),
      });

    if (tokenError) {
      throw tokenError;
    }

    // 6. Return only the token
    return new Response(JSON.stringify({ token: token }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    // Log the specific error for debugging, but return a generic message to the client.
    console.error("Tokenization Error:", error.message);
    return new Response(JSON.stringify({ error: "Les informations de paiement sont invalides ou la transaction a été refusée." }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
})