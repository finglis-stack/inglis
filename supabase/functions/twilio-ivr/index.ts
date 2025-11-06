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
  redirect(url) {
    this.body.push(`<Redirect method="POST">${url}</Redirect>`);
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
    welcome: "Pour le service en français, appuyez sur 1. For service in English, press 2.",
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
    welcome: "For service in English, press 2. Pour le service en français, appuyez sur 1.",
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
    const url = new URL(req.url);
    const bodyText = await req.text();
    const params = new URLSearchParams(bodyText);
    const digits = params.get('Digits');
    const lang = url.searchParams.get('lang');
    const cardNumber = url.searchParams.get('cardNumber');
    const cardId = url.searchParams.get('cardId');
    
    console.log('=== IVR REQUEST ===');
    console.log('URL:', url.toString());
    console.log('Digits:', digits);
    console.log('Lang:', lang);
    console.log('CardNumber:', cardNumber);
    console.log('CardId:', cardId);
    console.log('Body:', bodyText);
    
    const twiml = new VoiceResponse();

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Étape 1: Sélection de la langue
    if (!lang) {
      console.log('STEP: Language selection');
      if (digits) {
        const selectedLang = digits === '1' ? 'fr' : 'en';
        console.log('Language selected:', selectedLang);
        const t = translations[selectedLang];
        twiml.gather({ finishOnKey: '#', action: `${url.origin}${url.pathname}?lang=${selectedLang}`, method: 'POST' }, {
          say: { voice: t.voice, language: t.language, text: t.askForCard }
        });
        twiml.hangup();
      } else {
        console.log('Asking for language');
        twiml.gather({ numDigits: 1, action: `${url.origin}${url.pathname}`, method: 'POST' }, {
          say: { voice: 'alice', language: 'fr-CA', text: translations.fr.welcome }
        });
        twiml.say({ voice: 'alice', language: 'fr-CA' }, "Nous n'avons pas reçu votre sélection. Au revoir.");
        twiml.hangup();
      }
    }
    // Étape 2: Authentification
    else if (!cardId) {
      console.log('STEP: Authentication');
      const t = translations[lang];
      
      if (!cardNumber && digits) {
        // L'utilisateur vient d'entrer le numéro de carte
        console.log('Card number entered:', digits);
        twiml.gather({ numDigits: 4, finishOnKey: '#', action: `${url.origin}${url.pathname}?lang=${lang}&cardNumber=${digits}`, method: 'POST' }, {
          say: { voice: t.voice, language: t.language, text: t.askForPin }
        });
        twiml.hangup();
      } else if (cardNumber && digits) {
        // L'utilisateur vient d'entrer le NIP
        console.log('PIN entered, validating...');
        const pin = digits;
        const cardParts = { 
          user_initials: cardNumber.substring(0, 2), 
          issuer_id: cardNumber.substring(2, 8), 
          random_letters: cardNumber.substring(8, 10), 
          unique_identifier: cardNumber.substring(10, 17), 
          check_digit: cardNumber.substring(17, 18) 
        };
        console.log('Card parts:', cardParts);
        
        const { data: card, error: cardError } = await supabaseAdmin.from('cards').select('id, pin').match(cardParts).single();
        console.log('Card lookup result:', { card: card?.id, error: cardError });
        
        if (cardError || !card || !card.pin || !bcrypt.compareSync(pin, card.pin)) {
          console.log('Authentication failed');
          twiml.say({ voice: t.voice, language: t.language }, t.authFailed);
          twiml.hangup();
        } else {
          console.log('Authentication successful, redirecting to menu');
          twiml.redirect(`${url.origin}${url.pathname}?lang=${lang}&cardId=${card.id}`);
        }
      } else if (!cardNumber) {
        // On demande le numéro de carte
        console.log('Asking for card number');
        twiml.gather({ finishOnKey: '#', action: `${url.origin}${url.pathname}?lang=${lang}`, method: 'POST' }, {
          say: { voice: t.voice, language: t.language, text: t.askForCard }
        });
        twiml.hangup();
      } else {
        // On demande le NIP
        console.log('Asking for PIN');
        twiml.gather({ numDigits: 4, finishOnKey: '#', action: `${url.origin}${url.pathname}?lang=${lang}&cardNumber=${cardNumber}`, method: 'POST' }, {
          say: { voice: t.voice, language: t.language, text: t.askForPin }
        });
        twiml.hangup();
      }
    }
    // Étape 3: Menu principal
    else {
      console.log('STEP: Main menu');
      const t = translations[lang];
      
      if (digits) {
        console.log('Menu option selected:', digits);
        switch (digits) {
          case '1':
            console.log('Getting balance...');
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
            console.log('Balance text:', balanceText);
            twiml.say({ voice: t.voice, language: t.language }, balanceText);
            break;
          case '2':
            twiml.say({ voice: t.voice, language: t.language }, t.featureNotAvailable);
            break;
          default:
            twiml.say({ voice: t.voice, language: t.language }, t.invalidOption);
            break;
        }
        twiml.redirect(`${url.origin}${url.pathname}?lang=${lang}&cardId=${cardId}`);
      } else {
        console.log('Presenting main menu');
        twiml.gather({ numDigits: 1, action: `${url.origin}${url.pathname}?lang=${lang}&cardId=${cardId}`, method: 'POST' }, {
          say: { voice: t.voice, language: t.language, text: t.menu }
        });
        twiml.hangup();
      }
    }

    const response = twiml.toString();
    console.log('=== RESPONSE TwiML ===');
    console.log(response);
    
    return new Response(response, { headers: { ...corsHeaders, 'Content-Type': 'application/xml' } });
  } catch (error) {
    console.error('=== IVR ERROR ===');
    console.error('Error:', error);
    console.error('Stack:', error.stack);
    const twiml = new VoiceResponse();
    twiml.say({ voice: translations.fr.voice, language: translations.fr.language }, translations.fr.error);
    twiml.hangup();
    return new Response(twiml.toString(), { headers: { ...corsHeaders, 'Content-Type': 'application/xml' }, status: 200 });
  }
});