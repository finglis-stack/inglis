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
    const { checkoutId, cardNumber, expiresAt, pin } = await req.json();
    if (!checkoutId || !cardNumber || !expiresAt || !pin) {
      throw new Error("Données de paiement incomplètes.");
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 1. Fetch checkout details
    const { data: checkout, error: checkoutError } = await supabaseAdmin
      .from('checkouts')
      .select('amount, description, merchant_account_id, success_url')
      .eq('id', checkoutId)
      .eq('status', 'active')
      .single();
    if (checkoutError) throw new Error("Ce lien de paiement est invalide ou a expiré.");

    // 2. Parse card number
    const cleanedCardNumber = cardNumber.replace(/\s/g, '');
    if (cleanedCardNumber.length !== 18) {
      throw new Error("Votre institution émettrice a refusé le paiement.");
    }
    const user_initials = cleanedCardNumber.substring(0, 2);
    const issuer_id = cleanedCardNumber.substring(2, 8);
    const random_letters = cleanedCardNumber.substring(8, 10);
    const unique_identifier = cleanedCardNumber.substring(10, 17);
    const check_digit = parseInt(cleanedCardNumber.substring(17, 18), 10);

    // 3. Find the card
    const { data: card, error: cardError } = await supabaseAdmin
      .from('cards')
      .select('id, pin, expires_at')
      .eq('user_initials', user_initials)
      .eq('issuer_id', issuer_id)
      .eq('random_letters', random_letters)
      .eq('unique_identifier', unique_identifier)
      .eq('check_digit', check_digit)
      .single();

    if (cardError) {
      throw new Error("Votre institution émettrice a refusé le paiement.");
    }

    // 4. Verify PIN and Expiry
    if (card.pin !== pin) {
      throw new Error("Votre institution émettrice a refusé le paiement.");
    }
    
    const cardExpiresDate = new Date(card.expires_at);
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    if (cardExpiresDate < now) {
      throw new Error("Votre institution émettrice a refusé le paiement.");
    }

    const [expMonthStr, expYearStr] = expiresAt.split('/');
    const expMonth = parseInt(expMonthStr, 10);
    const expYear = parseInt(`20${expYearStr}`, 10);
    const cardExpMonth = cardExpiresDate.getMonth() + 1;
    const cardExpYear = cardExpiresDate.getFullYear();

    if (expYear !== cardExpYear || expMonth !== cardExpMonth) {
      throw new Error("Votre institution émettrice a refusé le paiement.");
    }

    // 5. Call create_authorization RPC
    const { error: authError } = await supabaseAdmin.rpc('create_authorization', {
      p_card_id: card.id,
      p_amount: checkout.amount,
      p_description: checkout.description || `Paiement Q12X Checkout`,
      p_merchant_account_id: checkout.merchant_account_id,
      p_capture_delay_hours: 0 // Immediate capture
    });

    if (authError) {
      console.error('Authorization RPC Error:', authError.message);
      throw new Error("Votre institution émettrice a refusé le paiement.");
    }

    // 6. Success
    return new Response(JSON.stringify({ success: true, success_url: checkout.success_url }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
})