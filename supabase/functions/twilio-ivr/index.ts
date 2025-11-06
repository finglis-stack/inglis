// @ts-nocheck
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0?target=deno';
import bcrypt from 'https://esm.sh/bcryptjs@2.4.3?target=deno';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-twilio-signature',
};

// --- Helpers pour générer le TwiML (XML) ---
class VoiceResponse {
  constructor() { this.body = []; }
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
  redirect(url) { this.body.push(`<Redirect method="POST">${url}</Redirect>`); }
  hangup() { this.body.push('<Hangup/>'); }
  toString() { return `<?xml version="1.0" encoding="UTF-8"?><Response>${this.body.join('')}</Response>`; }
}

// --- Traductions pour le SVI ---
const translations = {
  fr: {
    voice: 'alice', language: 'fr-CA',
    welcome: "Pour le service en français, appuyez sur 1. For service in English, press 2.",
    askForCard: "Veuillez entrer les 18 caractères de votre numéro de carte, suivis de la touche dièse.",
    askForPin: "Veuillez maintenant entrer votre NIP à 4 chiffres, suivi de la touche dièse.",
    authFailed: "Désolé, les informations fournies sont incorrectes. Au revoir.",
    menu: "Appuyez sur 1 pour connaître le solde de votre compte. Appuyez sur 2 pour vos dernières transactions.",
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
    voice: 'alice', language: 'en-US',
    welcome: "For service in English, press 2. Pour le service en français, appuyez sur 1.",
    askForCard: "Please enter the 18 characters of your card number, followed by the pound key.",
    askForPin: "Please enter your 4-digit PIN, followed by the pound key.",
    authFailed: "Sorry, the information provided is incorrect. Goodbye.",
    menu: "Press 1 for your account balance. Press 2 for your latest transactions.",
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
    const url = new URL(req.url);
    const host = req.headers.get('host');
    const baseUrl = `https://${host}${url.pathname}`;

    const bodyText = await req.text();
    const params = new URLSearchParams(bodyText);
    const digits = params.get('Digits');

    const step = url.searchParams.get('step') || 'welcome';
    const lang = url.searchParams.get('lang');
    const cardNumber = url.searchParams.get('cardNumber');
    const cardId = url.searchParams.get('cardId');

    const twiml = new VoiceResponse();
    const supabaseAdmin = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');

    switch (step) {
      case 'welcome':
        twiml.gather({ numDigits: 1, action: `${baseUrl}?step=handle_language`, method: 'POST' }, {
          say: { voice: 'alice', language: 'fr-CA', text: translations.fr.welcome }
        });
        twiml.say({ voice: 'alice', language: 'fr-CA' }, "Nous n'avons pas reçu votre sélection. Au revoir.");
        twiml.hangup();
        break;

      case 'handle_language':
        const selectedLang = digits === '1' ? 'fr' : 'en';
        twiml.redirect(`${baseUrl}?step=ask_card&lang=${selectedLang}`);
        break;

      case 'ask_card':
        const t_card = translations[lang];
        twiml.gather({ finishOnKey: '#', action: `${baseUrl}?step=handle_card&lang=${lang}`, method: 'POST' }, {
          say: { voice: t_card.voice, language: t_card.language, text: t_card.askForCard }
        });
        twiml.say({ voice: t_card.voice, language: t_card.language }, t_card.goodbye);
        twiml.hangup();
        break;

      case 'handle_card':
        twiml.redirect(`${baseUrl}?step=ask_pin&lang=${lang}&cardNumber=${digits}`);
        break;

      case 'ask_pin':
        const t_pin = translations[lang];
        twiml.gather({ numDigits: 4, finishOnKey: '#', action: `${baseUrl}?step=handle_pin&lang=${lang}&cardNumber=${cardNumber}`, method: 'POST' }, {
          say: { voice: t_pin.voice, language: t_pin.language, text: t_pin.askForPin }
        });
        twiml.say({ voice: t_pin.voice, language: t_pin.language }, t_pin.goodbye);
        twiml.hangup();
        break;

      case 'handle_pin':
        const t_auth = translations[lang];
        const pin = digits;
        const cardParts = { 
          user_initials: cardNumber.substring(0, 2), 
          issuer_id: cardNumber.substring(2, 8), 
          random_letters: cardNumber.substring(8, 10), 
          unique_identifier: cardNumber.substring(10, 17), 
          check_digit: cardNumber.substring(17, 18) 
        };
        
        const { data: card, error: cardError } = await supabaseAdmin.from('cards').select('id, pin').match(cardParts).single();
        
        if (cardError || !card || !card.pin || !bcrypt.compareSync(pin, card.pin)) {
          twiml.say({ voice: t_auth.voice, language: t_auth.language }, t_auth.authFailed);
          twiml.hangup();
        } else {
          twiml.redirect(`${baseUrl}?step=menu&lang=${lang}&cardId=${card.id}`);
        }
        break;

      case 'menu':
        const t_menu = translations[lang];
        twiml.gather({ numDigits: 1, action: `${baseUrl}?step=handle_menu&lang=${lang}&cardId=${cardId}`, method: 'POST' }, {
          say: { voice: t_menu.voice, language: t_menu.language, text: t_menu.menu }
        });
        twiml.say({ voice: t_menu.voice, language: t_menu.language }, t_menu.goodbye);
        twiml.hangup();
        break;

      case 'handle_menu':
        const t_action = translations[lang];
        if (digits === '1') {
          const { data: debitAccount } = await supabaseAdmin.from('debit_accounts').select('id').eq('card_id', cardId).single();
          const { data: creditAccount } = await supabaseAdmin.from('credit_accounts').select('id').eq('card_id', cardId).single();
          let balanceText = '';
          if (debitAccount) {
            const { data, error } = await supabaseAdmin.rpc('get_debit_account_balance', { p_account_id: debitAccount.id }).single();
            if (error) throw error;
            const [dollars, cents] = data.available_balance.toFixed(2).split('.');
            balanceText = `${t_action.balanceIs} ${dollars} ${t_action.dollars} ${t_action.and} ${cents} ${t_action.cents}.`;
          } else if (creditAccount) {
            const { data, error } = await supabaseAdmin.rpc('get_credit_account_balance', { p_account_id: creditAccount.id }).single();
            if (error) throw error;
            const [dollars, cents] = data.available_credit.toFixed(2).split('.');
            balanceText = `${t_action.availableCreditIs} ${dollars} ${t_action.dollars} ${t_action.and} ${cents} ${t_action.cents}.`;
          }
          twiml.say({ voice: t_action.voice, language: t_action.language }, balanceText);
        } else if (digits === '2') {
          twiml.say({ voice: t_action.voice, language: t_action.language }, t_action.featureNotAvailable);
        } else {
          twiml.say({ voice: t_action.voice, language: t_action.language }, t_action.invalidOption);
        }
        twiml.redirect(`${baseUrl}?step=menu&lang=${lang}&cardId=${cardId}`);
        break;
    }

    return new Response(twiml.toString(), { headers: { ...corsHeaders, 'Content-Type': 'application/xml' } });

  } catch (error) {
    console.error('=== IVR ERROR ===', error);
    const twiml = new VoiceResponse();
    twiml.say({ voice: translations.fr.voice, language: translations.fr.language }, translations.fr.error);
    twiml.hangup();
    return new Response(twiml.toString(), { headers: { ...corsHeaders, 'Content-Type': 'application/xml' }, status: 200 });
  }
});