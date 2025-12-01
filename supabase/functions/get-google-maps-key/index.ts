// @ts-nocheck
import { serve } from "https://deno.land/std@0.190.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 1. Essai direct standard
    let apiKey = Deno.env.get('GOOGLE_MAPS_API_KEY');

    // 2. Si non trouvé, on scanne toutes les variables d'environnement
    // Cela contourne le bug où le nom de la variable contient des espaces ou \r\n
    if (!apiKey) {
      const allEnv = Deno.env.toObject();
      for (const [key, value] of Object.entries(allEnv)) {
        if (key.trim() === 'GOOGLE_MAPS_API_KEY') {
          apiKey = value;
          break;
        }
        // Cas extrême : la clé est mal nommée mais contient la valeur (commence par AIza)
        if (value.startsWith('AIzaSy')) {
            console.log(`Key found in variable: ${key}`);
            apiKey = value;
            break;
        }
      }
    }

    console.log(`Request received. API Key found: ${!!apiKey}`);

    if (!apiKey) {
      return new Response(
        JSON.stringify({ apiKey: null, error: 'Server configuration error: GOOGLE_MAPS_API_KEY secret is missing.' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Nettoyage de la valeur (au cas où la valeur elle-même aurait des retours à la ligne)
    const cleanKey = apiKey.trim();

    return new Response(
      JSON.stringify({ apiKey: cleanKey }),
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