import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
}

type ExportFrequency = "minute" | "hour" | "day" | "week" | "month"
const freqToMs: Record<ExportFrequency, number> = {
  minute: 60 * 1000,
  hour: 60 * 60 * 1000,
  day: 24 * 60 * 60 * 1000,
  week: 7 * 24 * 60 * 60 * 1000,
  month: 30 * 24 * 60 * 60 * 1000,
}
function isDue(lastRunAt: string | null, frequency: ExportFrequency, now: Date) {
  if (!lastRunAt) return true
  const last = new Date(lastRunAt)
  return now.getTime() - last.getTime() >= freqToMs[frequency]
}

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
  const { data: statements } = await supabaseAdmin
    .from('statements').select('*')
    .eq('credit_account_id', acc.id)
    .order('statement_period_end', { ascending: false })
    .limit(12)

  const { data: balanceData } = await supabaseAdmin
    .rpc('get_credit_account_balance', { p_account_id: acc.id }).single()
  const current_balance = balanceData?.current_balance || 0
  const utilization = acc.credit_limit > 0 ? (current_balance / acc.credit_limit) : 0

  let monthsReviewed = 0, onTime = 0, late = 0, missed = 0
  let rating: Rating = 'R1'

  for (const s of statements || []) {
    monthsReviewed += 1
    const minPay = Number(s.minimum_payment || 0)

    const { data: payByDue } = await supabaseAdmin
      .from('transactions').select('amount')
      .eq('credit_account_id', acc.id).eq('type', 'payment')
      .gte('created_at', new Date(s.statement_period_start).toISOString())
      .lte('created_at', new Date(s.payment_due_date).toISOString())
    const sumByDue = (payByDue || []).reduce((sum: number, r: any) => sum + Number(r.amount || 0), 0)

    const { data: payLate30 } = await supabaseAdmin
      .from('transactions').select('amount')
      .eq('credit_account_id', acc.id).eq('type', 'payment')
      .gte('created_at', new Date(s.payment_due_date).toISOString())
      .lte('created_at', addDays(s.payment_due_date, 30))
    const { data: payLate60 } = await supabaseAdmin
      .from('transactions').select('amount')
      .eq('credit_account_id', acc.id).eq('type', 'payment')
      .gte('created_at', addDays(s.payment_due_date, 30))
      .lte('created_at', addDays(s.payment_due_date, 60))
    const { data: payLate90 } = await supabaseAdmin
      .from('transactions').select('amount')
      .eq('credit_account_id', acc.id).eq('type', 'payment')
      .gte('created_at', addDays(s.payment_due_date, 60))
      .lte('created_at', addDays(s.payment_due_date, 90))
    const { data: payLate120 } = await supabaseAdmin
      .from('transactions').select('amount')
      .eq('credit_account_id', acc.id).eq('type', 'payment')
      .gte('created_at', addDays(s.payment_due_date, 90))
      .lte('created_at', addDays(s.payment_due_date, 120))

    const sumLate30 = (payLate30 || []).reduce((sum: number, r: any) => sum + Number(r.amount || 0), 0)
    const sumLate60 = sumLate30 + (payLate60 || []).reduce((sum: number, r: any) => sum + Number(r.amount || 0), 0)
    const sumLate90 = sumLate60 + (payLate90 || []).reduce((sum: number, r: any) => sum + Number(r.amount || 0), 0)
    const sumLate120 = sumLate90 + (payLate120 || []).reduce((sum: number, r: any) => sum + Number(r.amount || 0), 0)

    let stmtRating: Rating = 'R1'
    if (minPay <= 0) { stmtRating = 'R1'; onTime += 1 }
    else if (sumByDue >= minPay) { stmtRating = 'R1'; onTime += 1 }
    else if (sumLate30 >= minPay) { stmtRating = 'R2'; late += 1 }
    else if (sumLate60 >= minPay) { stmtRating = 'R3'; late += 1 }
    else if (sumLate90 >= minPay) { stmtRating = 'R4'; late += 1 }
    else if (sumLate120 >= minPay) { stmtRating = 'R5'; missed += 1 }
    else { stmtRating = 'R5'; missed += 1 }

    rating = worseRating(rating, stmtRating)
  }

  // Indices court-terme vs long-terme
  const recent = Math.min(monthsReviewed, 3)
  const previous = Math.max(0, monthsReviewed - recent)
  let recentOnTime = 0, previousOnTime = 0
  if ((statements || []).length > 0) {
    const last3 = (statements || []).slice(0, recent)
    const prev9 = (statements || []).slice(recent, recent + previous)
    // recent
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
    // previous
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
    computed_at: new Date().toISOString()
  }
}

function computeFinalScore(paymentLevels: any[], activeAccounts: number, avgUtilization: number) {
  let score = 700
  const components: any = { base: 700 }

  const activeBonus = Math.min(activeAccounts * 5, 25)
  score += activeBonus; components.active_accounts = activeBonus

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

  const months = paymentLevels.reduce((sum, p) => sum + (p.stats?.months_reviewed || 0), 0)
  const onTime = paymentLevels.reduce((sum, p) => sum + (p.stats?.on_time || 0), 0)
  const late = paymentLevels.reduce((sum, p) => sum + (p.stats?.late || 0), 0)
  const missed = paymentLevels.reduce((sum, p) => sum + (p.stats?.missed || 0), 0)

  const onTimeRatio = months ? (onTime / months) : 0
  const onTimeComponent = Math.round((onTimeRatio - 0.5) * 60)
  score += onTimeComponent; components.on_time_component = onTimeComponent

  const latePenalty = Math.min(late * 10, 100)
  const missedPenalty = Math.min(missed * 20, 200)
  score -= latePenalty; components.late_penalty = -latePenalty
  score -= missedPenalty; components.missed_penalty = -missedPenalty

  let utilComponent = 0
  if (avgUtilization >= 0.8) utilComponent = -40
  else if (avgUtilization >= 0.5) utilComponent = -20
  else if (avgUtilization >= 0.3) utilComponent = -10
  else utilComponent = +10
  score += utilComponent; components.utilization_component = utilComponent

  const recent = paymentLevels.reduce((sum, p) => sum + (p.stats?.recent_on_time_ratio || 0), 0) / Math.max(paymentLevels.length, 1)
  const previous = paymentLevels.reduce((sum, p) => sum + (p.stats?.previous_on_time_ratio || 0), 0) / Math.max(paymentLevels.length, 1)
  let burstPenalty = 0
  if (recent >= 0.9 && previous <= 0.6) burstPenalty = 15
  score -= burstPenalty; components.burst_penalty = -burstPenalty

  score = Math.max(300, Math.min(900, score))
  return { score, components, months, onTime, late, missed, onTimeRatio, recentAvg: recent, previousAvg: previous }
}

async function pushDataForProfile(supabaseAdmin: any, profile: any, institutionName: string) {
  if (!profile.sin) return { success: false, error: "Aucun NAS associé au profil." }
  if (profile.sin.startsWith("$2")) return { success: false, error: "Format de données obsolète. Veuillez recréer le profil utilisateur." }

  const { data: creditAccounts, error: creditError } = await supabaseAdmin
    .from("credit_accounts")
    .select("*, cards(*, card_programs(program_name))")
    .eq("profile_id", profile.id)
    .neq("status", "closed")

  const { data: debitAccounts, error: debitError } = await supabaseAdmin
    .from("debit_accounts")
    .select("*, cards(*, card_programs(program_name))")
    .eq("profile_id", profile.id)
    .neq("status", "closed")

  if (creditError || debitError) return { success: false, error: "Erreur lors de la récupération des comptes." }

  const currencyFormatter = new Intl.NumberFormat("fr-CA", { style: "currency", currency: "CAD" })
  const dateStr = new Date().toISOString().split("T")[0]
  const newHistoryEntries: any[] = []

  const paymentLevels: any[] = []
  let utilSum = 0, utilCount = 0

  if (creditAccounts) {
    for (const acc of creditAccounts) {
      const { data: balanceData } = await supabaseAdmin.rpc("get_credit_account_balance", { p_account_id: acc.id }).single()
      const current_balance = balanceData?.current_balance || 0
      const debtRatio = acc.credit_limit > 0 ? (current_balance / acc.credit_limit) * 100 : 0
      const programName = acc.cards?.card_programs?.program_name || "Carte de Crédit"

      const pl = await computeAccountPaymentRating(supabaseAdmin, acc, programName)
      paymentLevels.push(pl); utilSum += pl.stats.average_utilization; utilCount += 1

      newHistoryEntries.push({
        date: dateStr,
        type: programName,
        details: `Émetteur: ${institutionName}, Solde: ${currencyFormatter.format(current_balance)}, Limite: ${currencyFormatter.format(acc.credit_limit)}, Ratio: ${debtRatio.toFixed(1)}%, Niveau de paiement: ${pl.rating}`,
        status: acc.status === "active" ? "Active" : "Review",
      })
    }
  }

  if (debitAccounts) {
    for (const acc of debitAccounts) {
      const { data: balanceData } = await supabaseAdmin.rpc("get_debit_account_balance", { p_account_id: acc.id }).single()
      const current_balance = balanceData?.current_balance || 0
      const programName = acc.cards?.card_programs?.program_name || "Carte de Débit"
      newHistoryEntries.push({
        date: dateStr,
        type: programName,
        details: `Émetteur: ${institutionName}, Solde: ${currencyFormatter.format(current_balance)}`,
        status: acc.status === "active" ? "Active" : "Inactive",
      })
    }
  }

  const { data: existingReport, error: fetchError } = await supabaseAdmin
    .from("credit_reports")
    .select("id, credit_history, credit_score, payment_levels, credit_metrics")
    .eq("ssn", profile.sin)
    .maybeSingle()
  if (fetchError) return { success: false, error: fetchError.message }

  let reportId = existingReport?.id
  if (!existingReport) {
    const { data: created, error: createError } = await supabaseAdmin
      .from("credit_reports")
      .insert({
        full_name: profile.full_name || profile.legal_name || "Client",
        ssn: profile.sin,
        address: profile.address || null,
        phone_number: profile.phone || null,
        email: profile.email || null,
        credit_history: [],
        credit_score: 700,
        payment_levels: [],
        credit_metrics: {}
      })
      .select("id")
      .single()
    if (createError) return { success: false, error: createError.message }
    reportId = created.id
  }

  const prev = existingReport?.credit_history || []
  const filtered = prev.filter((entry: any) => !(entry.date === dateStr && entry.details.includes(`Émetteur: ${institutionName}`)))
  const updatedHistory = [...newHistoryEntries, ...filtered]
  updatedHistory.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())

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

  const { error: updateError } = await supabaseAdmin
    .from("credit_reports")
    .update({
      credit_history: updatedHistory,
      updated_at: new Date().toISOString(),
      full_name: profile.full_name || profile.legal_name || "Client",
      email: profile.email || null,
      phone_number: profile.phone || null,
      payment_levels: paymentLevels,
      credit_metrics: creditMetrics,
      credit_score: creditMetrics.final_score
    })
    .eq("id", reportId)
  if (updateError) return { success: false, error: updateError.message }

  return { success: true }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders })
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 405,
    })
  }

  try {
    const cronSecret = Deno.env.get("CRON_SECRET")
    if (cronSecret) {
      const provided = req.headers.get("x-cron-secret")
      if (!provided || provided !== cronSecret) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 401,
        })
      }
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    )

    const now = new Date()
    const { data: prefs, error: prefsError } = await supabaseAdmin
      .from("credit_export_preferences")
      .select("id, profile_id, frequency, enabled, last_run_at")
      .eq("enabled", true)
    if (prefsError) throw prefsError

    let processed = 0
    const details: any[] = []

    for (const pref of prefs || []) {
      const freq = (pref.frequency || "day") as ExportFrequency
      if (!isDue(pref.last_run_at, freq, now)) continue

      const { data: profile, error: profileError } = await supabaseAdmin
        .from("profiles")
        .select("id, type, full_name, legal_name, email, phone, sin, address, institution_id, credit_bureau_auto_consent")
        .eq("id", pref.profile_id)
        .single()
      if (profileError || !profile) { details.push({ profile_id: pref.profile_id, status: "error", error: "Profil introuvable" }); continue }
      // Loi 25: si le profil n'a pas consenti à l'export automatique, on saute
      if (!profile.credit_bureau_auto_consent) {
        details.push({ profile_id: pref.profile_id, status: "skipped", reason: "auto_consent_disabled" });
        continue;
      }

      const { data: institution, error: instError } = await supabaseAdmin
        .from("institutions")
        .select("name")
        .eq("id", profile.institution_id)
        .single()
      if (instError || !institution) { details.push({ profile_id: pref.profile_id, status: "error", error: "Institution introuvable" }); continue }

      const result = await pushDataForProfile(supabaseAdmin, profile, institution.name)
      if (!result.success) { details.push({ profile_id: pref.profile_id, status: "error", error: result.error }); continue }

      await supabaseAdmin
        .from("credit_export_preferences")
        .update({ last_run_at: now.toISOString(), updated_at: now.toISOString() })
        .eq("id", pref.id)

      processed += 1
      details.push({ profile_id: pref.profile_id, status: "ok", frequency: freq })
    }

    return new Response(JSON.stringify({ processed, details }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as any).message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    })
  }
})