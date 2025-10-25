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

// Helper to validate expiry date format MM/YY and check if it's in the future
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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const { checkoutId, card_number, expiry_date, pin, amount, fraud_signals } = await req.json();
  const ipAddress = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? null;
  
  let riskScore = 0;
  const riskReasons = [];
  let profile = null;
  let card = null;
  let decision = 'ALLOW'; // Default to allow, add points to block

  try {
    if (!checkoutId || !card_number || !expiry_date || !pin || !amount || !fraud_signals) {
      throw new Error('Missing required payment information.');
    }

    // 1. Find card and profile
    const { data: cardData, error: cardError } = await supabaseAdmin
      .from('cards')
      .select('id, pin, expires_at, profile_id, profiles(*)')
      .match({
        user_initials: card_number.initials,
        issuer_id: card_number.issuer_id,
        random_letters: card_number.random_letters,
        unique_identifier: card_number.unique_identifier,
        check_digit: card_number.check_digit,
      })
      .single();

    if (cardError || !cardData || !cardData.profiles) {
      riskReasons.push('CARD_NOT_FOUND');
      throw new Error('Payment declined by issuer.');
    }
    card = cardData;
    profile = cardData.profiles;

    // 2. Basic validation and risk scoring
    if (!isExpiryValid(expiry_date)) {
      riskReasons.push('INVALID_EXPIRY_FORMAT');
      riskScore += 100; // Invalid format is an automatic block
    } else {
      const [month, year] = expiry_date.split('/');
      const cardExpiresAt = new Date(card.expires_at);
      if (parseInt(month, 10) !== cardExpiresAt.getUTCMonth() + 1 || (2000 + parseInt(year, 10)) !== cardExpiresAt.getUTCFullYear()) {
        riskReasons.push('EXPIRY_MISMATCH');
        riskScore += 100; // Mismatch is an automatic block
      }
    }

    if (!bcrypt.compareSync(pin, card.pin)) {
      riskReasons.push('INCORRECT_PIN');
      riskScore += 50; // Incorrect PIN is a very strong signal
    }

    // 3. Behavioral and Transactional Risk Scoring
    if (fraud_signals.pan_entry_duration_ms < 1000) { riskScore += 25; riskReasons.push('PAN entry too fast (potential paste)'); }
    if (fraud_signals.pan_entry_duration_ms > 20000) { riskScore += 15; riskReasons.push('PAN entry too slow'); }
    if (fraud_signals.expiry_entry_duration_ms > 7000) { riskScore += 10; riskReasons.push('Expiry entry too slow'); }
    if (fraud_signals.pin_entry_duration_ms < 500) { riskScore += 20; riskReasons.push('PIN entry too fast'); }
    if (fraud_signals.paste_events > 0) { riskScore += 5; riskReasons.push('Paste events detected'); }
    
    if (profile.avg_transaction_amount > 0 && profile.transaction_amount_stddev > 0) {
      const deviation = Math.abs(amount - profile.avg_transaction_amount) / profile.transaction_amount_stddev;
      if (deviation > 2.5) { riskScore += 30; riskReasons.push('Amount deviation significant'); }
    }
    if (profile.last_transaction_at) {
      const timeSinceLast = (new Date() - new Date(profile.last_transaction_at)) / 1000;
      if (timeSinceLast < 15) { riskScore += 40; riskReasons.push('Transaction velocity too high'); }
    }

    // 4. Final Decision
    decision = riskScore >= 60 ? 'BLOCK' : 'ALLOW';

    if (decision === 'BLOCK') {
      throw new Error('Payment declined by issuer.');
    }

    // 5. Proceed with transaction
    const { data: transactionResult, error: rpcError } = await supabaseAdmin.rpc('process_transaction', {
      p_card_id: card.id,
      p_amount: parseFloat(amount),
      p_type: 'purchase',
      p_description: `Paiement: ${checkoutId}`,
      p_merchant_account_id: (await supabaseAdmin.from('checkouts').select('merchant_account_id').eq('id', checkoutId).single()).data.merchant_account_id,
      p_ip_address: ipAddress,
    });
    if (rpcError) throw rpcError;

    // 6. Log successful assessment and update profile
    await supabaseAdmin.from('transaction_risk_assessments').insert({
      transaction_id: transactionResult.transaction_id,
      profile_id: profile.id,
      risk_score: riskScore,
      decision: decision,
      signals: { ...fraud_signals, ipAddress, riskReasons },
    });
    await supabaseAdmin.from('profiles').update({ last_transaction_at: new Date().toISOString() }).eq('id', profile.id);

    return new Response(JSON.stringify({ success: true, transaction: transactionResult }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    // This block now catches everything, including validation failures and high-risk blocks.
    // Log the detailed assessment regardless of the failure reason.
    await supabaseAdmin.from('transaction_risk_assessments').insert({
      profile_id: profile ? profile.id : null,
      risk_score: riskScore,
      decision: 'BLOCK', // All errors result in a block
      signals: { ...fraud_signals, ipAddress, riskReasons, error: error.message },
    });

    // Return a generic error message to the client.
    return new Response(JSON.stringify({ error: "Le paiement a été refusé par l'institution émettrice de la carte." }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
})