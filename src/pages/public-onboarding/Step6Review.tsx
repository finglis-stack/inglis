import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePublicOnboarding } from '@/context/PublicOnboardingContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess } from '@/utils/toast';
import { useTranslation } from 'react-i18next';

const Step6Review = () => {
  const navigate = useNavigate();
  const { t } = useTranslation('public-onboarding');
  const { formConfig, formData, resetData } = usePublicOnboarding();
  const [loading, setLoading] = useState(false);
  const [consentPI, setConsentPI] = useState(false);
  const [consentFinancial, setConsentFinancial] = useState(false);
  const [consentBiometric, setConsentBiometric] = useState(false);

  const selectedProgram = formConfig.cardPrograms.find(p => p.id === formData.selectedProgramId);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.functions.invoke('submit-public-onboarding', {
        body: { formId: formConfig.formDetails.id, profileData: formData },
      });
      if (error) throw error;
      
      showSuccess(t('review.success_message'));
      resetData();
      navigate('../step-7');
    } catch (err) {
      showError(err.message);
    } finally {
      setLoading(false);
    }
  };

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
        <Button variant="outline" type="button" onClick={() => navigate('../step-5')} disabled={loading}>{t('review.previous_button')}</Button>
        <Button onClick={handleSubmit} disabled={loading || !consentPI || !consentFinancial || !consentBiometric}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {t('review.submit_button')}
        </Button>
      </div>
    </div>
  );
};

export default Step6Review;