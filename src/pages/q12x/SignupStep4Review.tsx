import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQ12xOnboarding } from '@/context/Q12xOnboardingContext';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess } from '@/utils/toast';
import { useTranslation } from 'react-i18next';

const Step4Review = () => {
  const navigate = useNavigate();
  const { t } = useTranslation('q12x');
  const { onboardingData, resetData } = useQ12xOnboarding();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    const { name, email, password, business_number, jurisdiction, address, phoneNumber } = onboardingData;

    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({ email, password });

    if (signUpError) {
      showError(signUpError.message);
      setLoading(false);
      return;
    }

    if (!signUpData.user) {
      showError(t('signup.step4.creationFailed'));
      setLoading(false);
      return;
    }

    const { error: insertError } = await supabase.from('merchant_accounts').insert({
      user_id: signUpData.user.id,
      name,
      business_number,
      jurisdiction,
      address,
      phone_number: phoneNumber,
    });

    if (insertError) {
      showError(t('signup.step4.profileCreationFailed', { message: insertError.message }));
    } else {
      showSuccess(t('signup.step4.success'));
      resetData();
      navigate('/login');
    }
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4 p-4 border rounded-md">
        <div>
          <h4 className="font-semibold">{t('signup.step4.businessName')}</h4>
          <p className="text-muted-foreground">{onboardingData.name}</p>
        </div>
        <div>
          <h4 className="font-semibold">{t('signup.step4.email')}</h4>
          <p className="text-muted-foreground">{onboardingData.email}</p>
        </div>
        <div>
          <h4 className="font-semibold">{t('signup.step4.businessInfo')}</h4>
          <p className="text-muted-foreground">{t('signup.step4.businessNumber')}: {onboardingData.business_number || t('signup.step4.notProvided')}</p>
          <p className="text-muted-foreground">{t('signup.step4.jurisdiction')}: {onboardingData.jurisdiction || t('signup.step4.notProvided')}</p>
        </div>
        <div>
          <h4 className="font-semibold">{t('signup.step4.contact')}</h4>
          <p className="text-muted-foreground">{t('signup.step4.phone')}: {onboardingData.phoneNumber || t('signup.step4.notProvided')}</p>
          <p className="text-muted-foreground">{t('signup.step4.address')}: {onboardingData.address?.street || t('signup.step4.notProvided')}</p>
        </div>
      </div>
      <div className="flex justify-between mt-4">
        <Button variant="outline" type="button" onClick={() => navigate('/contact')} disabled={loading}>{t('signup.step4.previous')}</Button>
        <Button onClick={handleSubmit} disabled={loading}>
          {loading ? t('signup.step4.submitting') : t('signup.step4.submit')}
        </Button>
      </div>
    </div>
  );
};

export default Step4Review;