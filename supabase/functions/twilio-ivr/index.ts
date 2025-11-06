// @ts-nocheck
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import bcrypt from 'https://esm.sh/bcryptjs@2.4.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-twilio-signature',
};

// --- Helpers pour générer le TwiML (XML) ---
class VoiceResponse {
  constructor() {
    this.body = [];
  }
  say(attributes, text) {
    const attrs = Object.entries(attributes).map(([key, val]) => `${key}="${val}"`).join(' ');
    this.body.push(`<Say ${attrs}>${text}</Say>`);
  }
  gather(attributes, nested) {
    const attrs = Object.entries(attributes).map(([key, val]) => `${key}="${val}"`).join(' ');
    let nestedContent = '';
    if (nested && nested.say) {
      nestedContent = `<Say voice="${nested.say.voice}" language="${nested.say.language}">${nested.say.text}</Say>`;
    }
    this.body.push(`<Gather ${attrs}>${nestedContent}</Gather>`);
  }
  redirect(attributes, url) {
      if (typeof attributes === 'string') {
          url = attributes;
          attributes = {};
      }
      const attrs = Object.entries(attributes).map(([key, val]) => `${key}="${val}"`).join(' ');
      this.body.push(`<Redirect ${attrs}>${url}</Redirect>`);
  }
  hangup() {
    this.body.push('<Hangup/>');
  }
  toString() {
    return `<?xml version="1.0" encoding="UTF-8"?><Response>${this.body.join('')}</Response>`;
  }
}

// --- Traductions pour le SVI ---
const translations = {
  fr: {
    voice: 'alice',
    language: 'fr-CA',
    welcome: "Bienvenue chez Inglis Dominion. Pour le service en français, appuyez sur 1. For service in English, press 2.",
    askForCard: "Veuillez entrer les 18 caractères de votre numéro de carte, suivis de la touche dièse.",
    askForPin: "Veuillez maintenant entrer votre NIP à 4 chiffres, suivi de la touche dièse.",
    authFailed: "Désolé, les informations fournies sont incorrectes. Au revoir.",
    menu: "Appuyez sur 1 pour connaître le solde de votre compte. Appuyez sur 2 pour vos dernières transactions. Appuyez sur 9 pour revenir au menu principal.",
    balanceIs: "Le solde de votre compte est de",
    dollars: "dollars",
    cents: "cents",
    and: "et",
    availableCreditIs: "Votre crédit disponible est de",
    featureNotAvailable: "Cette fonctionnalité n'est pas encore disponible.",
    invalidOption: "Option invalide. Veuillez réessayer.",
    goodbye: "Merci d'avoir appelé. Au revoir.",
    error: "Une erreur est survenue. Veuillez réessayer plus tard."
  },
  en: {
    voice: 'alice',
    language: 'en-US',
    welcome: "Welcome to Inglis Dominion. For service in English, press 2. Pour le service en français, appuyez sur 1.",
    askForCard: "Please enter the 18 characters of your card number, followed by the pound key.",
    askForPin: "Please enter your 4-digit PIN, followed by the pound key.",
    authFailed: "Sorry, the information provided is incorrect. Goodbye.",
    menu: "Press 1 for your account balance. Press 2 for your latest transactions. Press 9 to return to the main menu.",
    balanceIs: "Your account balance is",
    dollars: "dollars",
    cents: "cents",
    and: "and",
    availableCreditIs: "Your available credit is",
    featureNotAvailable: "This feature is not yet available.",
    invalidOption: "Invalid option. Please try again.",
    goodbye: "Thank you for calling. Goodbye.",
    error: "An error occurred. Please try again later."
  }
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // VALIDATION TEMPORAIREMENT DÉSACTIVÉE POUR DÉBOGUER
    // const twilioSignature = req.headers.get('x-twilio-signature');
    // const authToken = Deno.env.get('TWILIO_AUTH_TOKEN');
    // if (!authToken) throw new Error("TWILIO_AUTH_TOKEN is not set.");
    // const requestIsValid = await validateTwilioRequest(authToken, twilioSignature, fullUrl, paramsObj);
    // if (!requestIsValid) {
    //   return new Response("Invalid Twilio signature", { status: 403 });
    // }

    const url = new URL(req.url);
    const bodyText = await req.text();
    const params = new URLSearchParams(bodyText);
    
    const twiml = new VoiceResponse();
    const digits = params.get('Digits');
    const lang = url.searchParams.get('lang') || 'fr';
    const t = translations[lang];

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    if (!url.searchParams.has('lang')) {
      twiml.gather({ numDigits: 1, action: `${url.origin}${url.pathname}`, method: 'POST' }, {
        say: { voice: t.voice, language: 'fr-CA', text: "Pour le service en français, appuyez sur 1. For service in English, press 2." }
      });
      twiml.redirect(`${url.origin}${url.pathname}`);
    } else if (digits && !url.searchParams.get('cardNumber') && !url.searchParams.get('cardId')) {
      const selectedLang = digits === '1' ? 'fr' : 'en';
      twiml.redirect({ method: 'POST' }, `${url.origin}${url.pathname}?lang=${selectedLang}`);
    } else if (!url.searchParams.get('cardNumber') && !url.searchParams.get('cardId')) {
      twiml.gather({ finishOnKey: '#', action: `${url.origin}${url.pathname}?lang=${lang}`, method: 'POST' }, {
        say: { voice: t.voice, language: t.language, text: t.askForCard }
      });
    } else if (digits && !url.searchParams.get('cardNumber') && !url.searchParams.get('cardId')) {
      const cardNumberRaw = digits.toUpperCase();
      twiml.gather({ numDigits: 4, finishOnKey: '#', action: `${url.origin}${url.pathname}?lang=${lang}&cardNumber=${cardNumberRaw}`, method: 'POST' }, {
        say: { voice: t.voice, language: t.language, text: t.askForPin }
      });
    } else if (digits && url.searchParams.get('cardNumber')) {
      const cardNumberRaw = url.searchParams.get('cardNumber');
      const pin = digits;
      const cardParts = { user_initials: cardNumberRaw.substring(0, 2), issuer_id: cardNumberRaw.substring(2, 8), random_letters: cardNumberRaw.substring(8, 10), unique_identifier: cardNumberRaw.substring(10, 17), check_digit: cardNumberRaw.substring(17, 18) };
      const { data: card, error: cardError } = await supabaseAdmin.from('cards').select('id, pin').match(cardParts).single();
      if (cardError || !card || !card.pin || !bcrypt.compareSync(pin, card.pin)) {
        twiml.say({ voice: t.voice, language: t.language }, t.authFailed);
        twiml.hangup();
      } else {
        twiml.gather({ numDigits: 1, action: `${url.origin}${url.pathname}?lang=${lang}&cardId=${card.id}`, method: 'POST' }, {
          say: { voice: t.voice, language: t.language, text: t.menu }
        });
        twiml.redirect(`${url.origin}${url.pathname}?lang=${lang}&cardId=${card.id}`);
      }
    } else if (digits && url.searchParams.get('cardId')) {
      const cardId = url.searchParams.get('cardId');
      switch (digits) {
        case '1':
          const { data: debitAccount } = await supabaseAdmin.from('debit_accounts').select('id').eq('card_id', cardId).single();
          const { data: creditAccount } = await supabaseAdmin.from('credit_accounts').select('id').eq('card_id', cardId).single();
          let balanceText = '';
          if (debitAccount) {
            const { data, error } = await supabaseAdmin.rpc('get_debit_account_balance', { p_account_id: debitAccount.id }).single();
            if (error) throw error;
            const [dollars, cents] = data.available_balance.toFixed(2).split('.');
            balanceText = `${t.balanceIs} ${dollars} ${t.dollars} ${t.and} ${cents} ${t.cents}.`;
          } else if (creditAccount) {
            const { data, error } = await supabaseAdmin.rpc('get_credit_account_balance', { p_account_id: creditAccount.id }).single();
            if (error) throw error;
            const [dollars, cents] = data.available_credit.toFixed(2).split('.');
            balanceText = `${t.availableCreditIs} ${dollars} ${t.dollars} ${t.and} ${cents} ${t.cents}.`;
          }
          twiml.say({ voice: t.voice, language: t.language }, balanceText);
          twiml.redirect(`${url.origin}${url.pathname}?lang=${lang}&cardId=${cardId}`);
          break;
        case '2':
          twiml.say({ voice: t.voice, language: t.language }, t.featureNotAvailable);
          twiml.redirect(`${url.origin}${url.pathname}?lang=${lang}&cardId=${cardId}`);
          break;
        case '9':
          twiml.redirect(`${url.origin}${url.pathname}?lang=${lang}&cardId=${cardId}`);
          break;
        default:
          twiml.say({ voice: t.voice, language: t.language }, t.invalidOption);
          twiml.redirect(`${url.origin}${url.pathname}?lang=${lang}&cardId=${cardId}`);
          break;
      }
    } else if (url.searchParams.get('cardId')) {
      const cardId = url.searchParams.get('cardId');
      twiml.gather({ numDigits: 1, action: `${url.origin}${url.pathname}?lang=${lang}&cardId=${cardId}`, method: 'POST' }, {
        say: { voice: t.voice, language: t.language, text: t.menu }
      });
      twiml.hangup();
    } else {
      twiml.say({ voice: t.voice, language: t.language }, t.goodbye);
      twiml.hangup();
    }

    return new Response(twiml.toString(), { headers: { ...corsHeaders, 'Content-Type': 'application/xml' } });
  } catch (error) {
    console.error('IVR Error:', error);
    const twiml = new VoiceResponse();
    twiml.say({ voice: translations.fr.voice, language: translations.fr.language }, translations.fr.error);
    twiml.hangup();
    return new Response(twiml.toString(), { headers: { ...corsHeaders, 'Content-Type': 'application/xml' }, status: 200 });
  }
});