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

    console.log('Fetching geolocation for IP:', ipAddress);

    // Utiliser ip-api.com avec HTTPS
    const fields = 'status,message,country,countryCode,region,regionName,city,zip,lat,lon,timezone,isp,org,as,mobile,proxy,hosting,query';
    const response = await fetch(`https://ip-api.com/json/${ipAddress}?fields=${fields}`);
    
    if (!response.ok) {
      console.error(`IP geolocation API error: ${response.status} ${response.statusText}`);
      throw new Error(`Failed to fetch geolocation: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (data.status !== 'success') {
      console.error(`IP geolocation failed: ${data.message || 'Unknown error'}`);
      throw new Error(data.message || 'Geolocation failed');
    }

    console.log('Geolocation successful:', data);

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error('Error in get-ip-geolocation function:', error);
    return new Response(JSON.stringify({ 
      status: 'fail',
      message: error.message 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})