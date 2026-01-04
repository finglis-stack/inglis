import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'
import bcrypt from 'https://esm.sh/bcryptjs@2.4.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { token, pin } = await req.json()
    if (!token || !pin) throw new Error('Paramètres manquants.')

    const admin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Vérifier le lien et récupérer le profil et le relevé
    const { data: link } = await admin
      .from('statement_access_links')
      .select('id, statement_id, profile_id, expires_at')
      .eq('token', token)
      .single()
    if (!link) throw new Error('Lien invalide.')
    if (link.expires_at && new Date(link.expires_at) < new Date()) throw new Error('Lien expiré.')

    // Charger profil + NIP hashé
    const { data: profile } = await admin
      .from('profiles')
      .select('id, type, full_name, legal_name, email, pin, institution_id')
      .eq('id', link.profile_id)
      .single()
    if (!profile) throw new Error('Profil introuvable.')

    // Vérifier PIN (hash bcrypt)
    if (!profile.pin || !bcrypt.compareSync(pin, profile.pin)) {
      return new Response(JSON.stringify({ ok: false, error: 'NIP invalide.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    // Charger relevé, compte, institution et transactions
    const { data: statement } = await admin
      .from('statements')
      .select('*')
      .eq('id', link.statement_id)
      .single()
    if (!statement) throw new Error('Relevé introuvable.')

    const { data: account } = await admin
      .from('credit_accounts')
      .select('id, card_id, profile_id, credit_limit, interest_rate, cash_advance_rate, currency')
      .eq('id', statement.credit_account_id)
      .single()

    const { data: institution } = await admin
      .from('institutions')
      .select('id, name, address, city, country, phone_number')
      .eq('id', profile.institution_id)
      .single()

    const { data: transactions } = await admin
      .from('transactions')
      .select('id, created_at, amount, type, description, currency')
      .eq('statement_id', statement.id)
      .order('created_at', { ascending: true })

    return new Response(JSON.stringify({
      ok: true,
      profile,
      institution,
      account,
      statement,
      transactions,
    }), {
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