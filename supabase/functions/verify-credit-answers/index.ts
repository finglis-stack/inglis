// @ts-nocheck
import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'
import bcrypt from 'https://esm.sh/bcryptjs@2.4.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const { verificationId, answers } = await req.json();
    if (!verificationId || !answers) throw new Error("Verification ID and answers are required.");

    const supabaseAdmin = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');

    const { data: verification, error: fetchError } = await supabaseAdmin
      .from('credit_verifications')
      .select('encrypted_answers, expires_at, status')
      .eq('id', verificationId)
      .single();

    if (fetchError || !verification) throw new Error("Invalid or expired verification session.");
    if (new Date(verification.expires_at) < new Date()) throw new Error("Verification session has expired.");
    if (verification.status !== 'pending') throw new Error("This verification has already been attempted.");

    const isCorrect = bcrypt.compareSync(JSON.stringify(answers), verification.encrypted_answers);

    if (isCorrect) {
      await supabaseAdmin.from('credit_verifications').update({ status: 'passed' }).eq('id', verificationId);
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
    } else {
      await supabaseAdmin.from('credit_verifications').update({ status: 'failed' }).eq('id', verificationId);
      return new Response(JSON.stringify({ success: false }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
    }
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 });
  }
});