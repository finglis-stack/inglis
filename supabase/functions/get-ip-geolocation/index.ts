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
    const { ipAddress } = await req.json();
    
    if (!ipAddress) {
      throw new Error('IP address is required');
    }

    // Récupérer la clé API depuis les variables d'environnement
    const apiKey = Deno.env.get('IPGEOLOCATION_API_KEY');
    
    if (!apiKey) {
      console.error('IPGEOLOCATION_API_KEY not found in environment variables');
      return new Response(JSON.stringify({ 
        status: 'fail',
        message: 'API key not configured'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    console.log('Fetching geolocation for IP:', ipAddress, 'with API key:', apiKey.substring(0, 8) + '...');

    // Utiliser ipgeolocation.io avec la clé API
    const url = `https://api.ipgeolocation.io/ipgeo?apiKey=${apiKey}&ip=${ipAddress}&fields=geo,security`;
    console.log('Calling URL:', url.replace(apiKey, 'HIDDEN'));
    
    const response = await fetch(url);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`IP geolocation API error: ${response.status} ${response.statusText}`, errorText);
      return new Response(JSON.stringify({ 
        status: 'fail',
        message: `API returned ${response.status}: ${response.statusText}`
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }
    
    const data = await response.json();
    console.log('Raw API response:', JSON.stringify(data, null, 2));
    
    // Transformer les données ipgeolocation.io vers le format attendu
    const transformedData = {
      status: 'success',
      country: data.country_name,
      countryCode: data.country_code2,
      region: data.state_code,
      regionName: data.state_prov,
      city: data.city,
      zip: data.zipcode,
      lat: parseFloat(data.latitude),
      lon: parseFloat(data.longitude),
      timezone: data.time_zone?.name,
      isp: data.isp,
      org: data.organization,
      as: data.asn,
      query: data.ip,
      // Données de sécurité de ipgeolocation.io
      mobile: false,
      proxy: data.security?.is_proxy || false,
      hosting: data.security?.is_hosting || false,
      vpn: data.security?.is_vpn || false,
      tor: data.security?.is_tor || false,
    };

    console.log('Transformed data:', JSON.stringify(transformedData, null, 2));

    return new Response(JSON.stringify(transformedData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error('Error in get-ip-geolocation function:', error);
    return new Response(JSON.stringify({ 
      status: 'fail',
      message: error.message || 'Unknown error'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  }
})