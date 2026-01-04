// @ts-nocheck
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
  month: 30 * 24 * 60 * 60 * 1000, // approximation simple
}

function isDue(lastRunAt: string | null, frequency: ExportFrequency, now: Date) {
  if (!lastRunAt) return true
  const last = new Date(lastRunAt)
  return now.getTime() - last.getTime() >= freqToMs[frequency]
}

async function pushDataForProfile(supabaseAdmin: any, profile: any, institutionName: string) {
  if (!profile.sin) {
    return { success: false, error: "Aucun NAS associé au profil." }
  }
  if (profile.sin.startsWith("$2")) {
    return { success: false, error: "Format de données obsolète. Veuillez recréer le profil utilisateur." }
  }

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

  if (creditError || debitError) {
    return { success: false, error: "Erreur lors de la récupération des comptes." }
  }

  const newHistoryEntries: any[] = []
  const currencyFormatter = new Intl.NumberFormat("fr-CA", { style: "currency", currency: "CAD" })
  const dateStr = new Date().toISOString().split("T")[0]

  // Comptes de crédit
  if (creditAccounts) {
    for (const acc of creditAccounts) {
      const { data: balanceData } = await supabaseAdmin.rpc("get_credit_account_balance", { p_account_id: acc.id }).single()
      const current_balance = balanceData?.current_balance || 0
      const debtRatio = acc.credit_limit > 0 ? (current_balance / acc.credit_limit) * 100 : 0
      const programName = acc.cards?.card_programs?.program_name || "Carte de Crédit"
      newHistoryEntries.push({
        date: dateStr,
        type: programName,
        details: `Émetteur: ${institutionName}, Solde: ${currencyFormatter.format(current_balance)}, Limite: ${currencyFormatter.format(acc.credit_limit)}, Ratio: ${debtRatio.toFixed(1)}%`,
        status: acc.status === "active" ? "Active" : "Review",
      })
    }
  }

  // Comptes de débit
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

  // Dossier de crédit: créer si absent, sinon mettre à jour
  const { data: existingReport, error: fetchError } = await supabaseAdmin
    .from("credit_reports")
    .select("id, credit_history")
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
      })
      .select("id")
      .single()
    if (createError) return { success: false, error: createError.message }
    reportId = created.id
  }

  const previousHistory = existingReport?.credit_history || []
  const filteredHistory = previousHistory.filter(
    (entry: any) => !(entry.date === dateStr && entry.details.includes(`Émetteur: ${institutionName}`)),
  )
  const updatedHistory = [...newHistoryEntries, ...filteredHistory]
  updatedHistory.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  const { error: updateError } = await supabaseAdmin
    .from("credit_reports")
    .update({
      credit_history: updatedHistory,
      updated_at: new Date().toISOString(),
      full_name: profile.full_name || profile.legal_name || "Client",
      email: profile.email || null,
      phone_number: profile.phone || null,
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
    // Option de sécurité: si CRON_SECRET est défini, on exige son header
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
      if (!isDue(pref.last_run_at, freq, now)) {
        continue
      }

      // Récupérer le profil et l’institution
      const { data: profile, error: profileError } = await supabaseAdmin
        .from("profiles")
        .select("id, type, full_name, legal_name, email, phone, sin, address, institution_id")
        .eq("id", pref.profile_id)
        .single()
      if (profileError || !profile) {
        details.push({ profile_id: pref.profile_id, status: "error", error: "Profil introuvable" })
        continue
      }

      const { data: institution, error: instError } = await supabaseAdmin
        .from("institutions")
        .select("name")
        .eq("id", profile.institution_id)
        .single()
      if (instError || !institution) {
        details.push({ profile_id: pref.profile_id, status: "error", error: "Institution introuvable" })
        continue
      }

      const result = await pushDataForProfile(supabaseAdmin, profile, institution.name)
      if (!result.success) {
        details.push({ profile_id: pref.profile_id, status: "error", error: result.error })
        continue
      }

      // Marquer l’exécution
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
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    })
  }
})