// @ts-nocheck
import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const getEmailHtml = (details) => {
  return `
  <!DOCTYPE html>
  <html lang="fr">
  <head>
    <meta charset="UTF-8">
    <title>Réinitialisation de votre NIP</title>
    <style>
      body { font-family: sans-serif; margin: 0; padding: 0; background-color: #f4f4f4; }
      .container { max-width: 600px; margin: 20px auto; background-color: #ffffff; padding: 20px; border-radius: 8px; }
      .header { text-align: center; padding-bottom: 20px; border-bottom: 1px solid #dddddd; }
      .content { padding: 20px 0; }
      .button { display: inline-block; background-color: #000000; color: #ffffff !important; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold; }
      .footer { text-align: center; font-size: 12px; color: #777777; padding-top: 20px; border-top: 1px solid #dddddd; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h2>Réinitialisation de votre NIP</h2>
      </div>
      <div class="content">
        <p>Bonjour ${details.profileName},</p>
        <p>Une demande de réinitialisation de NIP a été effectuée pour votre ${details.resetType}.</p>
        ${details.cardInfo ? `<p><strong>Carte concernée :</strong> ${details.cardInfo}</p>` : ''}
        <p>Veuillez cliquer sur le bouton ci-dessous pour choisir un nouveau NIP. Ce lien est valide pour les 24 prochaines heures.</p>
        <p style="text-align: center; margin: 30px 0;">
          <a href="${details.pinSetupLink}" class="button" style="color: #ffffff !important;">Choisir un nouveau NIP</a>
        </p>
        <p>Si vous n'avez pas demandé cette réinitialisation, vous pouvez ignorer cet e-mail en toute sécurité.</p>
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
    const { profile_id, card_id } = await req.json();
    if (!profile_id) throw new Error("L'ID du profil est requis.");

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
    if (!institution) throw new Error("Institution non trouvée pour l'utilisateur.");

    const { data: profile, error: profileError } = await supabaseAdmin.from('profiles').select('id, full_name, legal_name, type, email').eq('id', profile_id).eq('institution_id', institution.id).single();
    if (profileError || !profile) throw new Error("Profil non trouvé ou accès refusé.");
    if (!profile.email) throw new Error("Le profil n'a pas d'adresse e-mail pour envoyer la réinitialisation.");

    const pinSetupToken = crypto.randomUUID();
    const tokenExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    
    let emailDetails = {
      profileName: profile.type === 'personal' ? profile.full_name : profile.legal_name,
      resetType: '',
      cardInfo: '',
      pinSetupLink: '',
    };

    if (card_id) {
      // Réinitialisation du NIP de la carte
      const { data: card, error: cardError } = await supabaseAdmin.from('cards').select('*').eq('id', card_id).eq('profile_id', profile_id).single();
      if (cardError || !card) throw new Error("Carte non trouvée ou n'appartient pas à ce profil.");

      const { error: updateError } = await supabaseAdmin.from('cards').update({ pin_setup_token: pinSetupToken, pin_setup_token_expires_at: tokenExpiresAt }).eq('id', card_id);
      if (updateError) throw updateError;

      emailDetails.resetType = 'carte';
      emailDetails.cardInfo = `${card.user_initials} **** **** **** ${card.unique_identifier.slice(-3)}${card.check_digit}`;
      emailDetails.pinSetupLink = `https://www.inglisdominion.ca/set-card-pin/${pinSetupToken}`;

    } else {
      // Réinitialisation du NIP du profil
      const { error: updateError } = await supabaseAdmin.from('profiles').update({ pin_setup_token: pinSetupToken, pin_setup_token_expires_at: tokenExpiresAt }).eq('id', profile_id);
      if (updateError) throw updateError;

      emailDetails.resetType = 'compte';
      emailDetails.pinSetupLink = `https://www.inglisdominion.ca/set-profile-pin/${pinSetupToken}`;
    }

    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    const fromEmail = Deno.env.get('RESEND_FROM_EMAIL') || 'Inglis Dominium <onboarding@resend.dev>';
    
    if (RESEND_API_KEY) {
      const emailHtml = getEmailHtml(emailDetails);
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${RESEND_API_KEY}` },
        body: JSON.stringify({
          from: fromEmail,
          to: [profile.email],
          subject: "Réinitialisation de votre NIP Inglis Dominium",
          html: emailHtml,
        }),
      });
      if (!res.ok) {
        const errorBody = await res.json();
        console.error("Échec de l'envoi de l'e-mail:", errorBody);
        throw new Error("Le service de messagerie n'a pas pu envoyer l'e-mail.");
      }
    } else {
      console.warn("RESEND_API_KEY non défini. E-mail non envoyé.");
    }

    return new Response(JSON.stringify({ message: "E-mail de réinitialisation envoyé avec succès." }), {
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