// @ts-nocheck
import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

async function pushDataToCreditBureau(supabaseAdmin, profile) {
  if (!profile.sin) {
    console.warn(`Profil ${profile.id} n'a pas de NAS, impossible de pousser les données.`);
    return;
  }

  const { data: accounts, error: accountsError } = await supabaseAdmin
    .from('credit_accounts')
    .select('credit_limit, current_balance, created_at, status')
    .eq('profile_id', profile.id);

  if (accountsError) throw accountsError;

  const newHistoryEntries = accounts.map(acc => ({
    date: new Date().toISOString().split('T')[0],
    type: 'Mise à jour de compte de crédit',
    details: `Limite: ${acc.credit_limit}, Solde: ${acc.current_balance}, Statut: ${acc.status}`,
    status: 'Active'
  }));

  const { data: report, error: reportError } = await supabaseAdmin
    .from('credit_reports')
    .select('credit_history')
    .eq('ssn', profile.sin)
    .single();

  if (reportError && reportError.code !== 'PGRST116') throw reportError;

  const updatedHistory = (report?.credit_history || []).concat(newHistoryEntries);

  const { error: updateError } = await supabaseAdmin
    .from('credit_reports')
    .update({ credit_history: updatedHistory, updated_at: new Date().toISOString() })
    .eq('ssn', profile.sin);

  if (updateError) throw updateError;
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

    await pushDataToCreditBureau(supabaseAdmin, profile);

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
      message: "Consentement confirmé et données mises à jour.",
      institutionName: profile.institutions.name
    }), {
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