// @ts-nocheck
import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const today = new Date();
    const dayOfMonth = today.getDate();

    // 1. Sélectionner les comptes dont le cycle de facturation correspond à aujourd'hui
    const { data: accounts, error: accountsError } = await supabaseAdmin
      .from('credit_accounts')
      .select('id')
      .eq('billing_cycle_anchor_day', dayOfMonth)
      .eq('status', 'active');

    if (accountsError) throw accountsError;

    let generatedCount = 0;
    let errorCount = 0;

    // 2. Pour chaque compte, appeler la fonction RPC pour générer le relevé
    for (const account of accounts) {
      const { error: rpcError } = await supabaseAdmin.rpc('generate_statement_for_account', {
        p_account_id: account.id,
      });

      if (rpcError) {
        console.error(`Failed to generate statement for account ${account.id}:`, rpcError.message);
        errorCount++;
      } else {
        generatedCount++;
      }
    }

    return new Response(JSON.stringify({ 
      message: `Statement generation complete. Generated: ${generatedCount}, Failed: ${errorCount}.` 
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