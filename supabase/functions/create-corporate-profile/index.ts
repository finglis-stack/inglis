// @ts-nocheck
import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'
import bcrypt from 'https://esm.sh/bcryptjs@2.4.3'
import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

async function encryptAddress(addressObj, keyHex) {
  if (!addressObj || !keyHex) return null;
  try {
    const enc = new TextEncoder();
    const keyData = new Uint8Array(keyHex.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const key = await crypto.subtle.importKey("raw", keyData, { name: "AES-GCM" }, false, ["encrypt"]);
    const encryptedBuffer = await crypto.subtle.encrypt({ name: "AES-GCM", iv: iv }, key, enc.encode(JSON.stringify(addressObj)));
    return { encrypted: base64Encode(new Uint8Array(encryptedBuffer)), iv: base64Encode(iv), version: "aes-256-gcm" };
  } catch (e) {
    console.error("Encryption error:", e);
    throw new Error("Erreur de chiffrement.");
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const profileData = await req.json();
    if (!profileData) throw new Error("Données de profil manquantes.");

    const authHeader = req.headers.get('Authorization')!;
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );
    
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError) throw userError;

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: institution, error: institutionError } = await supabaseAdmin
      .from('institutions')
      .select('id')
      .eq('user_id', user.id)
      .single();
    if (institutionError) throw institutionError;

    const hashedPin = profileData.pin ? bcrypt.hashSync(profileData.pin, 10) : null;

    const encryptionKey = Deno.env.get('ADDRESS_ENCRYPTION_KEY');
    if (!encryptionKey) throw new Error("Clé de chiffrement non configurée.");
    
    const encryptedAddress = await encryptAddress(profileData.businessAddress, encryptionKey);

    const recordToInsert = {
      institution_id: institution.id,
      type: 'corporate',
      legal_name: profileData.legalName,
      operating_name: profileData.operatingName,
      business_number: profileData.businessNumber,
      jurisdiction: profileData.jurisdiction,
      business_address: encryptedAddress, // Stocké chiffré
      pin: hashedPin,
    };

    const { error: insertError } = await supabaseAdmin.from('profiles').insert(recordToInsert);
    if (insertError) throw insertError;

    return new Response(JSON.stringify({ message: "Profil corporatif créé avec succès" }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});