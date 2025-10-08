// @ts-nocheck
import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Helper to get initials from a full name
const getInitials = (name) => {
  if (!name) return 'XX';
  const parts = name.split(' ');
  if (parts.length > 1) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return (name.substring(0, 2)).toUpperCase();
};

// Helper to generate random letters
const generateRandomLetters = (length) => {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
};

// Helper to generate random digits
const generateRandomDigits = (length) => {
  return Math.floor(Math.pow(10, length - 1) + Math.random() * 9 * Math.pow(10, length - 1)).toString();
};

// Luhn algorithm implementation
const calculateLuhn = (numberString) => {
  let sum = 0;
  let alternate = false;
  for (let i = numberString.length - 1; i >= 0; i--) {
    let n = parseInt(numberString.charAt(i), 10);
    if (alternate) {
      n *= 2;
      if (n > 9) {
        n = (n % 10) + 1;
      }
    }
    sum += n;
    alternate = !alternate;
  }
  return (sum * 9) % 10;
};

const convertAlphanumericToNumeric = (alphanumeric) => {
    return alphanumeric.split('').map(char => {
        if (char >= '0' && char <= '9') {
            return char;
        }
        if (char >= 'A' && char <= 'Z') {
            return (char.charCodeAt(0) - 65 + 10).toString();
        }
        return ''; // Should not happen with controlled input
    }).join('');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { profile_id, card_program_id, credit_limit, cash_advance_limit } = await req.json();
    if (!profile_id || !card_program_id) throw new Error("Profile ID and Program ID are required.");

    const authHeader = req.headers.get('Authorization')!;
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError) throw userError;

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Security check: ensure profile and program belong to the user's institution
    const { data: institution } = await supabaseAdmin.from('institutions').select('id').eq('user_id', user.id).single();
    if (!institution) throw new Error("Institution not found for user.");

    const { data: profile, error: profileError } = await supabaseAdmin.from('profiles').select('id, full_name, legal_name, type').eq('id', profile_id).eq('institution_id', institution.id).single();
    if (profileError || !profile) throw new Error("Profile not found or access denied.");

    const { data: program, error: programError } = await supabaseAdmin.from('card_programs').select('id, bin, card_type').eq('id', card_program_id).eq('institution_id', institution.id).single();
    if (programError || !program) throw new Error("Card program not found or access denied.");

    // Generate card components
    const user_initials = getInitials(profile.type === 'personal' ? profile.full_name : profile.legal_name);
    const issuer_id = program.bin;
    const random_letters = generateRandomLetters(2);
    const unique_identifier = generateRandomDigits(7);

    const base_number_for_luhn = convertAlphanumericToNumeric(`${user_initials}${issuer_id}${random_letters}${unique_identifier}`);
    const check_digit = calculateLuhn(base_number_for_luhn);

    // Insert new card and get its ID
    const { data: newCard, error: insertError } = await supabaseAdmin.from('cards').insert({
      profile_id,
      card_program_id,
      user_initials,
      issuer_id,
      random_letters,
      unique_identifier,
      check_digit,
      status: 'active',
    }).select('id').single();

    if (insertError) throw insertError;

    // If it's a credit card, create a credit account
    if (program.card_type === 'credit') {
        if (!credit_limit) throw new Error("Credit limit is required for credit cards.");
        
        const { error: accountError } = await supabaseAdmin.from('credit_accounts').insert({
            profile_id: profile_id,
            card_id: newCard.id,
            credit_limit: credit_limit,
            cash_advance_limit: cash_advance_limit || null,
        });

        if (accountError) throw accountError;
    }

    return new Response(JSON.stringify({ message: "Card created successfully" }), {
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