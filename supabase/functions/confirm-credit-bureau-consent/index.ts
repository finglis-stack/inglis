import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Classement des ratings (du mieux au pire)
const ratingOrder = ['R1','R2','R3','R4','R5','R7','R8','R9'] as const
type Rating = typeof ratingOrder[number]

function worseRating(a: Rating, b: Rating): Rating {
  return ratingOrder.indexOf(a) >= ratingOrder.indexOf(b) ? a : b
}

function addDays(dateStr: string | Date, days: number) {
  const d = typeof dateStr === 'string' ? new Date(dateStr) : new Date(dateStr.getTime())
  d.setDate(d.getDate() + days)
  return d.toISOString()
}

async function computeAccountPaymentRating(supabaseAdmin: any, acc: any, programName: string) {
  // Derniers 12 relevés
  const { data: statements } = await supabaseAdmin
    .from('statements')
    .select('*')
    .eq('credit_account_id', acc.id)
    .order('statement_period_end', { ascending: false })
    .limit(12)

  // Solde/limite pour l’utilisation
  const { data: balanceData } = await supabaseAdmin
    .rpc('get_credit_account_balance', { p_account_id: acc.id })
    .single()
  const current_balance = balanceData?.current_balance || 0
  const utilization = acc.credit_limit > 0 ? (current_balance / acc.credit_limit) : 0

  let monthsReviewed = 0
  let onTime = 0
  let late = 0
  let missed = 0
  let rating: Rating = 'R1'

  for (const s of statements || []) {
    monthsReviewed += 1
    const minPay = Number(s.minimum_payment || 0)

    // Paiements jusqu’à l’échéance
    const { data: payByDue } = await supabaseAdmin
      .from('transactions')
      .select('amount, created_at')
      .eq('credit_account_id', acc.id)
      .eq('type', 'payment')
      .gte('created_at', new Date(s.statement_period_start).toISOString())
      .lte('created_at', new Date(s.payment_due_date).toISOString())

    const sumByDue = (payByDue || []).reduce((sum: number, r: any) => sum + Number(r.amount || 0), 0)

    // Paiements en retard par tranches (30/60/90/120 jours)
    const { data: payLate30 } = await supabaseAdmin
      .from('transactions')
      .select('amount, created_at')
      .eq('credit_account_id', acc.id)
      .eq('type', 'payment')
      .gte('created_at', new Date(s.payment_due_date).toISOString())
      .lte('created_at', addDays(s.payment_due_date, 30))

    const { data: payLate60 } = await supabaseAdmin
      .from('transactions')
      .select('amount, created_at')
      .eq('credit_account_id', acc.id)
      .eq('type', 'payment')
      .gte('created_at', addDays(s.payment_due_date, 30))
      .lte('created_at', addDays(s.payment_due_date, 60))

    const { data: payLate90 } = await supabaseAdmin
      .from('transactions')
      .select('amount, created_at')
      .eq('credit_account_id', acc.id)
      .eq('type', 'payment')
      .gte('created_at', addDays(s.payment_due_date, 60))
      .lte('created_at', addDays(s.payment_due_date, 90))

    const { data: payLate120 } = await supabaseAdmin
      .from('transactions')
      .select('amount, created_at')
      .eq('credit_account_id', acc.id)
      .eq('type', 'payment')
      .gte('created_at', addDays(s.payment_due_date, 90))
      .lte('created_at', addDays(s.payment_due_date, 120))

    const sumLate30 = (payLate30 || []).reduce((sum: number, r: any) => sum + Number(r.amount || 0), 0)
    const sumLate60 = sumLate30 + (payLate60 || []).reduce((sum: number, r: any) => sum + Number(r.amount || 0), 0)
    const sumLate90 = sumLate60 + (payLate90 || []).reduce((sum: number, r: any) => sum + Number(r.amount || 0), 0)
    const sumLate120 = sumLate90 + (payLate120 || []).reduce((sum: number, r: any) => sum + Number(r.amount || 0), 0)

    let stmtRating: Rating = 'R1'
    if (minPay <= 0) {
      stmtRating = 'R1'
      onTime += 1
    } else if (sumByDue >= minPay) {
      stmtRating = 'R1'
      onTime += 1
    } else if (sumLate30 >= minPay) {
      stmtRating = 'R2'
      late += 1
    } else if (sumLate60 >= minPay) {
      stmtRating = 'R3'
      late += 1
    } else if (sumLate90 >= minPay) {
      stmtRating = 'R4'
      late += 1
    } else if (sumLate120 >= minPay) {
      stmtRating = 'R5'
      missed += 1
    } else {
      stmtRating = 'R5'
      missed += 1
    }

    rating = worseRating(rating, stmtRating)
  }

  // Détection “rafale court-terme vs long-terme”
  const recent = Math.min(monthsReviewed, 3)
  const previous = Math.max(0, monthsReviewed - recent)
  let recentOnTime = 0
  let previousOnTime = 0
  if ((statements || []).length > 0) {
    const last3 = (statements || []).slice(0, recent)
    const prev9 = (statements || []).slice(recent, recent + previous)
    for (const s of last3) {
      const minPay = Number(s.minimum_payment || 0)
      const { data: payByDue } = await supabaseAdmin
        .from('transactions').select('amount')
        .eq('credit_account_id', acc.id).eq('type', 'payment')
        .gte('created_at', new Date(s.statement_period_start).toISOString())
        .lte('created_at', new Date(s.payment_due_date).toISOString())
      const sumByDue = (payByDue || []).reduce((sum: number, r: any) => sum + Number(r.amount || 0), 0)
      if (minPay <= 0 || sumByDue >= minPay) recentOnTime += 1
    }
    for (const s of prev9) {
      const minPay = Number(s.minimum_payment || 0)
      const { data: payByDue } = await supabaseAdmin
        .from('transactions').select('amount')
        .eq('credit_account_id', acc.id).eq('type', 'payment')
        .gte('created_at', new Date(s.statement_period_start).toISOString())
        .lte('created_at', new Date(s.payment_due_date).toISOString())
      const sumByDue = (payByDue || []).reduce((sum: number, r: any) => sum + Number(r.amount || 0), 0)
      if (minPay <= 0 || sumByDue >= minPay) previousOnTime += 1
    }
  }

  const nowIso = new Date().toISOString()
  return {
    account_id: acc.id,
    program_name: programName,
    rating,
    stats: {
      months_reviewed: monthsReviewed,
      on_time: onTime,
      late,
      missed,
      average_utilization: Number(utilization.toFixed(4)),
      recent_on_time_ratio: monthsReviewed ? Number((recentOnTime / Math.max(recent, 1)).toFixed(4)) : 0,
      previous_on_time_ratio: monthsReviewed ? Number((previousOnTime / Math.max(previous, 1)).toFixed(4)) : 0,
    },
    computed_at: nowIso
  }
}

function computeFinalScore(paymentLevels: any[], activeAccounts: number, avgUtilization: number) {
  let score = 700
  const components: any = { base: 700 }

  // Bonus comptes actifs (limité)
  const activeBonus = Math.min(activeAccounts * 5, 25)
  score += activeBonus; components.active_accounts = activeBonus

  // Pénalité par pire rating par compte
  let ratingPenalty = 0
  for (const pl of paymentLevels) {
    const r: Rating = pl.rating
    ratingPenalty += r === 'R1' ? 0 :
                     r === 'R2' ? 20 :
                     r === 'R3' ? 40 :
                     r === 'R4' ? 60 :
                     r === 'R5' ? 90 :
                     r === 'R7' ? 50 :
                     r === 'R8' ? 80 :
                     100
  }
  score -= ratingPenalty; components.payment_rating_penalty = -ratingPenalty

  // Agrégat paiements
  const months = paymentLevels.reduce((sum, p) => sum + (p.stats?.months_reviewed || 0), 0)
  const onTime = paymentLevels.reduce((sum, p) => sum + (p.stats?.on_time || 0), 0)
  const late = paymentLevels.reduce((sum, p) => sum + (p.stats?.late || 0), 0)
  const missed = paymentLevels.reduce((sum, p) => sum + (p.stats?.missed || 0), 0)

  const onTimeRatio = months ? (onTime / months) : 0
  const onTimeComponent = Math.round((onTimeRatio - 0.5) * 60) // ±30 si 100% ou 0%
  score += onTimeComponent; components.on_time_component = onTimeComponent

  const latePenalty = Math.min(late * 10, 100)
  const missedPenalty = Math.min(missed * 20, 200)
  score -= latePenalty; components.late_penalty = -latePenalty
  score -= missedPenalty; components.missed_penalty = -missedPenalty

  // Utilisation moyenne
  let utilComponent = 0
  if (avgUtilization >= 0.8) utilComponent = -40
  else if (avgUtilization >= 0.5) utilComponent = -20
  else if (avgUtilization >= 0.3) utilComponent = -10
  else utilComponent = +10
  score += utilComponent; components.utilization_component = utilComponent

  // “Rafale” court-terme vs long-terme (si sur 3 mois tout à temps mais sur le long terme faible)
  const recent = paymentLevels.reduce((sum, p) => sum + (p.stats?.recent_on_time_ratio || 0), 0) / Math.max(paymentLevels.length, 1)
  const previous = paymentLevels.reduce((sum, p) => sum + (p.stats?.previous_on_time_ratio || 0), 0) / Math.max(paymentLevels.length, 1)
  let burstPenalty = 0
  if (recent >= 0.9 && previous <= 0.6) burstPenalty = 15
  score -= burstPenalty; components.burst_penalty = -burstPenalty

  // Bornes
  score = Math.max(300, Math.min(900, score))
  return { score, components, months, onTime, late, missed, onTimeRatio, recentAvg: recent, previousAvg: previous }
}

async function pushDataToCreditBureau(supabaseAdmin: any, profile: any, institutionName: string) {
  console.log(`[CreditPush] Starting push for profile ${profile.id}`);

  if (!profile.sin) {
    console.error(`[CreditPush] Profile has no SIN. Aborting.`);
    return { success: false, error: "Aucun NAS associé au profil." };
  }
  if (profile.sin.startsWith('$2')) {
    console.error(`[CreditPush] Legacy Bcrypt SIN detected. Cannot match with Credit Bureau Index.`);
    return { success: false, error: "Format de données obsolète. Veuillez recréer le profil utilisateur." };
  }

  // Récupérer les comptes
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

  if (creditError || debitError) {
    console.error(`[CreditPush] DB Error fetching accounts:`, creditError || debitError);
    throw new Error("Erreur lors de la récupération des comptes.");
  }

  console.log(`[CreditPush] Found ${creditAccounts?.length || 0} credit accounts and ${debitAccounts?.length || 0} debit accounts.`);

  const newHistoryEntries: any[] = [];
  const currencyFormatter = new Intl.NumberFormat('fr-CA', { style: 'currency', currency: 'CAD' });
  const dateStr = new Date().toISOString().split('T')[0];

  // Comptes de crédit: historisation + rating
  const paymentLevels: any[] = []
  let utilizationSum = 0
  let utilCount = 0

  if (creditAccounts) {
    for (const acc of creditAccounts) {
      const { data: balanceData } = await supabaseAdmin.rpc('get_credit_account_balance', { p_account_id: acc.id }).single();
      const current_balance = balanceData?.current_balance || 0;
      const debtRatio = acc.credit_limit > 0 ? (current_balance / acc.credit_limit) * 100 : 0;
      const programName = acc.cards?.card_programs?.program_name || 'Carte de Crédit';

      // Rating R1–R9 + métriques par compte
      const pl = await computeAccountPaymentRating(supabaseAdmin, acc, programName)
      paymentLevels.push(pl)
      utilizationSum += pl.stats.average_utilization; utilCount += 1

      newHistoryEntries.push({
        date: dateStr,
        type: programName,
        details: `Émetteur: ${institutionName}, Solde: ${currencyFormatter.format(current_balance)}, Limite: ${currencyFormatter.format(acc.credit_limit)}, Ratio: ${debtRatio.toFixed(1)}%, Niveau de paiement: ${pl.rating}`,
        status: acc.status === 'active' ? 'Active' : 'Review'
      });
    }
  }

  // Comptes de débit: historisation (pas de rating R*)
  if (debitAccounts) {
    for (const acc of debitAccounts) {
      const { data: balanceData } = await supabaseAdmin.rpc('get_debit_account_balance', { p_account_id: acc.id }).single();
      const current_balance = balanceData?.current_balance || 0;
      const programName = acc.cards?.card_programs?.program_name || 'Carte de Débit';

      newHistoryEntries.push({
        date: dateStr,
        type: programName,
        details: `Émetteur: ${institutionName}, Solde: ${currencyFormatter.format(current_balance)}`,
        status: acc.status === 'active' ? 'Active' : 'Inactive'
      });
    }
  }

  // Dossier de crédit existant
  const { data: existingReport, error: fetchError } = await supabaseAdmin
    .from('credit_reports')
    .select('id, credit_history, credit_score, payment_levels, credit_metrics')
    .eq('ssn', profile.sin)
    .maybeSingle();

  if (fetchError) {
    console.error(`[CreditPush] Error fetching report:`, fetchError);
    throw fetchError;
  }

  let reportId = existingReport?.id;

  if (!existingReport) {
    const { data: created, error: createError } = await supabaseAdmin
      .from('credit_reports')
      .insert({
        full_name: profile.full_name || profile.legal_name || 'Client',
        ssn: profile.sin,
        address: profile.address || null,
        phone_number: profile.phone || null,
        email: profile.email || null,
        credit_history: [],
        credit_score: 700,
        payment_levels: [],
        credit_metrics: {}
      })
      .select('id')
      .single();

    if (createError) {
      console.error(`[CreditPush] Failed to create credit report:`, createError);
      throw createError;
    }
    reportId = created.id;
  }

  // Fusion d’historique sans doublon pour la date/institution
  const previousHistory = existingReport?.credit_history || [];
  const filteredHistory = previousHistory.filter((entry: any) =>
    !(entry.date === dateStr && entry.details.includes(`Émetteur: ${institutionName}`))
  );
  const updatedHistory = [...newHistoryEntries, ...filteredHistory]
  updatedHistory.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())

  // Calculs globaux score/métriques
  const activeCredits = (creditAccounts || []).filter((a: any) => a.status === 'active').length
  const avgUtilization = utilCount ? (utilSum / utilCount) : 0
  const scorePack = computeFinalScore(paymentLevels, activeCredits, avgUtilization)

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
    short_term_burst: {
      recent_on_time_ratio: Number(scorePack.recentAvg.toFixed(4)),
      previous_on_time_ratio: Number(scorePack.previousAvg.toFixed(4))
    },
    score_components: scorePack.components,
    final_score: scorePack.score
  }

  // Mise à jour du dossier
  const { error: updateError } = await supabaseAdmin
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

  if (updateError) {
    console.error(`[CreditPush] Update failed:`, updateError);
    throw updateError;
  }

  console.log(`[CreditPush] Successfully pushed ${newHistoryEntries.length} entries; score=${creditMetrics.final_score}.`);
  return { success: true };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { token, autoConsent } = await req.json();
    if (!token) throw new Error("Jeton manquant.");

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('*, institutions(name)')
      .eq('credit_bureau_consent_token', token)
      .single();

    if (profileError || !profile) throw new Error("Jeton invalide ou expiré.");
    if (new Date(profile.credit_bureau_consent_token_expires_at) < new Date()) {
      throw new Error("Jeton expiré.");
    }

    const pushResult = await pushDataToCreditBureau(supabaseAdmin, profile, profile.institutions.name);
    if (!pushResult.success && pushResult.error) {
      throw new Error(pushResult.error);
    }

    const { error: updateProfileError } = await supabaseAdmin
      .from('profiles')
      .update({
        credit_bureau_auto_consent: autoConsent,
        credit_bureau_consent_token: null,
        credit_bureau_consent_token_expires_at: null,
      })
      .eq('id', profile.id);

    if (updateProfileError) throw updateProfileError;

    return new Response(JSON.stringify({ 
      message: "Consentement confirmé et données transmises au bureau de crédit.",
      institutionName: profile.institutions.name
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: (error as any).message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});