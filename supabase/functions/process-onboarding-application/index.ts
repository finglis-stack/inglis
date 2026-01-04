// @ts-nocheck
import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

// --- Helpers ---
const getInitials = (name) => {
  if (!name) return 'XX';
  const parts = name.split(' ');
  if (parts.length > 1) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return (name.substring(0, 2)).toUpperCase();
};

const generateRandomLetters = (length) => {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
};

const generateRandomDigits = (length) => {
  return Math.floor(Math.pow(10, length - 1) + Math.random() * 9 * Math.pow(10, length - 1)).toString();
};

const calculateLuhn = (numberString) => {
  let sum = 0;
  let alternate = false;
  for (let i = numberString.length - 1; i >= 0; i--) {
    let n = parseInt(numberString.charAt(i), 10);
    if (alternate) {
      n *= 2;
      if (n > 9) {
        n = (n % 10) + 1;
      }
    }
    sum += n;
    alternate = !alternate;
  }
  return (sum * 9) % 10;
};

const convertAlphanumericToNumeric = (alphanumeric) => {
    return alphanumeric.split('').map(char => {
        if (char >= '0' && char <= '9') {
            return char;
        }
        if (char >= 'A' && char <= 'Z') {
            return (char.charCodeAt(0) - 65 + 10).toString();
        }
        return '';
    }).join('');
}

const getEmailHtml = (details) => {
  return `
  <!DOCTYPE html>
  <html lang="fr">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Votre nouvelle carte est prête</title>
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 0; background-color: #f8f9fa; }
      .container { max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.08); }
      .header { padding: 24px; text-align: center; background-color: #f1f3f5; }
      .content { padding: 32px; }
      .card-wrapper { margin: 24px 0; }
      .card-image { width: 100%; border-radius: 12px; display: block; }
      .button { display: inline-block; background-color: #1F2937; color: #ffffff !important; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold; margin-top: 24px; }
      .footer { padding: 24px; text-align: center; font-size: 12px; color: #6c757d; background-color: #f1f3f5; }
      .footer a { color: #6c757d; text-decoration: none; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h2>Votre nouvelle carte est prête !</h2>
      </div>
      <div class="content">
        <p>Bonjour ${details.profileName},</p>
        <p>Félicitations ! Votre nouvelle carte du programme <strong>${details.programName}</strong> a été créée avec succès. Voici un aperçu de votre carte :</p>
        <div class="card-wrapper">
          <img src="${details.cardImageUrl}" alt="Aperçu de la carte ${details.programName}" class="card-image" />
        </div>
        <p>Pour activer votre carte, la première étape est de configurer votre numéro d'identification personnel (NIP). Veuillez cliquer sur le bouton ci-dessous pour le faire en toute sécurité.</p>
        <a href="${details.pinSetupLink}" class="button" style="color: #ffffff !important;">Configurer mon NIP de carte</a>
        <p style="font-size: 12px; color: #6c757d; margin-top: 24px;">Ce lien est unique et expirera dans 24 heures. Si vous n'avez pas demandé cette carte, veuillez contacter notre support immédiatement.</p>
      </div>
      <div class="footer">
        <p><a href="https://www.inglisdominion.ca/">&copy; ${new Date().getFullYear()} Inglis Dominion. Tous droits réservés.</a></p>
      </div>
    </div>
  </body>
  </html>
  `;
};

const logProgress = async (applicationId, message, status = 'info') => {
  const logEntry = { timestamp: new Date().toISOString(), message, status };
  console.log(`[${applicationId}] [${status}] ${message}`);
  
  const { data: currentApp, error: fetchError } = await supabaseAdmin
    .from('onboarding_applications')
    .select('processing_log')
    .eq('id', applicationId)
    .single();

  if (fetchError) {
    console.error("Failed to fetch current logs:", fetchError.message);
  }

  const existingLogs = currentApp?.processing_log || [];
  const newLogs = [...existingLogs, logEntry];

  await supabaseAdmin
    .from('onboarding_applications')
    .update({ processing_log: newLogs })
    .eq('id', applicationId);
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const { applicationId } = await req.json();
  
  try {
    if (!applicationId) throw new Error("Application ID is required.");
    await logProgress(applicationId, "Début du traitement de la demande.", "info");

    const { data: application, error: appError } = await supabaseAdmin
      .from('onboarding_applications')
      .select('*, profiles(*), card_programs(*), onboarding_forms(*)')
      .eq('id', applicationId)
      .single();
    
    if (appError || !application) throw new Error("Demande non trouvée.");
    await logProgress(applicationId, "Données récupérées avec succès.", "success");

    const profile = application.profiles;
    const program = application.card_programs;
    const form = application.onboarding_forms;
    const reasons = [];
    let isApproved = true;

    // Facteurs de décision
    let occupationFactor = 1.0;
    let ageFactor = 1.0;
    let t4Factor = 1.0;
    let latestCreditScore: number | null = null;

    // Âge
    let applicantAge: number | null = null;
    if (profile?.dob) {
      const birth = new Date(profile.dob);
      if (!isNaN(birth.getTime())) {
        const today = new Date();
        let age = today.getFullYear() - birth.getFullYear();
        const m = today.getMonth() - birth.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
        applicantAge = age;
      }
    }

    if (applicantAge !== null) {
      await logProgress(applicationId, `Âge du demandeur: ${applicantAge}`, "info");
      if (applicantAge < 18) {
        isApproved = false;
        reasons.push("Âge inférieur au minimum légal (18 ans).");
        await logProgress(applicationId, "Règle échouée: Âge minimal.", "warning");
      } else if (applicantAge < 21) {
        ageFactor = 0.6;
      } else if (applicantAge < 25) {
        ageFactor = 0.8;
      } else if (applicantAge > 75) {
        ageFactor = 0.7;
      } else if (applicantAge > 55) {
        ageFactor = 0.9;
      }
    }

    // Projection financière selon statut d'emploi (approximation prudente)
    switch (application.employment_status) {
      case 'employed':
        occupationFactor = 1.0; break;
      case 'self_employed':
        occupationFactor = 0.85; break;
      case 'student':
        occupationFactor = 0.5; break;
      case 'retired':
        occupationFactor = 0.7; break;
      case 'unemployed':
        occupationFactor = 0.3; break;
      default:
        occupationFactor = 0.9;
    }

    // Salaire T4 vs salaire annuel
    const hasT4 = typeof application.t4_income === 'number' && application.t4_income > 0;
    const hasAnnual = typeof application.annual_income === 'number' && application.annual_income > 0;
    if (hasT4 && hasAnnual) {
      if (application.t4_income > application.annual_income * 1.5) {
        reasons.push("Incohérence: T4 nettement supérieur au revenu annuel déclaré.");
      } else if (application.t4_income < application.annual_income * 0.5) {
        reasons.push("Incohérence: T4 nettement inférieur au revenu annuel déclaré.");
      }
      t4Factor = application.t4_income >= application.annual_income ? 1.1 : 0.9;
    } else if (hasT4) {
      t4Factor = 1.05;
    } else {
      t4Factor = 0.95;
    }

    await logProgress(applicationId, "Démarrage du moteur de règles...", "info");

    if (form.is_credit_bureau_enabled) {
      await logProgress(applicationId, `Vérification du statut du bureau de crédit: ${application.credit_bureau_verification_status}`, "info");
      if (application.credit_bureau_verification_status === 'failed') {
        isApproved = false;
        reasons.push("Échec de la vérification d'identité au bureau de crédit.");
        await logProgress(applicationId, "Règle échouée: Vérification de crédit négative.", "warning");
      }
    }

    if (program.min_income_requirement && application.annual_income < program.min_income_requirement) {
      isApproved = false;
      reasons.push(`Revenu annuel (${application.annual_income}) inférieur au minimum requis (${program.min_income_requirement}).`);
      await logProgress(applicationId, "Règle échouée: Revenu insuffisant.", "warning");
    }

    if (isApproved && program.min_credit_score_requirement) {
       if (!profile.sin) {
          await logProgress(applicationId, "Aucun NAS fourni. La vérification du crédit est ignorée.", "info");
       } else {
          await logProgress(applicationId, "Vérification du score de crédit en cours...", "info");
          
          // Détection de format Legacy (Bcrypt) vs Nouveau (SHA-256)
          if (profile.sin.startsWith('$2')) {
             await logProgress(applicationId, "ATTENTION: Format de NAS obsolète (Bcrypt) détecté. Impossible de faire la correspondance avec le bureau de crédit.", "error");
             // On ne rejette pas automatiquement pour ne pas bloquer, mais on log l'erreur
          } else {
             // Recherche par Blind Index (SHA-256)
             const { data: report, error: reportError } = await supabaseAdmin
                .from('credit_reports')
                .select('credit_score, credit_history')
                .eq('ssn', profile.sin)
                .maybeSingle();

             if (reportError) {
                await logProgress(applicationId, `Erreur technique lors de la récupération du dossier: ${reportError.message}`, "warning");
             } else if (!report) {
                await logProgress(applicationId, "Aucun dossier de crédit trouvé pour ce NAS.", "warning");
                // Optionnel: Rejeter si le dossier est introuvable ? Pour l'instant on laisse passer.
             } else {
                await logProgress(applicationId, `Score de crédit trouvé: ${report.credit_score}`, "success");
                latestCreditScore = report.credit_score;

                const history = report.credit_history || {};
                const late = Number(history.late_payments ?? history.latePayments ?? 0);
                const utilization = Number(history.utilization ?? 0);
                const lengthYears = Number(history.length_years ?? history.lengthYears ?? 0);

                if (late > 2 || utilization > 0.8) {
                  reasons.push("Historique de crédit à risque (retards fréquents ou utilisation élevée).");
                  await logProgress(applicationId, "Observation: Historique de crédit à risque.", "warning");
                }
                
                if (report.credit_score < program.min_credit_score_requirement) {
                   isApproved = false;
                   reasons.push(`Score de crédit (${report.credit_score}) inférieur au minimum requis (${program.min_credit_score_requirement}).`);
                   await logProgress(applicationId, "Règle échouée: Score de crédit trop bas.", "warning");
                } else {
                   await logProgress(applicationId, "Règle réussie: Score de crédit suffisant.", "success");
                }
             }
          }
       }
    }

    await logProgress(applicationId, `Décision: ${isApproved ? 'Approuvée' : 'Rejetée'}`, "info");

    if (isApproved) {
      let approvedLimit = 0;
      if (program.card_type === 'credit') {
        if (form.credit_limit_type === 'fixed') {
          approvedLimit = form.fixed_credit_limit;
        } else {
          const baseIncome = hasAnnual ? application.annual_income : (hasT4 ? application.t4_income : 0);
          const baseLimit = baseIncome ? baseIncome * 0.10 : 0;
          approvedLimit = Math.round(baseLimit * occupationFactor * ageFactor * t4Factor);

          // Ajustement par score de crédit (si disponible)
          if (typeof latestCreditScore === 'number') {
            const s = latestCreditScore;
            const scoreFactor = s >= 750 ? 1.2 : s >= 700 ? 1.1 : s >= 650 ? 1.0 : s >= 600 ? 0.9 : 0.7;
            approvedLimit = Math.round(approvedLimit * scoreFactor);
          }
        }
        if (form.soft_credit_limit) approvedLimit = Math.min(approvedLimit, form.soft_credit_limit);
        if (program.max_credit_limit) approvedLimit = Math.min(approvedLimit, program.max_credit_limit);
        await logProgress(applicationId, `Limite de crédit calculée: ${approvedLimit}`, "info");
      }

      await logProgress(applicationId, "Création de la carte et du compte associé...", "info");
      
      const user_initials = getInitials(profile.type === 'personal' ? profile.full_name : profile.legal_name);
      const issuer_id = program.bin;
      const random_letters = generateRandomLetters(2);
      const unique_identifier = generateRandomDigits(7);
      const base_number_for_luhn = convertAlphanumericToNumeric(`${user_initials}${issuer_id}${random_letters}${unique_identifier}`);
      const check_digit = calculateLuhn(base_number_for_luhn);
      const expires_at = new Date();
      expires_at.setFullYear(expires_at.getFullYear() + 4);
      const expires_at_db = expires_at.toISOString().split('T')[0];
      const expires_at_display = `${(expires_at.getMonth() + 1).toString().padStart(2, '0')}/${expires_at.getFullYear().toString().slice(-2)}`;
      const pinSetupToken = crypto.randomUUID();
      const tokenExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

      const { data: newCard, error: insertError } = await supabaseAdmin.from('cards').insert({
        profile_id: profile.id, card_program_id: program.id, user_initials, issuer_id, random_letters,
        unique_identifier, check_digit, status: 'active', expires_at: expires_at_db,
        pin_setup_token: pinSetupToken, pin_setup_token_expires_at: tokenExpiresAt,
      }).select('id').single();
      if (insertError) throw insertError;

      if (program.card_type === 'credit') {
        const { error: accountError } = await supabaseAdmin.from('credit_accounts').insert({ 
          profile_id: profile.id, card_id: newCard.id, credit_limit: approvedLimit, 
          cash_advance_limit: approvedLimit * 0.1, interest_rate: program.default_interest_rate || 19.99,
          cash_advance_rate: program.default_cash_advance_rate || 22.99, currency: program.currency,
        });
        if (accountError) throw accountError;
      } else if (program.card_type === 'debit') {
        const { error: accountError } = await supabaseAdmin.from('debit_accounts').insert({ 
          profile_id: profile.id, card_id: newCard.id, currency: program.currency 
        });
        if (accountError) throw accountError;
      }
      
      await logProgress(applicationId, "Carte créée avec succès.", "success");

      if (profile.email) {
        const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
        const fromEmail = Deno.env.get('RESEND_FROM_EMAIL') || 'Inglis Dominion <onboarding@resend.dev>';
        if (RESEND_API_KEY) {
          const emailHtml = getEmailHtml({
            profileName: profile.type === 'personal' ? profile.full_name : profile.legal_name,
            programName: program.program_name,
            cardImageUrl: program.card_image_url || 'https://www.inglisdominion.ca/card-default.jpg',
            pinSetupLink: `https://www.inglisdominion.ca/set-card-pin/${pinSetupToken}`,
          });
          await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${RESEND_API_KEY}` },
            body: JSON.stringify({ from: fromEmail, to: [profile.email], subject: "Votre nouvelle carte Inglis Dominion est prête", html: emailHtml }),
          });
          await logProgress(applicationId, "Email d'activation envoyé au client.", "info");
        }
      }

      await logProgress(applicationId, "Mise à jour du statut de la demande à 'approved'.", "info");
      await supabaseAdmin.from('onboarding_applications').update({ status: 'approved', approved_credit_limit: approvedLimit }).eq('id', applicationId);
      
      await logProgress(applicationId, "Mise à jour du statut du profil à 'active'.", "info");
      await supabaseAdmin.from('profiles').update({ status: 'active' }).eq('id', profile.id);

    } else {
      await logProgress(applicationId, `Mise à jour du statut à 'rejected'. Raisons: ${reasons.join('; ')}`, "info");
      await supabaseAdmin.from('onboarding_applications').update({ status: 'rejected', rejection_reason: reasons.join('; ') }).eq('id', applicationId);
    }

    await logProgress(applicationId, "Traitement terminé.", "success");
    return new Response(JSON.stringify({ success: true, decision: isApproved ? 'approved' : 'rejected', reasons }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200,
    });

  } catch (error) {
    await logProgress(applicationId, `ERREUR: ${error.message}`, "error");
    await supabaseAdmin.from('onboarding_applications').update({ status: 'pending', rejection_reason: `Erreur de traitement: ${error.message}` }).eq('id', applicationId);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400,
    });
  }
});