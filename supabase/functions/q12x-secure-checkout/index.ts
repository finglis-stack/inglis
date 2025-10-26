// @ts-nocheck
import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'
import bcrypt from 'https://esm.sh/bcryptjs@2.4.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

const isExpiryValid = (expiry: string) => {
  if (!/^\d{2}\/\d{2}$/.test(expiry)) return false;
  const [month, year] = expiry.split('/');
  const expiryMonth = parseInt(month, 10);
  const expiryYear = 2000 + parseInt(year, 10);
  if (expiryMonth < 1 || expiryMonth > 12) return false;
  const now = new Date();
  const lastDayOfExpiryMonth = new Date(expiryYear, expiryMonth, 0);
  return lastDayOfExpiryMonth >= now;
};

// ... (le reste des fonctions helpers reste identique)

serve(async (req) => {
  // ... (le début de la fonction reste identique)
  const { checkoutId, card_number, expiry_date, pin, amount, fraud_signals } = await req.json();
  const ipAddress = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? null;
  
  // ... (logique d'analyse de risque)

  try {
    // ... (logique de validation du checkout, etc.)

    const { data: checkout, error: checkoutError } = await supabaseAdmin
      .from('checkouts')
      .select('id, name, merchant_account_id, amount, is_amount_variable, status, currency')
      .eq('id', checkoutId)
      .single();
    if (checkoutError || !checkout) throw new Error('Checkout not found.');
    
    const finalAmount = checkout.is_amount_variable ? parseFloat(amount) : checkout.amount;
    const checkoutCurrency = checkout.currency;

    // ... (logique de validation du token de carte)
    const { data: cardData, error: cardError } = await supabaseAdmin
      .from('cards').select('id, pin, expires_at, profile_id, profiles(*, debit_accounts(currency), credit_accounts(currency))').match({
        user_initials: card_number.initials, issuer_id: card_number.issuer_id,
        random_letters: card_number.random_letters, unique_identifier: card_number.unique_identifier,
        check_digit: card_number.check_digit,
      }).single();
    
    if (cardError || !cardData) throw new Error('Payment declined by issuer.');
    
    const cardCurrency = cardData.profiles.debit_accounts[0]?.currency || cardData.profiles.credit_accounts[0]?.currency;
    if (!cardCurrency) throw new Error("Could not determine card's currency.");

    let amountToCharge = finalAmount;
    let exchangeRate = null;

    if (cardCurrency !== checkoutCurrency) {
      const { data: rateData, error: rateError } = await supabaseAdmin.functions.invoke('get-exchange-rate', {
        body: { from: checkoutCurrency, to: cardCurrency }
      });
      if (rateError) throw new Error("Could not retrieve exchange rate.");
      exchangeRate = rateData.rate;
      amountToCharge = finalAmount * exchangeRate;
    }

    // ... (logique de validation du PIN, expiration, etc.)
    if (!bcrypt.compareSync(pin, cardData.pin)) {
      throw new Error('Le NIP est incorrect.');
    }

    // Exécuter la transaction
    const { data: transactionResult, error: rpcError } = await supabaseAdmin.rpc('process_transaction', {
      p_card_id: cardData.id, 
      p_amount: amountToCharge, // On charge le montant converti
      p_type: 'purchase',
      p_description: `Paiement: ${checkout.name} (${checkout.id})`,
      p_merchant_account_id: checkout.merchant_account_id,
      p_ip_address: ipAddress,
    });
    if (rpcError) throw rpcError;

    // Mettre à jour la transaction avec les détails de conversion
    if (exchangeRate) {
      await supabaseAdmin.from('transactions').update({
        original_amount: finalAmount,
        original_currency: checkoutCurrency,
        exchange_rate: exchangeRate
      }).eq('id', transactionResult.transaction_id);
    }

    // ... (logique de mise à jour du profil, etc.)

    return new Response(JSON.stringify({ success: true, transaction: transactionResult }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200,
    });

  } catch (error) {
    // ... (logique de gestion d'erreur)
    return new Response(JSON.stringify({ error: "Le paiement a été refusé par l'institution émettrice de la carte." }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400,
    });
  }
})