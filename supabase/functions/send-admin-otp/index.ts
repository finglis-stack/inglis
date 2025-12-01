// @ts-nocheck
import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'
import bcrypt from 'https://esm.sh/bcryptjs@2.4.3?target=deno'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error("Missing Authorization header");

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )
    
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    if (userError || !user || !user.email) throw new Error("Utilisateur non authentifié ou e-mail manquant.")

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Générer un code à 6 chiffres
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const codeHash = bcrypt.hashSync(code, 10);

    // Sauvegarder le hash avec vérification d'erreur
    const { error: insertError } = await supabaseAdmin.from('admin_otps').insert({
      user_id: user.id,
      code_hash: codeHash
    });

    if (insertError) {
      console.error("DB Insert Error:", insertError);
      throw new Error("Erreur lors de la sauvegarde du code de sécurité.");
    }

    // Envoyer le courriel
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    // Récupérer l'email validé depuis les variables d'environnement
    const fromEmail = Deno.env.get('RESEND_FROM_EMAIL') || "Inglis Dominion Security <onboarding@resend.dev>";

    // Fallback pour éviter de planter si la clé manque (pour le dev)
    if (!RESEND_API_KEY) {
      console.log(`[DEV MODE] OTP Code for ${user.email}: ${code}`);
      return new Response(JSON.stringify({ message: "Mode DEV: Code loggué console serveur." }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [user.email],
        subject: "Code de vérification - Accès carte",
        html: `
          <div style="font-family: sans-serif; padding: 20px; max-width: 500px; margin: 0 auto;">
            <h2 style="color: #333;">Demande d'accès aux données sensibles</h2>
            <p>Vous avez demandé à voir un numéro de carte complet. Utilisez ce code pour déverrouiller l'affichage :</p>
            <div style="background: #f4f4f5; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0;">
              <span style="letter-spacing: 8px; font-size: 32px; font-weight: bold; color: #000;">${code}</span>
            </div>
            <p style="color: #666; font-size: 14px;">Ce code expirera dans 15 minutes.</p>
            <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
            <p style="color: #999; font-size: 12px; text-align: center;">Envoyé par Inglis Dominion</p>
          </div>
        `
      })
    });

    if (!res.ok) {
      const errorData = await res.text();
      console.error("Resend API Error:", errorData);
      // On renvoie l'erreur brute pour le débogage si nécessaire, ou un message générique
      throw new Error(`Erreur Resend: ${errorData}`);
    }

    return new Response(JSON.stringify({ message: "Code envoyé" }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error("Function Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})