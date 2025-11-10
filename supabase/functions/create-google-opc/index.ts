// @ts-nocheck
import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'
import * as openpgp from 'https://esm.sh/openpgp@5.11.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // 1. Authentifier l'utilisateur qui fait la demande
    const authHeader = req.headers.get('Authorization')!
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    if (userError) throw userError;

    // 2. Récupérer l'ID de la carte depuis le corps de la requête
    const { card_id } = await req.json();
    if (!card_id) throw new Error("L'ID de la carte est manquant.");

    // 3. Utiliser le client admin pour récupérer les données sensibles
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 4. Récupérer le numéro de carte (FPAN) de manière sécurisée
    const { data: card, error: cardError } = await supabaseAdmin
      .from('cards')
      .select('user_initials, issuer_id, random_letters, unique_identifier, check_digit')
      .eq('id', card_id)
      .single();
    if (cardError) throw new Error("Carte non trouvée ou accès non autorisé.");
    
    const fpan = `${card.user_initials}${card.issuer_id}${card.random_letters}${card.unique_identifier}${card.check_digit}`;

    // 5. Récupérer les clés PGP depuis les secrets
    const privateKeyArmored = Deno.env.get('PGP_PRIVATE_KEY');
    const passphrase = Deno.env.get('PGP_PASSPHRASE');
    const googlePublicKeyArmored = Deno.env.get('GOOGLE_PGP_PUBLIC_KEY');

    if (!privateKeyArmored || !passphrase || !googlePublicKeyArmored) {
      throw new Error("Les clés PGP ne sont pas configurées dans les secrets de la Edge Function.");
    }

    // 6. Chiffrer le FPAN avec la clé publique de Google
    const googlePublicKey = await openpgp.readKey({ armoredKey: googlePublicKeyArmored });
    const encryptedMessage = await openpgp.encrypt({
      message: await openpgp.createMessage({ text: fpan }),
      encryptionKeys: googlePublicKey,
    });

    // 7. Signer le message chiffré avec notre clé privée
    const privateKey = await openpgp.decryptKey({
      privateKey: await openpgp.readPrivateKey({ armoredKey: privateKeyArmored }),
      passphrase,
    });

    const signedAndEncryptedMessage = await openpgp.sign({
      message: await openpgp.readMessage({ armoredMessage: encryptedMessage }),
      signingKeys: privateKey,
      detached: true, // Créer une signature détachée
    });

    // 8. Construire l'OPC Google
    const opaquePaymentCard = {
      encryptedMessage: encryptedMessage,
      signature: signedAndEncryptedMessage.signature,
    };

    // 9. Retourner l'OPC
    return new Response(JSON.stringify(opaquePaymentCard), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
})