import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { OnboardingLayout } from './OnboardingLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { showError, showSuccess } from '@/utils/toast';
import { useTranslation } from 'react-i18next';

const CreateAccount = () => {
  const navigate = useNavigate();
  const { t } = useTranslation(['onboarding', 'common']);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const savedData = localStorage.getItem('onboardingData');
    if (!savedData) {
      showError(t('createAccount.fillInfoFirstError'));
      navigate('/onboarding/institution-info');
    }
  }, [navigate, t]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const savedData = localStorage.getItem('onboardingData');
    if (!savedData) {
      showError(t('createAccount.missingDataError'));
      navigate('/onboarding/institution-info');
      setLoading(false);
      return;
    }

    const { error: signUpError, data: signUpData } = await supabase.auth.signUp({
      email,
      password,
    });

    if (signUpError) {
      showError(signUpError.message);
      setLoading(false);
      return;
    }

    if (!signUpData.user) {
        showError(t('createAccount.creationFailedError'));
        setLoading(false);
        return;
    }

    const allData = JSON.parse(savedData);
    const finalData = {
        user_id: signUpData.user.id,
        name: allData.name,
        address: allData.address,
        city: allData.city,
        country: allData.country,
        institution_type: allData.institutionType,
        jurisdiction: allData.jurisdiction,
        phone_number: allData.phoneNumber,
    };

    const { error: insertError } = await supabase.from('institutions').insert(finalData);

    if (insertError) {
      showError(t('createAccount.saveInfoError', { message: insertError.message }));
    } else {
      showSuccess(t('createAccount.successMessage'));
      localStorage.removeItem('onboardingData');
      navigate('/dashboard');
    }
    
    setLoading(false);
  };

  return (
    <OnboardingLayout>
      <h1 className="text-3xl font-bold mb-2">{t('createAccount.title')}</h1>
      <p className="text-muted-foreground mb-6">{t('createAccount.subtitle')}</p>
      <form onSubmit={handleSubmit}>
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="email">{t('createAccount.emailLabel')}</Label>
            <Input
              id="email"
              type="email"
              placeholder={t('createAccount.emailPlaceholder')}
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="password">{t('createAccount.passwordLabel')}</Label>
            <Input 
              id="password" 
              type="password" 
              required 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div className="flex justify-between mt-4">
            <Button type="button" variant="outline" onClick={() => navigate('/onboarding/contact-info')}>
                {t('previous', { ns: 'common' })}
            </Button>
            <Button type="submit" disabled={loading}>
                {loading ? t('createAccount.loadingButton') : t('createAccount.submitButton')}
            </Button>
          </div>
        </div>
      </form>
    </OnboardingLayout>
  );
};

export default CreateAccount;