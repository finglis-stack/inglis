import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const getEmailHtml = (details: { institutionName: string; profileName: string; statementPeriod: string; viewLink: string; expires: string; }) => `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Relevé sécurisé - ${details.institutionName}</title>
  <style>
    body { font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; margin: 0; padding: 0; background-color: #f4f5f7; color: #111827; }
    .container { max-width: 700px; margin: 20px auto; background-color: #ffffff; padding: 24px; border-radius: 10px; border: 1px solid #e5e7eb; }
    .header { text-align: center; padding-bottom: 18px; border-bottom: 1px solid #e5e7eb; }
    .title { font-size: 20px; font-weight: 700; }
    .content { padding: 18px 0; line-height: 1.6; }
    .btn { display: inline-block; background-color: #111827; color: #ffffff !important; padding: 12px 20px; border-radius: 6px; text-decoration: none; font-weight: 600; }
    .note { font-size: 12px; color: #6b7280; margin-top: 16px; }
    .footer { text-align: center; font-size: 12px; color: #6b7280; padding-top: 18px; border-top: 1px solid #e5e7eb; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="title">${details.institutionName} — Relevé sécurisé</div>
    </div>
    <div class="content">
      <p>Bonjour ${details.profileName},</p>
      <p>Votre relevé (${details.statementPeriod}) est disponible. Pour le consulter, veuillez accéder à votre mini tableau de bord sécurisé et entrer votre NIP de profil.</p>
      <p style="text-align:center; margin: 24px 0;">
        <a href="${details.viewLink}" class="btn">Consulter le relevé sécurisé</a>
      </p>
      <p class="note">Ce lien expirera le ${details.expires}. Ne partagez jamais votre NIP et ne l’entrez que sur des pages sécurisées (${details.institutionName}).</p>
    </div>
    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} ${details.institutionName}. Tous droits réservés.</p>
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
    const authHeader = req.headers.get('Authorization') || ''
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) throw new Error('Utilisateur non authentifié.')

    const { statement_id } = await req.json()
    if (!statement_id) throw new Error('statement_id requis.')

    const admin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Institution de l’utilisateur
    const { data: institution } = await admin
      .from('institutions')
      .select('id, name')
      .eq('user_id', user.id)
      .single()
    if (!institution) throw new Error("Institution introuvable.")

    // Charger relevé + profil associé via le compte de crédit
    const { data: statement } = await admin
      .from('statements')
      .select('id, statement_period_start, statement_period_end, credit_account_id')
      .eq('id', statement_id)
      .single()
    if (!statement) throw new Error("Relevé introuvable.")

    const { data: account } = await admin
      .from('credit_accounts')
      .select('id, profile_id, card_id')
      .eq('id', statement.credit_account_id)
      .single()
    if (!account) throw new Error("Compte de crédit introuvable.")

    const { data: profile } = await admin
      .from('profiles')
      .select('id, type, full_name, legal_name, email, institution_id')
      .eq('id', account.profile_id)
      .single()
    if (!profile || profile.institution_id !== institution.id) throw new Error("Accès refusé.")

    if (!profile.email) throw new Error("Aucune adresse e-mail pour le profil.")

    // Générer token et enregistrer lien d’accès
    const token = crypto.randomUUID()
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 jours
    const { error: insertError } = await admin
      .from('statement_access_links')
      .insert({
        token,
        statement_id: statement.id,
        profile_id: profile.id,
        expires_at: expiresAt.toISOString()
      })
    if (insertError) throw insertError

    // Lien public
    const publicLink = `https://www.inglisdominion.ca/statement/${token}`

    // Email via Resend
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
    const fromEmail = Deno.env.get('RESEND_FROM_EMAIL') || `${institution.name} <no-reply@resend.dev>`

    if (RESEND_API_KEY) {
      const period = `${new Date(statement.statement_period_start).toLocaleDateString('fr-CA')} au ${new Date(statement.statement_period_end).toLocaleDateString('fr-CA')}`
      const emailHtml = getEmailHtml({
        institutionName: institution.name,
        profileName: profile.type === 'personal' ? (profile.full_name ?? 'Client') : (profile.legal_name ?? 'Client'),
        statementPeriod: period,
        viewLink: publicLink,
        expires: expiresAt.toLocaleDateString('fr-CA')
      })

      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${RESEND_API_KEY}` },
        body: JSON.stringify({
          from: fromEmail,
          to: [profile.email],
          subject: `${institution.name} — Accès sécurisé à votre relevé`,
          html: emailHtml,
        }),
      })
      if (!res.ok) {
        const body = await res.text()
        console.error('Resend error:', body)
        throw new Error('Échec d’envoi de l’e-mail de relevé.')
      }
    } else {
      console.warn("RESEND_API_KEY non défini — e-mail non envoyé.")
    }

    return new Response(JSON.stringify({ success: true, link: publicLink }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})