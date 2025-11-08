import { Button } from '@/components/ui/button';
import { CheckCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { usePublicOnboarding } from '@/context/PublicOnboardingContext';
import { useNavigate } from 'react-router-dom';

const Step8Confirmation = () => {
  const { t } = useTranslation('public-onboarding');
  const { formConfig } = usePublicOnboarding();
  const navigate = useNavigate();

  return (
    <div className="text-center">
      <CheckCircle className="mx-auto h-16 w-16 text-green-500 mb-4" />
      <h1 className="text-2xl font-bold tracking-tight">{t('confirmation.title')}</h1>
      <p className="mt-2 text-muted-foreground">
        {t('confirmation.description', { institutionName: formConfig.institution.name })}
      </p>
      <Button onClick={() => navigate('/')} className="mt-8">
        {t('confirmation.close_button')}
      </Button>
    </div>
  );
};

export default Step8Confirmation;