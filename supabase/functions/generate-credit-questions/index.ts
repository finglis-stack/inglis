// @ts-nocheck
import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'
import bcrypt from 'https://esm.sh/bcryptjs@2.4.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

  // Question 1: Institution for a specific account type
  const accountTypes = ['Credit Card', 'Auto Loan', 'Mortgage'];
  for (const type of accountTypes) {
    const entry = creditHistory.find(item => item.type === type && !usedEntries.has(item.details));
    if (entry) {
      const match = entry.details.match(/Issuer: (.*?)(,|$)/);
      if (match) {
        const correctAnswer = match[1].trim();
        const distractors = ['RBC', 'TD', 'BMO', 'CIBC', 'Scotiabank', 'Desjardins'].filter(b => b !== correctAnswer).slice(0, 3);
        questions.push({
          id: 'q1',
          text: `Vous avez un(e) ${type} avec l'une de ces institutions. Laquelle ?`,
          options: shuffle([correctAnswer, ...distractors]),
          answer: correctAnswer,
        });
        usedEntries.add(entry.details);
        break;
      }
    }
  }

  // Question 2: Approximate credit limit
  const ccEntry = creditHistory.find(item => item.type === 'Credit Card' && item.details.includes('Limit:') && !usedEntries.has(item.details));
  if (ccEntry) {
    const limitMatch = ccEntry.details.match(/Limit: \$([\d,]+\.\d{2})/);
    if (limitMatch) {
      const limit = parseFloat(limitMatch[1].replace(',', ''));
      const ranges = [
        { label: `Moins de ${Math.floor(limit * 0.5)} $`, value: `0-${Math.floor(limit * 0.5)}` },
        { label: `Entre ${Math.floor(limit * 0.5)} $ et ${Math.floor(limit * 1.5)} $`, value: `${Math.floor(limit * 0.5)}-${Math.floor(limit * 1.5)}` },
        { label: `Entre ${Math.floor(limit * 1.5)} $ et ${Math.floor(limit * 2.5)} $`, value: `${Math.floor(limit * 1.5)}-${Math.floor(limit * 2.5)}` },
        { label: `Plus de ${Math.floor(limit * 2.5)} $`, value: `${Math.floor(limit * 2.5)}-Infinity` },
      ];
      const correctAnswer = ranges[1].value;
      questions.push({
        id: 'q2',
        text: `Quelle est la limite de crédit approximative de l'une de vos cartes de crédit ?`,
        options: ranges.map(r => r.label),
        values: ranges.map(r => r.value),
        answer: correctAnswer,
      });
      usedEntries.add(ccEntry.details);
    }
  }

  // Question 3: Number of active accounts
  if (creditHistory.length > 0) {
    const activeAccounts = creditHistory.filter(item => item.status === 'Active').length;
    const options = shuffle([activeAccounts, activeAccounts + 2, activeAccounts - 1 > 0 ? activeAccounts - 1 : 0, activeAccounts + 5].filter((v, i, a) => a.indexOf(v) === i)).slice(0, 4);
    questions.push({
      id: 'q3',
      text: 'Combien de comptes de crédit actifs (prêts, cartes, etc.) avez-vous actuellement ?',
      options: options.map(String),
      answer: String(activeAccounts),
    });
  }

  return questions.slice(0, 3);
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const { sin, formId } = await req.json();
    if (!sin || !formId) throw new Error("SIN and Form ID are required.");

    const supabaseAdmin = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');

    const { data: report, error: reportError } = await supabaseAdmin.from('credit_reports').select('credit_history').eq('ssn', sin).single();
    if (reportError || !report || !report.credit_history) {
      return new Response(JSON.stringify({ status: 'no_report' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
    }

    const questions = generateQuestions(report.credit_history);
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
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 });
  }
});