// @ts-nocheck
import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'
import { decode as base64Decode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

async function decryptAddress(encryptedObj, keyHex) {
  if (!encryptedObj || !encryptedObj.encrypted || !encryptedObj.iv || !keyHex) return null;
  try {
    const enc = new TextDecoder();
    const keyData = new Uint8Array(keyHex.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
    const iv = base64Decode(encryptedObj.iv);
    const ciphertext = base64Decode(encryptedObj.encrypted);
    
    const key = await crypto.subtle.importKey("raw", keyData, { name: "AES-GCM" }, false, ["decrypt"]);
    const decryptedBuffer = await crypto.subtle.decrypt({ name: "AES-GCM", iv: iv }, key, ciphertext);
    
    return JSON.parse(enc.decode(decryptedBuffer));
  } catch (e) {
    console.error("Decryption failed:", e);
    return null;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')!
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    if (userError) throw userError

    const { profile_id } = await req.json()

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { data: institution } = await supabaseAdmin.from('institutions').select('id').eq('user_id', user.id).single()
    if (!institution) throw new Error('Non autorisé');

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, address, business_address, type')
      .eq('id', profile_id)
      .eq('institution_id', institution.id)
      .single()
      
    if (profileError || !profile) throw new Error('Profil introuvable');

    const encryptionKey = Deno.env.get('ADDRESS_ENCRYPTION_KEY');
    if (!encryptionKey) throw new Error("Clé manquante.");

    // Déterminer quelle adresse déchiffrer
    const addressToDecrypt = profile.type === 'corporate' ? profile.business_address : profile.address;
    
    // Si c'est déjà en clair (legacy), on retourne tel quel, sinon on déchiffre
    let clearAddress = addressToDecrypt;
    if (addressToDecrypt && addressToDecrypt.encrypted) {
      clearAddress = await decryptAddress(addressToDecrypt, encryptionKey);
    }

    return new Response(JSON.stringify({ address: clearAddress }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})