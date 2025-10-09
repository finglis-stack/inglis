// @ts-nocheck
import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'
import { SMTPClient } from "https://deno.land/x/deno_smtp@0.4.0/mod.ts";

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
        return '';
    }).join('');
}

const getEmailHtml = (details) => {
  const isLight = details.cardColor.includes('fde0cf');
  const textColor = isLight ? '#1F2937' : '#FFFFFF';
  const logoFilter = isLight ? '' : 'brightness(0) invert(1)';

  return `
  <!DOCTYPE html>
  <html lang="fr">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Votre nouvelle carte est prête</title>
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol'; margin: 0; padding: 0; background-color: #f8f9fa; }
      .container { max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.08); }
      .header { padding: 24px; text-align: center; background-color: #f1f3f5; }
      .content { padding: 32px; }
      .card-wrapper { margin: 24px 0; }
      .card { border-radius: 12px; padding: 24px; font-family: 'Courier New', Courier, monospace; box-shadow: 0 8px 16px rgba(0,0,0,0.15); display: flex; flex-direction: column; justify-content: space-between; height: 180px; color: ${textColor}; background: ${details.cardColor}; }
      .card-header { display: flex; justify-content: space-between; align-items: flex-start; }
      .card-details { font-size: 22px; letter-spacing: 2px; margin-top: 16px; }
      .card-footer { display: flex; justify-content: space-between; font-size: 12px; margin-top: 8px; text-transform: uppercase; }
      .button { display: inline-block; background-color: #000080; color: #ffffff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold; margin-top: 24px; }
      .footer { padding: 24px; text-align: center; font-size: 12px; color: #6c757d; background-color: #f1f3f5; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h2>Votre nouvelle carte est prête !</h2>
      </div>
      <div class="content">
        <p>Bonjour ${details.profileName},</p>
        <p>Félicitations ! Votre nouvelle carte du programme <strong>${details.programName}</strong> a été créée avec succès. Voici un aperçu de votre carte :</p>
        <div class="card-wrapper">
          <div class="card">
            <div class="card-header">
              <div>
                <p style="margin:0; font-size: 12px; opacity: 0.8;">${details.programName}</p>
                <p style="margin:0; font-size: 16px; font-weight: bold; text-transform: uppercase;">${details.cardType}</p>
              </div>
              <img src="https://inglisdominium.ca/logo.png" alt="Logo" style="height: 32px; filter: ${logoFilter};">
            </div>
            <div>
              <div style="width: 48px; height: 32px; background-color: #ffca28; border-radius: 6px; margin-bottom: 8px;"></div>
              <p class="card-details">${details.cardNumber}</p>
              <div class="card-footer">
                <span>${details.profileName}</span>
                <span>${details.expiresAt}</span>
              </div>
            </div>
          </div>
        </div>
        <p>Pour activer votre carte, la première étape est de configurer votre numéro d'identification personnel (NIP). Veuillez cliquer sur le bouton ci-dessous pour le faire en toute sécurité.</p>
        <a href="${details.pinSetupLink}" class="button">Configurer mon NIP</a>
        <p style="font-size: 12px; color: #6c757d; margin-top: 24px;">Ce lien est unique et expirera dans 24 heures. Si vous n'avez pas demandé cette carte, veuillez contacter notre support immédiatement.</p>
      </div>
      <div class="footer">
        <p>&copy; ${new Date().getFullYear()} Inglis Dominium. Tous droits réservés.</p>
      </div>
    </div>
  </body>
  </html>
  `;
};

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

    const { data: institution } = await supabaseAdmin.from('institutions').select('id').eq('user_id', user.id).single();
    if (!institution) throw new Error("Institution not found for user.");

    const { data: profile, error: profileError } = await supabaseAdmin.from('profiles').select('id, full_name, legal_name, type, email').eq('id', profile_id).eq('institution_id', institution.id).single();
    if (profileError || !profile) throw new Error("Profile not found or access denied.");

    const { data: program, error: programError } = await supabaseAdmin.from('card_programs').select('id, bin, card_type, program_name, card_color').eq('id', card_program_id).eq('institution_id', institution.id).single();
    if (programError || !program) throw new Error("Card program not found or access denied.");

    const user_initials = getInitials(profile.type === 'personal' ? profile.full_name : profile.legal_name);
    const issuer_id = program.bin;
    const random_letters = generateRandomLetters(2);
    const unique_identifier = generateRandomDigits(7);

    const base_number_for_luhn = convertAlphanumericToNumeric(`${user_initials}${issuer_id}${random_letters}${unique_identifier}`);
    const check_digit = calculateLuhn(base_number_for_luhn);

    const expires_at = new Date();
    expires_at.setFullYear(expires_at.getFullYear() + 4);
    const expires_at_db = expires_at.toISOString().split('T')[0];
    const expires_at_display = `${(expires_at.getMonth() + 1).toString().padStart(2, '0')}/${expires_at.getFullYear().toString().slice(-2)}`;

    const { data: newCard, error: insertError } = await supabaseAdmin.from('cards').insert({
      profile_id,
      card_program_id,
      user_initials,
      issuer_id,
      random_letters,
      unique_identifier,
      check_digit,
      status: 'active',
      expires_at: expires_at_db,
    }).select('id').single();

    if (insertError) throw insertError;

    if (program.card_type === 'credit') {
        if (!credit_limit) throw new Error("Credit limit is required for credit cards.");
        const { error: accountError } = await supabaseAdmin.from('credit_accounts').insert({ profile_id, card_id: newCard.id, credit_limit, cash_advance_limit: cash_advance_limit || null });
        if (accountError) throw accountError;
    } else if (program.card_type === 'debit') {
        const { error: accountError } = await supabaseAdmin.from('debit_accounts').insert({ profile_id, card_id: newCard.id, current_balance: 0 });
        if (accountError) throw accountError;
    }

    const pinSetupToken = crypto.randomUUID();
    const tokenExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    const { error: tokenUpdateError } = await supabaseAdmin.from('profiles').update({ pin_setup_token: pinSetupToken, pin_setup_token_expires_at: tokenExpiresAt }).eq('id', profile_id);

    if (tokenUpdateError) {
      console.error("Failed to set PIN setup token:", tokenUpdateError);
    } else if (profile.email) {
      const client = new SMTPClient({
        connection: {
          hostname: Deno.env.get('SMTP_HOST'),
          port: Number(Deno.env.get('SMTP_PORT')),
          tls: true,
          auth: {
            username: Deno.env.get('SMTP_USER'),
            password: Deno.env.get('SMTP_PASS'),
          },
        },
      });

      const profileName = profile.type === 'personal' ? profile.full_name : profile.legal_name;
      const cardNumber = `${user_initials} ${issuer_id} ${random_letters} ${unique_identifier.slice(0,4)} ${unique_identifier.slice(4)} ${check_digit}`;

      await client.send({
        from: Deno.env.get('SMTP_USER'),
        to: profile.email,
        subject: "Votre nouvelle carte Inglis Dominium est prête",
        html: getEmailHtml({
          profileName,
          programName: program.program_name,
          cardType: program.card_type,
          cardColor: program.card_color,
          cardNumber,
          expiresAt: expires_at_display,
          pinSetupLink: `https://inglisdominium.ca/set-pin/${pinSetupToken}`,
        }),
      });
      await client.close();
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