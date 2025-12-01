// @ts-nocheck
import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'
import { decode as base64Decode } from "https://deno.land/std@0.168.0/encoding/base64.ts";
import { crypto } from "https://deno.land/std@0.177.0/crypto/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Déchiffrement AES-256-GCM
async function decryptData(encryptedObj, keyHex) {
  if (!encryptedObj || !encryptedObj.encrypted || !encryptedObj.iv || !keyHex) return null;
  try {
    const enc = new TextDecoder();
    const keyData = new Uint8Array(keyHex.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
    const iv = base64Decode(encryptedObj.iv);
    const ciphertext = base64Decode(encryptedObj.encrypted);
    
    const key = await crypto.subtle.importKey("raw", keyData, { name: "AES-GCM" }, false, ["decrypt"]);
    const decryptedBuffer = await crypto.subtle.decrypt({ name: "AES-GCM", iv: iv }, key, ciphertext);
    
    const jsonString = enc.decode(decryptedBuffer);
    try {
      return JSON.parse(jsonString);
    } catch {
      return jsonString; // Retourne la chaîne si ce n'est pas du JSON
    }
  } catch (e) {
    console.error("Decryption failed:", e);
    return null;
  }
}

async function hashData(text) {
  if (!text) return null;
  const msgUint8 = new TextEncoder().encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const { ssn } = await req.json();
    if (!ssn) throw new Error("NAS manquant.");

    // Cette fonction est publique (comme un site de bureau de crédit), mais on pourrait ajouter une auth admin ici si nécessaire
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const encryptionKey = Deno.env.get('ADDRESS_ENCRYPTION_KEY');
    if (!encryptionKey) throw new Error("Erreur de configuration serveur.");

    // 1. Hacher le NAS pour la recherche (Blind Index)
    const sinHash = await hashData(ssn);

    // 2. Rechercher le rapport
    const { data: report, error } = await supabaseAdmin
      .from('credit_reports')
      .select('*')
      .eq('ssn', sinHash)
      .single();

    if (error || !report) {
      throw new Error("Dossier de crédit introuvable.");
    }

    // 3. Déchiffrer l'adresse si elle est chiffrée
    let clearAddress = report.address;
    if (report.address && report.address.encrypted) {
      clearAddress = await decryptData(report.address, encryptionKey);
    }

    // On ne retourne pas le HASH du NAS au client, mais le NAS qu'il a demandé (pour confirmation visuelle)
    // ou masqué car le NAS réel n'est pas stocké en clair/réversible.
    const reportToSend = {
      ...report,
      ssn: ssn, // On renvoie ce que l'utilisateur a cherché pour l'affichage "NAS: ***-***-123"
      address: clearAddress
    };

    return new Response(JSON.stringify(reportToSend), {
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