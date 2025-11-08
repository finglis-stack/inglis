// @ts-nocheck
import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'
import { GoogleGenerativeAI } from 'https://esm.sh/@google/generative-ai'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

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

  const { applicationId, imageFront, imageBack } = await req.json();

  try {
    if (!applicationId || !imageFront || !imageBack) {
      throw new Error("ID de demande et les deux images sont requis.");
    }

    await logProgress(applicationId, "Processus KYC démarré. Images reçues.", "info");

    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    if (!GEMINI_API_KEY) {
      throw new Error("La clé API Gemini n'est pas configurée.");
    }

    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro-latest" });

    const prompt = `
      Analyze these two images of an ID card (front and back). 
      Provide the response in JSON format ONLY, with no other text or markdown.
      The JSON object should have the following structure:
      {
        "quality": "good" | "blurry" | "glare" | "unreadable",
        "quality_reason": "A brief explanation if quality is not 'good'.",
        "fullName": "Extracted full name as a string.",
        "dateOfBirth": "Extracted date of birth in YYYY-MM-DD format."
      }
      If you cannot extract a piece of information, set its value to null.
    `;

    const imageParts = [
      { inlineData: { mimeType: 'image/jpeg', data: imageFront.split(',')[1] } },
      { inlineData: { mimeType: 'image/jpeg', data: imageBack.split(',')[1] } }
    ];

    let result;
    try {
      await logProgress(applicationId, "Appel à l'API Gemini 1.5 Pro...", "info");
      result = await model.generateContent([prompt, ...imageParts]);
    } catch (geminiError) {
      await logProgress(applicationId, `Erreur directe de l'API Gemini: ${geminiError.message}`, "error");
      throw new Error(`L'appel à l'API Gemini a échoué: ${geminiError.message}`);
    }

    const response = await result.response;
    const analysisText = response.text();
    const analysisResult = JSON.parse(analysisText.replace(/```json\n?/, '').replace(/```$/, ''));

    await logProgress(applicationId, `Analyse Gemini terminée. Qualité: ${analysisResult.quality}.`, "info");

    if (analysisResult.quality !== 'good') {
      await supabaseAdmin.from('onboarding_applications').update({ kyc_status: 'awaiting_resubmission' }).eq('id', applicationId);
      await logProgress(applicationId, `Qualité d'image insuffisante: ${analysisResult.quality_reason}`, "warning");
      return new Response(JSON.stringify({ success: false, error: 'image_quality', message: `Qualité d'image insuffisante: ${analysisResult.quality_reason}` }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 });
    }

    const { data: application, error: appError } = await supabaseAdmin
      .from('onboarding_applications')
      .select('profiles(full_name, dob)')
      .eq('id', applicationId)
      .single();
    if (appError) throw appError;

    const profile = application.profiles;
    const nameMatch = profile.full_name.toLowerCase() === analysisResult.fullName.toLowerCase();
    const dobMatch = profile.dob === analysisResult.dateOfBirth;

    await logProgress(applicationId, `Comparaison des données. Nom: ${nameMatch ? 'OK' : 'Échec'}. Date de naissance: ${dobMatch ? 'OK' : 'Échec'}.`, "info");

    if (nameMatch && dobMatch) {
      await supabaseAdmin.from('onboarding_applications').update({ kyc_status: 'passed' }).eq('id', applicationId);
      await logProgress(applicationId, "Vérification KYC réussie.", "success");
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
    } else {
      await supabaseAdmin.from('onboarding_applications').update({ kyc_status: 'failed' }).eq('id', applicationId);
      await logProgress(applicationId, "Échec de la vérification KYC: les informations ne correspondent pas.", "error");
      throw new Error("Les informations sur la pièce d'identité ne correspondent pas à celles de la demande.");
    }

  } catch (error) {
    if (applicationId) {
      await logProgress(applicationId, `Erreur inattendue: ${error.message}`, "error");
    }
    return new Response(JSON.stringify({ success: false, error: 'server_error', message: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});