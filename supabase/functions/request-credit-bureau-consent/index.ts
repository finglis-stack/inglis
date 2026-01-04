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
 
// Helpers pour niveaux R1–R9 et scoring avancé
const ratingOrder = ['R1','R2','R3','R4','R5','R7','R8','R9'];
const worseRating = (a: string, b: string) => (ratingOrder.indexOf(a) >= ratingOrder.indexOf(b) ? a : b);
const addDays = (dateStr: string | Date, days: number) => {
  const d = typeof dateStr === 'string' ? new Date(dateStr) : new Date(dateStr.getTime());
  d.setDate(d.getDate() + days);
  return d.toISOString();
};

async function computeAccountPaymentRating(supabaseAdmin: any, acc: any, programName: string) {
  const { data: statements } = await supabaseAdmin
    .from('statements').select('*')
    .eq('credit_account_id', acc.id)
    .order('statement_period_end', { ascending: false })
    .limit(12);

  const { data: balanceData } = await supabaseAdmin
    .rpc('get_credit_account_balance', { p_account_id: acc.id }).single();
  const current_balance = balanceData?.current_balance || 0;
  const utilization = acc.credit_limit > 0 ? (current_balance / acc.credit_limit) : 0;

  let monthsReviewed = 0, onTime = 0, late = 0, missed = 0;
  let rating = 'R1';

  for (const s of statements || []) {
    monthsReviewed += 1;
    const minPay = Number(s.minimum_payment || 0);

    const { data: payByDue } = await supabaseAdmin
      .from('transactions').select('amount')
      .eq('credit_account_id', acc.id).eq('type', 'payment')
      .gte('created_at', new Date(s.statement_period_start).toISOString())
      .lte('created_at', new Date(s.payment_due_date).toISOString());
    const sumByDue = (payByDue || []).reduce((sum: number, r: any) => sum + Number(r.amount || 0), 0);

    const { data: payLate30 } = await supabaseAdmin
      .from('transactions').select('amount')
      .eq('credit_account_id', acc.id).eq('type', 'payment')
      .gte('created_at', new Date(s.payment_due_date).toISOString())
      .lte('created_at', addDays(s.payment_due_date, 30));
    const { data: payLate60 } = await supabaseAdmin
      .from('transactions').select('amount')
      .eq('credit_account_id', acc.id).eq('type', 'payment')
      .gte('created_at', addDays(s.payment_due_date, 30))
      .lte('created_at', addDays(s.payment_due_date, 60));
    const { data: payLate90 } = await supabaseAdmin
      .from('transactions').select('amount')
      .eq('credit_account_id', acc.id).eq('type', 'payment')
      .gte('created_at', addDays(s.payment_due_date, 60))
      .lte('created_at', addDays(s.payment_due_date, 90));
    const { data: payLate120 } = await supabaseAdmin
      .from('transactions').select('amount')
      .eq('credit_account_id', acc.id).eq('type', 'payment')
      .gte('created_at', addDays(s.payment_due_date, 90))
      .lte('created_at', addDays(s.payment_due_date, 120));

    const sumLate30 = (payLate30 || []).reduce((sum: number, r: any) => sum + Number(r.amount || 0), 0);
    const sumLate60 = sumLate30 + (payLate60 || []).reduce((sum: number, r: any) => sum + Number(r.amount || 0), 0);
    const sumLate90 = sumLate60 + (payLate90 || []).reduce((sum: number, r: any) => sum + Number(r.amount || 0), 0);
    const sumLate120 = sumLate90 + (payLate120 || []).reduce((sum: number, r: any) => sum + Number(r.amount || 0), 0);

    let stmtRating = 'R1';
    if (minPay <= 0) { stmtRating = 'R1'; onTime += 1; }
    else if (sumByDue >= minPay) { stmtRating = 'R1'; onTime += 1; }
    else if (sumLate30 >= minPay) { stmtRating = 'R2'; late += 1; }
    else if (sumLate60 >= minPay) { stmtRating = 'R3'; late += 1; }
    else if (sumLate90 >= minPay) { stmtRating = 'R4'; late += 1; }
    else if (sumLate120 >= minPay) { stmtRating = 'R5'; missed += 1; }
    else { stmtRating = 'R5'; missed += 1; }

    rating = worseRating(rating, stmtRating);
  }

  return {
    account_id: acc.id,
    program_name: programName,
    rating,
    stats: {
      months_reviewed: monthsReviewed,
      on_time: onTime,
      late,
      missed,
      average_utilization: Number(utilization.toFixed(4))
    },
    computed_at: new Date().toISOString()
  };
}

function computeFinalScore(paymentLevels: any[], activeAccounts: number, avgUtilization: number) {
  let score = 700;
  const components: any = { base: 700 };

  const activeBonus = Math.min(activeAccounts * 5, 25);
  score += activeBonus; components.active_accounts = activeBonus;

  let ratingPenalty = 0;
  for (const pl of paymentLevels) {
    const r = pl.rating;
    ratingPenalty += r === 'R1' ? 0 :
                     r === 'R2' ? 20 :
                     r === 'R3' ? 40 :
                     r === 'R4' ? 60 :
                     r === 'R5' ? 90 :
                     r === 'R7' ? 50 :
                     r === 'R8' ? 80 :
                     100;
  }
  score -= ratingPenalty; components.payment_rating_penalty = -ratingPenalty;

  const months = paymentLevels.reduce((sum: number, p: any) => sum + (p.stats?.months_reviewed || 0), 0);
  const onTime = paymentLevels.reduce((sum: number, p: any) => sum + (p.stats?.on_time || 0), 0);
  const late = paymentLevels.reduce((sum: number, p: any) => sum + (p.stats?.late || 0), 0);
  const missed = paymentLevels.reduce((sum: number, p: any) => sum + (p.stats?.missed || 0), 0);

  const onTimeRatio = months ? (onTime / months) : 0;
  const onTimeComponent = Math.round((onTimeRatio - 0.5) * 60);
  score += onTimeComponent; components.on_time_component = onTimeComponent;

  const latePenalty = Math.min(late * 10, 100);
  const missedPenalty = Math.min(missed * 20, 200);
  score -= latePenalty; components.late_penalty = -latePenalty;
  score -= missedPenalty; components.missed_penalty = -missedPenalty;

  let utilComponent = 0;
  if (avgUtilization >= 0.8) utilComponent = -40;
  else if (avgUtilization >= 0.5) utilComponent = -20;
  else if (avgUtilization >= 0.3) utilComponent = -10;
  else utilComponent = +10;
  score += utilComponent; components.utilization_component = utilComponent;

  // Momentum récent (pondération) pour refléter une tendance “turfu”
  const trendBoost = Math.round(onTimeRatio * 20);
  score += trendBoost; components.trend_boost = trendBoost;

  score = Math.max(300, Math.min(900, score));
  return { score, components, months, onTime, late, missed, onTimeRatio };
};

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

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, legal_name, type, email, phone, sin, address, credit_bureau_auto_consent')
      .eq('id', profile_id)
      .eq('institution_id', institution.id)
      .single();
    if (profileError || !profile) throw new Error("Profil non trouvé ou accès refusé.");
    if (!profile.email) throw new Error("Le profil n'a pas d'adresse e-mail.");

    // Si l’auto-consentement est actif, on synchronise immédiatement avec niveaux R1–R9 et score avancé
    if (profile.credit_bureau_auto_consent) {
      if (!profile.sin) throw new Error("Aucun NAS associé au profil.");
      if (profile.sin.startsWith('$2')) throw new Error("Format de NAS obsolète. Recréez le profil utilisateur.");

      const { data: creditAccounts, error: creditError } = await supabaseAdmin
        .from('credit_accounts')
        .select('*, cards(*, card_programs(program_name))')
        .eq('profile_id', profile.id)
        .neq('status', 'closed');

      const { data: debitAccounts, error: debitError } = await supabaseAdmin
        .from('debit_accounts')
        .select('*, cards(*, card_programs(program_name))')
        .eq('profile_id', profile.id)
        .neq('status', 'closed');

      if (creditError || debitError) throw new Error("Erreur lors de la récupération des comptes.");

      const newHistoryEntries: any[] = [];
      const currencyFormatter = new Intl.NumberFormat('fr-CA', { style: 'currency', currency: 'CAD' });
      const dateStr = new Date().toISOString().split('T')[0];

      // Calcul des niveaux de paiement pour chaque compte de crédit
      const paymentLevels: any[] = [];
      let utilSum = 0, utilCount = 0;

      if (creditAccounts) {
        for (const acc of creditAccounts) {
          const { data: balanceData } = await supabaseAdmin.rpc('get_credit_account_balance', { p_account_id: acc.id }).single();
          const current_balance = balanceData?.current_balance || 0;
          const debtRatio = acc.credit_limit > 0 ? (current_balance / acc.credit_limit) * 100 : 0;
          const programName = acc.cards?.card_programs?.program_name || 'Carte de Crédit';

          const pl = await computeAccountPaymentRating(supabaseAdmin, acc, programName);
          paymentLevels.push(pl);
          utilSum += (pl.stats?.average_utilization || 0); utilCount += 1;

          newHistoryEntries.push({
            date: dateStr,
            type: programName,
            details: `Émetteur: ${institution.name}, Solde: ${currencyFormatter.format(current_balance)}, Limite: ${currencyFormatter.format(acc.credit_limit)}, Ratio: ${debtRatio.toFixed(1)}%, Niveau de paiement: ${pl.rating}`,
            status: acc.status === 'active' ? 'Active' : 'Review'
          });
        }
      }

      // Comptes de débit (historisation)
      if (debitAccounts) {
        for (const acc of debitAccounts) {
          const { data: balanceData } = await supabaseAdmin.rpc('get_debit_account_balance', { p_account_id: acc.id }).single();
          const current_balance = balanceData?.current_balance || 0;
          const programName = acc.cards?.card_programs?.program_name || 'Carte de Débit';
          newHistoryEntries.push({
            date: dateStr,
            type: programName,
            details: `Émetteur: ${institution.name}, Solde: ${currencyFormatter.format(current_balance)}`,
            status: acc.status === 'active' ? 'Active' : 'Inactive'
          });
        }
      }

      // Dossier de crédit
      const { data: existingReport, error: fetchError } = await supabaseAdmin
        .from('credit_reports')
        .select('id, credit_history')
        .eq('ssn', profile.sin)
        .maybeSingle();
      if (fetchError) throw fetchError;

      const addressToStore = profile.address && profile.address.encrypted ? profile.address : null;

      let reportId = existingReport?.id;
      if (!existingReport) {
        const { data: created, error: createError } = await supabaseAdmin
          .from('credit_reports')
          .insert({
            full_name: profile.full_name || profile.legal_name || 'Client',
            ssn: profile.sin,
            address: addressToStore,
            phone_number: profile.phone || null,
            email: profile.email || null,
            credit_history: [],
            credit_score: 700,
            payment_levels: [],
            credit_metrics: {}
          })
          .select('id')
          .single();
        if (createError) throw createError;
        reportId = created.id;
      }

      // Fusion d'historique (anti-doublon)
      const previousHistory = existingReport?.credit_history || [];
      const filteredHistory = previousHistory.filter((entry: any) =>
        !(entry.date === dateStr && entry.details.includes(`Émetteur: ${institution.name}`))
      );
      const updatedHistory = [...newHistoryEntries, ...filteredHistory];
      updatedHistory.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());

      // Agrégats métriques et score
      const activeCredits = (creditAccounts || []).filter((a: any) => a.status === 'active').length;
      const avgUtilization = utilCount ? (utilSum / utilCount) : 0;
      const scorePack = computeFinalScore(paymentLevels, activeCredits, avgUtilization);

      const creditMetrics = {
        active_accounts: activeCredits,
        payments: {
          months_reviewed: scorePack.months,
          on_time: scorePack.onTime,
          late: scorePack.late,
          missed: scorePack.missed,
          on_time_ratio: Number(scorePack.onTimeRatio.toFixed(4))
        },
        utilization_ratio: Number(avgUtilization.toFixed(4)),
        score_components: scorePack.components,
        final_score: scorePack.score
      };

      const { error: updateErrorReport } = await supabaseAdmin
        .from('credit_reports')
        .update({
          credit_history: updatedHistory,
          updated_at: new Date().toISOString(),
          full_name: profile.full_name || profile.legal_name || 'Client',
          email: profile.email || null,
          phone_number: profile.phone || null,
          payment_levels: paymentLevels,
          credit_metrics: creditMetrics,
          credit_score: creditMetrics.final_score
        })
        .eq('id', reportId);
      if (updateErrorReport) throw updateErrorReport;

      return new Response(JSON.stringify({ message: "Synchronisation automatique effectuée (sans e-mail)." }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // Sinon: flux normal – créer un token et envoyer l’e-mail de consentement
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