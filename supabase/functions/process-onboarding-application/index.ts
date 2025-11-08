// @ts-nocheck
import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const { applicationId } = await req.json();
  console.log(`[START] Processing application: ${applicationId}`);

  try {
    if (!applicationId) throw new Error("Application ID is required.");

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 1. Fetch all necessary data
    console.log("Step 1: Fetching application data...");
    const { data: application, error: appError } = await supabaseAdmin
      .from('onboarding_applications')
      .select('*, profiles(*), card_programs(*), onboarding_forms(*)')
      .eq('id', applicationId)
      .single();
    
    if (appError || !application) {
      console.error("Error fetching application:", appError);
      throw new Error("Application not found.");
    }
    console.log("Application data fetched successfully.");

    const profile = application.profiles;
    const program = application.card_programs;
    const form = application.onboarding_forms;
    const reasons = [];
    let isApproved = true;

    // --- RULE ENGINE ---
    console.log("Step 2: Running rule engine...");

    // Rule 1: Credit Bureau Verification
    if (form.is_credit_bureau_enabled) {
      console.log("Checking credit bureau status:", application.credit_bureau_verification_status);
      if (application.credit_bureau_verification_status === 'failed') {
        isApproved = false;
        reasons.push("Échec de la vérification d'identité au bureau de crédit.");
        console.log("Rule failed: Credit verification failed.");
      }
    }

    // Rule 2: Minimum Income
    if (program.min_income_requirement && application.annual_income < program.min_income_requirement) {
      isApproved = false;
      reasons.push(`Revenu annuel (${application.annual_income}) inférieur au minimum requis (${program.min_income_requirement}).`);
      console.log("Rule failed: Income too low.");
    }

    // Rule 3: Minimum Credit Score (if applicable)
    if (isApproved && program.min_credit_score_requirement && profile.sin) {
      console.log("Checking credit score...");
      const { data: report, error: reportError } = await supabaseAdmin.from('credit_reports').select('credit_score').eq('ssn', profile.sin).maybeSingle();
      if (reportError) {
        console.warn("Could not fetch credit report:", reportError.message);
      } else if (report && report.credit_score < program.min_credit_score_requirement) {
        isApproved = false;
        reasons.push(`Score de crédit (${report.credit_score}) inférieur au minimum requis (${program.min_credit_score_requirement}).`);
        console.log("Rule failed: Credit score too low.");
      } else if (!report) {
        console.log("No credit report found for SIN, skipping score check.");
      } else {
        console.log("Credit score check passed.");
      }
    }

    // --- DECISION & ACTION ---
    console.log(`Step 3: Decision is '${isApproved ? 'approved' : 'rejected'}'`);

    if (isApproved) {
      let approvedLimit = 0;
      if (program.card_type === 'credit') {
        if (form.credit_limit_type === 'fixed') {
          approvedLimit = form.fixed_credit_limit;
        } else { // Dynamic
          // Simple dynamic logic: 10% of annual income
          approvedLimit = application.annual_income * 0.10;
        }

        // Apply caps
        if (form.soft_credit_limit) {
          approvedLimit = Math.min(approvedLimit, form.soft_credit_limit);
        }
        if (program.max_credit_limit) {
          approvedLimit = Math.min(approvedLimit, program.max_credit_limit);
        }
        console.log("Calculated approved credit limit:", approvedLimit);
      }

      const createCardPayload = {
        profile_id: profile.id,
        card_program_id: program.id,
        credit_limit: approvedLimit,
        cash_advance_limit: approvedLimit * 0.1, // Example: 10% of credit limit
        interest_rate: program.default_interest_rate || 19.99, // Fallback
        cash_advance_rate: program.default_cash_advance_rate || 22.99, // Fallback
      };
      console.log("Invoking create-card function with payload:", createCardPayload);

      // Create card and account by invoking the create-card function
      const { error: createCardError } = await supabaseAdmin.functions.invoke('create-card', {
        body: createCardPayload,
      });

      if (createCardError) {
        console.error("Error from create-card function:", createCardError);
        throw createCardError;
      }
      console.log("Card created successfully.");

      // Update application status
      console.log("Updating application status to 'approved'.");
      await supabaseAdmin
        .from('onboarding_applications')
        .update({ status: 'approved', approved_credit_limit: approvedLimit })
        .eq('id', applicationId);
      
      // Update profile status
      console.log("Updating profile status to 'active'.");
      await supabaseAdmin
        .from('profiles')
        .update({ status: 'active' })
        .eq('id', profile.id);

    } else {
      // Update application status to rejected
      console.log("Updating application status to 'rejected' with reasons:", reasons.join('; '));
      await supabaseAdmin
        .from('onboarding_applications')
        .update({ status: 'rejected', rejection_reason: reasons.join('; ') })
        .eq('id', applicationId);
    }

    console.log(`[END] Successfully processed application: ${applicationId}`);
    return new Response(JSON.stringify({ success: true, decision: isApproved ? 'approved' : 'rejected', reasons }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error(`[FAIL] Error processing application ${applicationId}:`, error.message, error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});