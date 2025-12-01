// @ts-nocheck
import { serve } from "https://deno.land/std@0.190.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const apiKey = Deno.env.get('GOOGLE_MAPS_API_KEY');

    console.log(`Request received. API Key present: ${!!apiKey}`);

    if (!apiKey) {
      // Return 200 with explicit error payload to aid debugging on client
      return new Response(
        JSON.stringify({ apiKey: null, error: 'Server configuration error: GOOGLE_MAPS_API_KEY secret is missing or empty.' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ apiKey: apiKey.trim() }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error("Internal Server Error:", error.message);
    return new Response(
      JSON.stringify({ error: `Internal Error: ${error.message}` }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})