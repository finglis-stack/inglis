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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { checkoutId, card_token, amount } = await req.json();
    if (!checkoutId || !card_token || !amount) {
      throw new Error('checkoutId, card_token, and amount are required.');
    }

    // 1. Valider le checkout
    const { data: checkout, error: checkoutError } = await supabaseAdmin
      .from('checkouts')
      .select('id, merchant_account_id, amount, is_amount_variable, status')
      .eq('id', checkoutId)
      .single();

    if (checkoutError || !checkout) throw new Error('Checkout not found.');
    if (checkout.status !== 'active') throw new Error('This checkout is not active.');

    // 2. Valider le montant
    const finalAmount = parseFloat(amount);
    if (isNaN(finalAmount) || finalAmount <= 0) throw new Error('Invalid amount.');
    if (!checkout.is_amount_variable && finalAmount !== checkout.amount) {
      throw new Error('Amount mismatch for fixed-price checkout.');
    }

    // 3. Valider le jeton de carte
    const { data: tokenData, error: tokenError } = await supabaseAdmin
      .from('card_tokens')
      .select('card_id, expires_at, used_at')
      .eq('token', card_token)
      .single();

    if (tokenError || !tokenData) throw new Error('Invalid or expired card token.');
    if (tokenData.used_at) throw new Error('This card token has already been used.');
    if (new Date(tokenData.expires_at) < new Date()) throw new Error('This card token has expired.');

    const cardId = tokenData.card_id;
    await supabaseAdmin.from('card_tokens').update({ used_at: new Date().toISOString() }).eq('token', card_token);

    // 4. Exécuter la transaction
    const { data: transactionResult, error: rpcError } = await supabaseAdmin.rpc('create_authorization', {
      p_card_id: cardId,
      p_amount: finalAmount,
      p_description: `Paiement pour Checkout: ${checkout.id}`,
      p_merchant_account_id: checkout.merchant_account_id,
      p_capture_delay_hours: 0, // Capture immédiate
    });

    if (rpcError) throw rpcError;

    return new Response(JSON.stringify({ success: true, transaction: transactionResult }), {
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