// @ts-nocheck
import { serve } from "https://deno.land/std@0.190.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { from, to } = await req.json();
    if (!from || !to) {
      throw new Error('Les devises "from" et "to" sont requises.');
    }

    const API_KEY = Deno.env.get('EXCHANGE_RATE_API_KEY');
    if (!API_KEY) {
      throw new Error("La clé API pour le service de taux de change n'est pas configurée.");
    }

    const response = await fetch(`https://v6.exchangerate-api.com/v6/${API_KEY}/pair/${from}/${to}`);
    const data = await response.json();

    if (data.result === 'error') {
      throw new Error(`Erreur de l'API de taux de change: ${data['error-type']}`);
    }

    return new Response(JSON.stringify({ rate: data.conversion_rate }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
})