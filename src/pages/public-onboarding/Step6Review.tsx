import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePublicOnboarding } from '@/context/PublicOnboardingContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess } from '@/utils/toast';
import { useTranslation } from 'react-i18next';
import Lottie from "lottie-react";
import { getFunctionError } from '@/lib/utils';

type ProcessingState = 'idle' | 'submitting' | 'processing' | 'approved' | 'rejected' | 'error';

const Step6Review = () => {
  const navigate = useNavigate();
  const { t } = useTranslation('public-onboarding');
  const { formConfig, formData, resetData } = usePublicOnboarding();
  
  const [processingState, setProcessingState] = useState<ProcessingState>('idle');
  const [decisionData, setDecisionData] = useState<any>(null);
  const [consentPI, setConsentPI] = useState(false);
  const [consentFinancial, setConsentFinancial] = useState(false);
  const [consentBiometric, setConsentBiometric] = useState(false);
  const [animationData, setAnimationData] = useState<any>(null);
  const [applicationId, setApplicationId] = useState<string | null>(null);

  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const fallbackTimerRef = useRef<number | null>(null);
  const pollIntervalRef = useRef<number | null>(null);
  const hasNavigatedRef = useRef(false);

  useEffect(() => {
    fetch('/animations/ai-loading-model.json')
      .then((response) => response.json())
      .then((data) => setAnimationData(data));
  }, []);

  useEffect(() => {
    // Lancer le polling si on est en traitement et qu'on a un applicationId
    if (processingState === 'processing' && applicationId && !hasNavigatedRef.current) {
      // Poll toutes les 3 secondes le statut de la demande
      pollIntervalRef.current = window.setInterval(async () => {
        const { data: app, error } = await supabase
          .from('onboarding_applications')
          .select('id, status, approved_credit_limit, rejection_reason, selected_card_program_id')
          .eq('id', applicationId)
          .maybeSingle();

        if (!error && app && (app.status === 'approved' || app.status === 'rejected')) {
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
          }
          if (channelRef.current) {
            channelRef.current.unsubscribe();
            channelRef.current = null;
          }
          hasNavigatedRef.current = true;
          showSuccess(t('review.decision_received'));
          navigate('../step-7', { state: { status: app.status, decisionData: app, selectedProgramId: formData.selectedProgramId } });
          resetData();
        }
      }, 3000);
    }

    return () => {
      // Nettoyage si on quitte le composant
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, [processingState, applicationId, navigate, formData.selectedProgramId, resetData, t]);

  useEffect(() => {
    // Nettoyage global (subscription + timers) quand on quitte la page
    return () => {
      if (channelRef.current) {
        channelRef.current.unsubscribe();
        channelRef.current = null;
      }
      if (fallbackTimerRef.current) {
        clearTimeout(fallbackTimerRef.current);
        fallbackTimerRef.current = null;
      }
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, []);

  const selectedProgram = formConfig.cardPrograms.find(p => p.id === formData.selectedProgramId);

  const handleSubmit = async () => {
    setProcessingState('submitting');
    try {
      const { data, error } = await supabase.functions.invoke('submit-public-onboarding', {
        body: { formId: formConfig.formDetails.id, profileData: formData },
      });
      if (error) {
        throw new Error(getFunctionError(error, "Une erreur est survenue lors de la soumission."));
      }

      setApplicationId(data.applicationId);

      if (formConfig.formDetails.auto_approve_enabled) {
        setProcessingState('processing');

        // Canal temps réel: mise à jour de la demande
        const channel = supabase.channel(`application-decision-${data.applicationId}`)
          .on(
            'postgres_changes',
            { event: 'UPDATE', schema: 'public', table: 'onboarding_applications', filter: `id=eq.${data.applicationId}` },
            (payload) => {
              const newStatus = (payload as any)?.new?.status;
              if ((newStatus === 'approved' || newStatus === 'rejected') && !hasNavigatedRef.current) {
                hasNavigatedRef.current = true;
                if (pollIntervalRef.current) {
                  clearInterval(pollIntervalRef.current);
                  pollIntervalRef.current = null;
                }
                channel.unsubscribe();
                channelRef.current = null;
                showSuccess(t('review.decision_received'));
                navigate('../step-7', { state: { status: newStatus, decisionData: (payload as any).new, selectedProgramId: formData.selectedProgramId } });
                resetData();
              }
            }
          )
          .subscribe();

        channelRef.current = channel;
        
        // Fallback: au cas où le temps est trop long ou Realtime indisponible
        fallbackTimerRef.current = window.setTimeout(() => {
          if (!hasNavigatedRef.current) {
            if (channelRef.current) {
              channelRef.current.unsubscribe();
              channelRef.current = null;
            }
            if (pollIntervalRef.current) {
              clearInterval(pollIntervalRef.current);
              pollIntervalRef.current = null;
            }
            navigate('../step-7', { state: { status: 'pending', selectedProgramId: formData.selectedProgramId } });
            resetData();
          }
        }, 45000);

      } else {
        resetData();
        navigate('../step-7');
      }
    } catch (err) {
      if (err instanceof Error) {
        showError(err.message);
      } else {
        showError("Une erreur inconnue est survenue.");
      }
      setProcessingState('error');
    }
  };

  if (processingState === 'submitting' || processingState === 'processing') {
    return (
      <div className="text-center">
        {animationData && <Lottie animationData={animationData} loop={true} style={{ height: 200, margin: 'auto' }} />}
        <h1 className="text-2xl font-bold tracking-tight mt-4">{t('review.processing_title')}</h1>
        <p className="mt-2 text-muted-foreground">{t('review.processing_desc')}</p>
      </div>
    );
  }

  if (processingState === 'approved') {
    return (
      <div className="text-center">
        <CheckCircle className="mx-auto h-16 w-16 text-green-500 mb-4" />
        <h1 className="text-2xl font-bold tracking-tight">{t('review.approved_title')}</h1>
        <p className="mt-2 text-muted-foreground">{t('review.approved_desc')}</p>
        {decisionData?.approved_credit_limit > 0 && (
          <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-green-800">{t('review.credit_limit_approved')}</p>
            <p className="text-2xl font-bold text-green-900">{new Intl.NumberFormat('fr-CA', { style: 'currency', currency: 'CAD' }).format(decisionData.approved_credit_limit)}</p>
          </div>
        )}
        <Button onClick={() => window.location.reload()} className="mt-8">{t('confirmation.close_button')}</Button>
      </div>
    );
  }

  if (processingState === 'rejected') {
    return (
      <div className="text-center">
        <XCircle className="mx-auto h-16 w-16 text-red-500 mb-4" />
        <h1 className="text-2xl font-bold tracking-tight">{t('review.rejected_title')}</h1>
        <p className="mt-2 text-muted-foreground">{t('review.rejected_desc')}</p>
        {decisionData?.rejection_reason && (
          <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg text-left">
            <p className="text-sm font-semibold text-red-800">{t('review.rejection_reasons')}:</p>
            <ul className="list-disc pl-5 mt-2 text-sm text-red-700">
              {(decisionData.rejection_reason).split('; ').map((reason: string, i: number) => (
                <li key={i}>{reason}</li>
              ))}
            </ul>
          </div>
        )}
        <Button onClick={() => window.location.reload()} className="mt-8">{t('confirmation.close_button')}</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">{t('review.title')}</h2>
      <p className="text-muted-foreground mt-1">{t('review.subtitle')}</p>
      
      <Card>
        <CardContent className="p-6 space-y-4">
          <div><p className="text-sm font-semibold">{t('review.card_selected')}:</p><p>{selectedProgram?.program_name}</p></div>
          <div><p className="text-sm font-semibold">{t('review.name')}:</p><p>{formData.firstName} {formData.lastName}</p></div>
          <div><p className="text-sm font-semibold">{t('review.contact')}:</p><p>{formData.email} / {formData.phone}</p></div>
          <div><p className="text-sm font-semibold">{t('review.address')}:</p><p>{formData.address?.street}, {formData.address?.city}</p></div>
          <div><p className="text-sm font-semibold">{t('review.income')}:</p><p>{new Intl.NumberFormat('fr-CA', { style: 'currency', currency: 'CAD' }).format(formData.annualIncome)}</p></div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <div className="flex items-start space-x-3">
          <Checkbox id="consentPI" checked={consentPI} onCheckedChange={(checked) => setConsentPI(checked === true)} />
          <div className="grid gap-1.5 leading-none">
            <Label htmlFor="consentPI">{t('review.consent_pi_label')}</Label>
            <p className="text-sm text-muted-foreground">{t('review.consent_pi_desc')}</p>
          </div>
        </div>
        <div className="flex items-start space-x-3">
          <Checkbox id="consentFinancial" checked={consentFinancial} onCheckedChange={(checked) => setConsentFinancial(checked === true)} />
          <div className="grid gap-1.5 leading-none">
            <Label htmlFor="consentFinancial">{t('review.consent_financial_label')}</Label>
            <p className="text-sm text-muted-foreground">{t('review.consent_financial_desc')}</p>
          </div>
        </div>
        <div className="flex items-start space-x-3">
          <Checkbox id="consentBiometric" checked={consentBiometric} onCheckedChange={(checked) => setConsentBiometric(checked === true)} />
          <div className="grid gap-1.5 leading-none">
            <Label htmlFor="consentBiometric">{t('review.consent_biometric_label')}</Label>
            <p className="text-sm text-muted-foreground">{t('review.consent_biometric_desc')}</p>
          </div>
        </div>
      </div>

      <div className="flex justify-between mt-8">
        <Button variant="outline" type="button" onClick={() => navigate('../step-5')} disabled={processingState !== 'idle'}>{t('review.previous_button')}</Button>
        <Button onClick={handleSubmit} disabled={processingState !== 'idle' || !consentPI || !consentFinancial || !consentBiometric}>
          {processingState !== 'idle' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {t('review.submit_button')}
        </Button>
      </div>
    </div>
  );
};

export default Step6Review;