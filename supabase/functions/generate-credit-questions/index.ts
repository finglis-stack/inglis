// @ts-nocheck
import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'
import bcrypt from 'https://esm.sh/bcryptjs@2.4.3'
import { crypto } from "https://deno.land/std@0.177.0/crypto/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Helper to hash data (SHA-256) for blind index matching
async function hashData(text) {
  if (!text) return null;
  const msgUint8 = new TextEncoder().encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Helper to shuffle an array
const shuffle = (array) => {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
};

// Helper to generate questions
const generateQuestions = (creditHistory) => {
  const questions = [];
  const usedEntries = new Set();

  // Question 1: Institution for any account type
  const issuerEntry = creditHistory.find(item => (item.details.includes('Issuer:') || item.details.includes('Émetteur:')) && !usedEntries.has(item.details));
  if (issuerEntry) {
    const match = issuerEntry.details.match(/Issuer: (.*?)(,|$)/) || issuerEntry.details.match(/Émetteur: (.*?)(,|$)/);
    if (match) {
      const correctAnswer = match[1].trim();
      const distractors = ['RBC', 'TD', 'BMO', 'CIBC', 'Scotiabank', 'Desjardins'].filter(b => b !== correctAnswer).slice(0, 3);
      questions.push({
        id: 'q1',
        text: `Vous avez un produit financier de type "${issuerEntry.type}" avec l'une de ces institutions. Laquelle ?`,
        options: shuffle([correctAnswer, ...distractors]),
        answer: correctAnswer,
      });
      usedEntries.add(issuerEntry.details);
    }
  }

  // Question 2: Approximate balance
  const balanceEntry = creditHistory.find(item => (item.details.includes('Solde:') || item.details.includes('Balance:')) && !usedEntries.has(item.details));
  if (balanceEntry) {
    const balanceMatch = balanceEntry.details.match(/(?:Solde|Balance): ([\d,.]+)\s*\$/) || balanceEntry.details.match(/(?:Solde|Balance): \$([\d,.]+)/);
    if (balanceMatch) {
      const balance = parseFloat(balanceMatch[1].replace(',', '.'));
      const ranges = [
        { label: `Moins de ${Math.floor(balance * 0.5)} $`, value: `0-${Math.floor(balance * 0.5)}` },
        { label: `Entre ${Math.floor(balance * 0.5)} $ et ${Math.floor(balance * 1.5)} $`, value: `${Math.floor(balance * 0.5)}-${Math.floor(balance * 1.5)}` },
        { label: `Entre ${Math.floor(balance * 1.5)} $ et ${Math.floor(balance * 2.5)} $`, value: `${Math.floor(balance * 1.5)}-${Math.floor(balance * 2.5)}` },
        { label: `Plus de ${Math.floor(balance * 2.5)} $`, value: `${Math.floor(balance * 2.5)}-Infinity` },
      ];
      const correctAnswer = ranges[1].value;
      questions.push({
        id: 'q2',
        text: `Quel est le solde approximatif de l'un de vos comptes ?`,
        options: ranges.map(r => r.label),
        values: ranges.map(r => r.value),
        answer: correctAnswer,
      });
      usedEntries.add(balanceEntry.details);
    }
  }

  // Question 3: Number of active accounts
  if (creditHistory.length > 0) {
    const activeAccounts = creditHistory.filter(item => item.status === 'Active' || item.status === 'Actif').length;
    const options = shuffle([activeAccounts, activeAccounts + 2, activeAccounts - 1 > 0 ? activeAccounts - 1 : 0, activeAccounts + 5].filter((v, i, a) => a.indexOf(v) === i)).slice(0, 4);
    questions.push({
      id: 'q3',
      text: 'Combien de comptes de crédit actifs (prêts, cartes, etc.) avez-vous actuellement ?',
      options: options.map(String),
      answer: String(activeAccounts),
    });
  }

  // Fallback Question: Year of account opening
  if (questions.length < 3 && creditHistory.length > 0) {
    const entry = creditHistory[0];
    const year = new Date(entry.date).getFullYear();
    const distractors = [year - 1, year + 1, year - 2].filter(y => y !== year);
    questions.push({
      id: 'q4_fallback',
      text: `En quelle année l'un de vos comptes de type "${entry.type}" a-t-il été rapporté ?`,
      options: shuffle([String(year), ...distractors.map(String)]),
      answer: String(year),
    });
  }

  return questions.slice(0, 3);
};

async function processReport(creditHistory, formId, supabaseAdmin) {
  const questions = generateQuestions(creditHistory);
  if (questions.length < 3) {
    return new Response(JSON.stringify({ status: 'insufficient_data' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
  }

  const correctAnswers = questions.map(q => q.answer);
  const encryptedAnswers = bcrypt.hashSync(JSON.stringify(correctAnswers), 10);
  const expires_at = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes expiry

  const { data: verification, error: insertError } = await supabaseAdmin
    .from('credit_verifications')
    .insert({ form_id: formId, encrypted_answers: encryptedAnswers, expires_at })
    .select('id')
    .single();
  if (insertError) throw insertError;

  const publicQuestions = questions.map(({ answer, values, ...q }) => ({ ...q, options: values ? q.options : shuffle(q.options) }));

  return new Response(JSON.stringify({ status: 'questions_generated', verificationId: verification.id, questions: publicQuestions }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200,
  });
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const { sin, formId } = await req.json();
    if (!sin || !formId) throw new Error("SIN and Form ID are required.");

    const supabaseAdmin = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');

    // Hacher le NAS reçu pour le comparer avec la base de données
    const sinHash = await hashData(sin);

    const { data: reportData, error: reportError } = await supabaseAdmin
      .from('credit_reports')
      .select('credit_history')
      .eq('ssn', sinHash)
      .single();

    let creditHistory = reportData?.credit_history;

    // Tentative avec le format XXX-XXX-XXX si le format brut échoue
    if (reportError || !creditHistory || creditHistory.length === 0) {
      const formattedSin = `${sin.slice(0, 3)}-${sin.slice(3, 6)}-${sin.slice(6, 9)}`;
      const formattedSinHash = await hashData(formattedSin);
      
      const { data: reportDataRetry, error: reportErrorRetry } = await supabaseAdmin
        .from('credit_reports')
        .select('credit_history')
        .eq('ssn', formattedSinHash)
        .single();
      
      const creditHistoryRetry = reportDataRetry?.credit_history;

      if (reportErrorRetry || !creditHistoryRetry || creditHistoryRetry.length === 0) {
        return new Response(JSON.stringify({ status: 'no_report' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
      }
      
      creditHistory = creditHistoryRetry;
    }

    return processReport(creditHistory, formId, supabaseAdmin);

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 });
  }
});