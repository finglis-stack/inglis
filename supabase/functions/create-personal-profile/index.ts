// @ts-nocheck
import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'
import bcrypt from 'https://esm.sh/bcryptjs@2.4.3'
import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Helper: AES-256-GCM Encryption
async function encryptAddress(addressObj, keyHex) {
  if (!addressObj || !keyHex) return null;
  
  try {
    const enc = new TextEncoder();
    // Convert hex key to Uint8Array
    const keyData = new Uint8Array(keyHex.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
    const iv = crypto.getRandomValues(new Uint8Array(12)); // 12 bytes IV for GCM
    
    const key = await crypto.subtle.importKey(
      "raw", keyData, { name: "AES-GCM" }, false, ["encrypt"]
    );
    
    const encryptedBuffer = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv: iv },
      key,
      enc.encode(JSON.stringify(addressObj))
    );
    
    return {
      encrypted: base64Encode(new Uint8Array(encryptedBuffer)),
      iv: base64Encode(iv),
      version: "aes-256-gcm"
    };
  } catch (e) {
    console.error("Encryption error:", e);
    throw new Error("Erreur lors du chiffrement de l'adresse.");
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

    // Hachage des identifiants
    const saltRounds = 12;
    const hashedPin = profileData.pin ? bcrypt.hashSync(profileData.pin, saltRounds) : null;
    const hashedSin = profileData.sin ? bcrypt.hashSync(profileData.sin, saltRounds) : null;

    // Chiffrement de l'adresse
    const encryptionKey = Deno.env.get('ADDRESS_ENCRYPTION_KEY');
    if (!encryptionKey) throw new Error("Clé de chiffrement non configurée (ADDRESS_ENCRYPTION_KEY).");
    
    const encryptedAddress = await encryptAddress(profileData.address, encryptionKey);

    const recordToInsert = {
      institution_id: institution.id,
      type: 'personal',
      full_name: profileData.fullName,
      phone: profileData.phone,
      email: profileData.email,
      dob: profileData.dob,
      address: encryptedAddress, // Stockage chiffré
      pin: hashedPin,
      sin: hashedSin,
    };

    const { error: insertError } = await supabaseAdmin.from('profiles').insert(recordToInsert);
    if (insertError) throw insertError;

    // Simulation Bureau de Crédit (Si nécessaire, on garde l'adresse en clair ici car c'est un système "externe" simulé)
    // Dans un cas réel, on enverrait l'adresse déchiffrée à l'API du bureau de crédit
    if (profileData.consent && profileData.sin) {
      const { data: existingReport, error: reportError } = await supabaseAdmin
        .from('credit_reports')
        .select('id')
        .eq('ssn', profileData.sin)
        .maybeSingle();

      if (!existingReport) {
        await supabaseAdmin.from('credit_reports').insert({
          full_name: profileData.fullName,
          ssn: profileData.sin,
          address: profileData.address, // Simulation : on stocke en clair dans la table "externe"
          phone_number: profileData.phone,
          email: profileData.email,
          credit_history: [],
        });
      }
    }

    return new Response(JSON.stringify({ message: "Profil sécurisé créé avec succès" }), {
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