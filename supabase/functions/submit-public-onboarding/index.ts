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

async function hashData(text) {
  if (!text) return null;
  const msgUint8 = new TextEncoder().encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

function normalizeAddress(addressObj) {
  if (!addressObj) return '';
  const parts = [
    addressObj.street,
    addressObj.city,
    addressObj.state || addressObj.province,
    addressObj.postalCode || addressObj.postal_code,
    addressObj.country
  ]
    .filter(Boolean)
    .map((p) => String(p).toLowerCase().replace(/\s+/g, ' ').trim());
  return parts.join('|');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { formId, profileData } = await req.json();
    if (!formId || !profileData) throw new Error("Données requises manquantes.");

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: form, error: formError } = await supabaseAdmin
      .from('onboarding_forms')
      .select('institution_id, is_active, auto_approve_enabled, is_credit_bureau_enabled')
      .eq('id', formId)
      .single();

    if (formError || !form) throw new Error("Formulaire invalide.");
    if (!form.is_active) throw new Error("Formulaire inactif.");

    // Hachage
    const saltRounds = 12;
    const hashedPin = profileData.pin ? bcrypt.hashSync(profileData.pin, saltRounds) : null;
    
    // IMPORTANT: Utilisation de SHA-256 pour le NAS (au lieu de bcrypt) pour le Blind Indexing
    const hashedSin = await hashData(profileData.sin);

    // Chiffrement adresse
    const encryptionKey = Deno.env.get('ADDRESS_ENCRYPTION_KEY');
    if (!encryptionKey) throw new Error("Configuration serveur incomplète.");
    const encryptedAddress = await encryptAddress(profileData.address, encryptionKey);

    // Déduplication du profil
    const fullName = `${profileData.firstName} ${profileData.lastName}`.trim();
    const addressHash = await hashData(normalizeAddress(profileData.address));

    // Chercher un profil existant sur la combinaison nom + téléphone + adresse (hashée)
    const { data: existingProfile, error: existingErr } = await supabaseAdmin
      .from('profiles')
      .select('id, sin')
      .eq('institution_id', form.institution_id)
      .eq('type', 'personal')
      .eq('full_name', fullName)
      .eq('phone', profileData.phone)
      .eq('address_hash', addressHash)
      .maybeSingle();

    if (existingErr) throw existingErr;

    let profileId;

    if (existingProfile?.id) {
      // Profil trouvé: ne pas créer de nouveau compte, ignorer le nouveau NIP
      profileId = existingProfile.id;

      // Vérifier NAS en second: si présent et cohérent, OK; si différent, consigner mais on réutilise le même compte
      if (hashedSin && existingProfile.sin && existingProfile.sin !== hashedSin) {
        console.warn('SIN mismatch for deduped profile; reusing existing profile id.');
      }
    } else {
      // Nouveau client: insérer un nouveau profil avec NIP et adresse chiffrée
      const profileToInsert = {
        institution_id: form.institution_id,
        type: 'personal',
        full_name: fullName,
        email: profileData.email,
        phone: profileData.phone,
        dob: profileData.dob,
        address: encryptedAddress, // Stocké chiffré
        sin: hashedSin, // Stocké haché (SHA-256)
        pin: hashedPin, // Nouveau NIP accepté seulement si nouveau client
        address_hash: addressHash,
        status: 'inactive',
      };

      const { data: newProfile, error: insertProfileError } = await supabaseAdmin
        .from('profiles')
        .insert(profileToInsert)
        .select('id')
        .single();

      if (insertProfileError) throw insertProfileError;
      profileId = newProfile.id;
    }

    const applicationToInsert = {
      form_id: formId,
      profile_id: profileId,
      selected_card_program_id: profileData.selectedProgramId,
      employment_status: profileData.employmentStatus,
      employer: profileData.employer,
      annual_income: profileData.annualIncome ? parseFloat(profileData.annualIncome) : null,
      t4_income: profileData.t4Income ? parseFloat(profileData.t4Income) : null,
      credit_bureau_verification_status: profileData.creditBureauVerification,
      submitted_sin_hash: hashedSin || null,
      status: 'pending',
    };

    const { data: newApplication, error: insertApplicationError } = await supabaseAdmin
      .from('onboarding_applications')
      .insert(applicationToInsert)
      .select('id')
      .single();
    
    if (insertApplicationError) throw insertApplicationError;

    if (form.auto_approve_enabled) {
      supabaseAdmin.functions.invoke('process-onboarding-application', {
        body: { applicationId: newApplication.id },
      });
    }

    return new Response(JSON.stringify({ 
      message: "Candidature soumise et sécurisée.",
      applicationId: newApplication.id
    }), {
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