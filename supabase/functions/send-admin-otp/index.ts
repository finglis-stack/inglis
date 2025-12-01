// @ts-nocheck
import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'
import bcrypt from 'https://esm.sh/bcryptjs@2.4.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    const authHeader = req.headers.get('Authorization')!
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )
    
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    if (userError || !user || !user.email) throw new Error("Utilisateur non authentifié.")

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Générer un code à 6 chiffres
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const codeHash = bcrypt.hashSync(code, 10);

    // Sauvegarder le hash
    await supabaseAdmin.from('admin_otps').insert({
      user_id: user.id,
      code_hash: codeHash
    });

    // Envoyer le courriel
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    if (!RESEND_API_KEY) throw new Error("Clé Resend manquante.");

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`
      },
      body: JSON.stringify({
        from: "Inglis Dominion Security <security@resend.dev>",
        to: [user.email],
        subject: "Code de vérification pour accès sensible",
        html: `
          <div style="font-family: sans-serif; padding: 20px;">
            <h2>Demande d'accès aux données sensibles</h2>
            <p>Votre code de vérification temporaire est :</p>
            <h1 style="letter-spacing: 5px; font-size: 32px; background: #f0f0f0; padding: 10px; text-align: center; border-radius: 5px;">${code}</h1>
            <p>Ce code expirera dans 15 minutes.</p>
          </div>
        `
      })
    });

    if (!res.ok) throw new Error("Erreur lors de l'envoi du courriel.");

    return new Response(JSON.stringify({ message: "Code envoyé" }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})