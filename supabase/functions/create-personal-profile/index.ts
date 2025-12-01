// @ts-nocheck
import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'
import bcrypt from 'https://esm.sh/bcryptjs@2.4.3'
import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";
import { crypto } from "https://deno.land/std@0.177.0/crypto/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Chiffrement AES-256-GCM
async function encryptData(dataObj, keyHex) {
  if (!dataObj || !keyHex) return null;
  try {
    const enc = new TextEncoder();
    const keyData = new Uint8Array(keyHex.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
    const iv = crypto.getRandomValues(new Uint8Array(12)); 
    const key = await crypto.subtle.importKey("raw", keyData, { name: "AES-GCM" }, false, ["encrypt"]);
    
    // On gère aussi bien les chaînes que les objets
    const dataString = typeof dataObj === 'string' ? dataObj : JSON.stringify(dataObj);
    
    const encryptedBuffer = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv: iv },
      key,
      enc.encode(dataString)
    );
    return {
      encrypted: base64Encode(new Uint8Array(encryptedBuffer)),
      iv: base64Encode(iv),
      version: "aes-256-gcm"
    };
  } catch (e) {
    console.error("Encryption error:", e);
    throw new Error("Erreur de chiffrement des données sensibles.");
  }
}

// Hachage SHA-256 pour l'indexation aveugle (Blind Indexing)
async function hashData(text) {
  if (!text) return null;
  const msgUint8 = new TextEncoder().encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const profileData = await req.json();
    if (!profileData) throw new Error("Données manquantes.");

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

    const { data: institution } = await supabaseAdmin.from('institutions').select('id').eq('user_id', user.id).single();
    if (!institution) throw new Error("Institution introuvable.");

    const encryptionKey = Deno.env.get('ADDRESS_ENCRYPTION_KEY');
    if (!encryptionKey) throw new Error("Clé de chiffrement serveur manquante.");

    // 1. Préparation Profil (Interne)
    const hashedPin = profileData.pin ? bcrypt.hashSync(profileData.pin, 10) : null;
    const hashedSin = profileData.sin ? bcrypt.hashSync(profileData.sin, 10) : null;
    const encryptedAddress = await encryptData(profileData.address, encryptionKey);

    const { error: insertError } = await supabaseAdmin.from('profiles').insert({
      institution_id: institution.id,
      type: 'personal',
      full_name: profileData.fullName,
      phone: profileData.phone,
      email: profileData.email,
      dob: profileData.dob,
      address: encryptedAddress, // Chiffré
      pin: hashedPin,
      sin: hashedSin,
    });
    if (insertError) throw insertError;

    // 2. Simulation Bureau de Crédit (Externe)
    // Si un NAS est fourni, on crée/met à jour l'entrée au bureau de crédit
    // ATTENTION: Ici aussi tout doit être chiffré
    if (profileData.sin) {
      // On utilise un hash SHA-256 comme clé de recherche (Blind Index) pour ne pas stocker le NAS en clair
      const sinIndex = await hashData(profileData.sin);
      
      // L'adresse est stockée chiffrée dans le bureau de crédit aussi
      const creditBureauAddress = await encryptData(profileData.address, encryptionKey);

      const { data: existingReport } = await supabaseAdmin
        .from('credit_reports')
        .select('id')
        .eq('ssn', sinIndex) // Recherche par HASH
        .maybeSingle();

      if (!existingReport) {
        await supabaseAdmin.from('credit_reports').insert({
          full_name: profileData.fullName,
          ssn: sinIndex, // Stockage du HASH seulement
          address: creditBureauAddress, // Stockage chiffré
          phone_number: profileData.phone,
          email: profileData.email,
          credit_history: [],
          credit_score: Math.floor(Math.random() * (850 - 650 + 1)) + 650 // Score simulé
        });
      }
    }

    return new Response(JSON.stringify({ message: "Profil créé et sécurisé (AES-256)." }), {
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