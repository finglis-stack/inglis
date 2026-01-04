/* eslint-disable */
// @ts-nocheck
import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Helpers (repris et adaptés depuis create-card)
const generateRandomLetters = (length: number) => {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
};

const generateRandomDigits = (length: number) => {
  return Math.floor(Math.pow(10, length - 1) + Math.random() * 9 * Math.pow(10, length - 1)).toString();
};

const convertAlphanumericToNumeric = (alphanumeric: string) => {
  return alphanumeric.split('').map(char => {
    if (char >= '0' && char <= '9') return char;
    if (char >= 'A' && char <= 'Z') return (char.charCodeAt(0) - 65 + 10).toString();
    return '';
  }).join('');
};

const calculateLuhn = (numberString: string) => {
  let sum = 0;
  let alternate = false;
  for (let i = numberString.length - 1; i >= 0; i--) {
    let n = parseInt(numberString.charAt(i), 10);
    if (alternate) {
      n *= 2;
      if (n > 9) n = (n % 10) + 1;
    }
    sum += n;
    alternate = !alternate;
  }
  return (sum * 9) % 10;
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, card_id, reason, description, reporter_email } = await req.json();
    if (!action || !card_id) throw new Error('action et card_id requis.');

    // Auth utilisateur
    const authHeader = req.headers.get('Authorization') || '';
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) throw new Error('Utilisateur non authentifié.');

    // Admin client (service role)
    const admin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Institution de l’utilisateur
    const { data: institution } = await admin
      .from('institutions')
      .select('id')
      .eq('user_id', user.id)
      .single();
    if (!institution) throw new Error('Institution introuvable.');

    // Charger carte + programme pour vérifier l’accès et récupérer BIN
    const { data: card } = await admin
      .from('cards')
      .select('id, profile_id, card_program_id, status, user_initials, issuer_id, random_letters, unique_identifier, check_digit, expires_at')
      .eq('id', card_id)
      .single();
    if (!card) throw new Error('Carte introuvable.');

    const { data: program } = await admin
      .from('card_programs')
      .select('id, institution_id, bin, card_type, currency')
      .eq('id', card.card_program_id)
      .single();
    if (!program || program.institution_id !== institution.id) throw new Error('Accès refusé à cette carte.');

    const now = new Date();
    let updatedCard = null;

    if (action === 'block') {
      // Bloquer la carte
      const { data: updated, error: updateError } = await admin
        .from('cards')
        .update({ status: 'blocked' })
        .eq('id', card_id)
        .select('*')
        .single();
      if (updateError) throw updateError;
      updatedCard = updated;

      await admin.from('card_suspensions').insert({
        card_id,
        action: 'block',
        reason: reason || 'other',
        description: description || null,
        reporter_user_id: user.id,
        reporter_email: reporter_email || user.email,
      });

    } else if (action === 'reissue') {
      // Réémettre: générer nouveau numéro respectant le BIN + Luhn alphanumérique
      const issuer_id = program.bin;
      const user_initials = card.user_initials || 'XX';

      // Génération unique
      let newRandomLetters = '';
      let newUniqueIdentifier = '';
      let checkDigit = 0;

      for (let attempts = 0; attempts < 10; attempts++) {
        newRandomLetters = generateRandomLetters(2);
        newUniqueIdentifier = generateRandomDigits(7);

        const baseForLuhn = convertAlphanumericToNumeric(`${user_initials}${issuer_id}${newRandomLetters}${newUniqueIdentifier}`);
        checkDigit = calculateLuhn(baseForLuhn);

        // Vérifier collision
        const { data: conflict } = await admin
          .from('cards')
          .select('id')
          .eq('issuer_id', issuer_id)
          .eq('random_letters', newRandomLetters)
          .eq('unique_identifier', newUniqueIdentifier)
          .limit(1);
        if (!conflict || conflict.length === 0) break;
        if (attempts === 9) throw new Error('Impossible de générer un numéro unique, réessayez.');
      }

      // Optionnel: Regénérer expiration à +4 ans
      const expires_at = new Date();
      expires_at.setFullYear(expires_at.getFullYear() + 4);
      const expires_at_db = expires_at.toISOString().split('T')[0];

      const { data: updated, error: updateError } = await admin
        .from('cards')
        .update({
          issuer_id,
          random_letters: newRandomLetters,
          unique_identifier: newUniqueIdentifier,
          check_digit: checkDigit,
          status: 'active',
          expires_at: expires_at_db,
        })
        .eq('id', card_id)
        .select('*')
        .single();
      if (updateError) throw updateError;
      updatedCard = updated;

      await admin.from('card_suspensions').insert({
        card_id,
        action: 'reissue',
        reason: reason || 'lost',
        description: description || null,
        reporter_user_id: user.id,
        reporter_email: reporter_email || user.email,
      });

    } else if (action === 'unblock') {
      // Débloquer
      const { data: updated, error: updateError } = await admin
        .from('cards')
        .update({ status: 'active' })
        .eq('id', card_id)
        .select('*')
        .single();
      if (updateError) throw updateError;
      updatedCard = updated;

      await admin.from('card_suspensions').insert({
        card_id,
        action: 'unblock',
        reason: reason || null,
        description: description || null,
        reporter_user_id: user.id,
        reporter_email: reporter_email || user.email,
      });

    } else {
      throw new Error('Action inconnue. Utilisez block | reissue | unblock.');
    }

    return new Response(JSON.stringify({ success: true, card: updatedCard }), {
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