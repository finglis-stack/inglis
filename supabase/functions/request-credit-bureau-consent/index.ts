// @ts-nocheck
import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const getEmailHtml = (details) => `
<!DOCTYPE html>
<html>
<head>
<style>
  body { font-family: Arial, sans-serif; background-color: #f4f4f4; color: #333; }
  .container { max-width: 600px; margin: 20px auto; background-color: #fff; padding: 20px; border-radius: 8px; }
  .header { text-align: center; border-bottom: 1px solid #ddd; padding-bottom: 10px; }
  .content { margin-top: 20px; }
  .button { display: inline-block; background-color: #000; color: #fff !important; padding: 12px 25px; border-radius: 5px; text-decoration: none; font-weight: bold; }
  .footer { margin-top: 20px; font-size: 12px; text-align: center; color: #888; }
</style>
</head>
<body>
  <div class="container">
    <div class="header"><h2>Demande d'autorisation de partage de données</h2></div>
    <div class="content">
      <p>Bonjour ${details.profileName},</p>
      <p>L'institution financière <strong>${details.institutionName}</strong> souhaite mettre à jour votre dossier de crédit avec vos informations de compte les plus récentes.</p>
      <p>Pour autoriser cette action, veuillez cliquer sur le bouton ci-dessous. Ce lien est sécurisé et expirera dans 24 heures.</p>
      <p style="text-align: center; margin: 30px 0;">
        <a href="${details.consentLink}" class="button" style="color: #fff !important;">Réviser et autoriser</a>
      </p>
      <p>Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer cet e-mail en toute sécurité.</p>
    </div>
    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} Inglis Dominion. Tous droits réservés.</p>
    </div>
  </div>
</body>
</html>
`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { profile_id } = await req.json();
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

    const { data: institution } = await supabaseAdmin.from('institutions').select('id, name').eq('user_id', user.id).single();
    if (!institution) throw new Error("Institution non trouvée pour l'utilisateur.");

    const { data: profile, error: profileError } = await supabaseAdmin.from('profiles').select('id, full_name, legal_name, type, email').eq('id', profile_id).eq('institution_id', institution.id).single();
    if (profileError || !profile) throw new Error("Profil non trouvé ou accès refusé.");
    if (!profile.email) throw new Error("Le profil n'a pas d'adresse e-mail.");

    const consentToken = crypto.randomUUID();
    const tokenExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    const { error: updateError } = await supabaseAdmin.from('profiles').update({
      credit_bureau_consent_token: consentToken,
      credit_bureau_consent_token_expires_at: tokenExpiresAt
    }).eq('id', profile_id);
    if (updateError) throw updateError;

    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    const fromEmail = Deno.env.get('RESEND_FROM_EMAIL') || 'Inglis Dominion <onboarding@resend.dev>';
    
    if (RESEND_API_KEY) {
      const emailHtml = getEmailHtml({
        profileName: profile.type === 'personal' ? profile.full_name : profile.legal_name,
        institutionName: institution.name,
        consentLink: `https://www.inglisdominion.ca/confirm-credit-consent/${consentToken}`
      });
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${RESEND_API_KEY}` },
        body: JSON.stringify({
          from: fromEmail,
          to: [profile.email],
          subject: `Action requise : Autorisation de partage de données avec ${institution.name}`,
          html: emailHtml,
        }),
      });
    }

    return new Response(JSON.stringify({ message: "E-mail de consentement envoyé." }), {
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