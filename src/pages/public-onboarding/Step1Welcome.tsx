import { useNavigate } from 'react-router-dom';
import { usePublicOnboarding } from '@/context/PublicOnboardingContext';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';

const Step1Welcome = () => {
  const navigate = useNavigate();
  const { t } = useTranslation('public-onboarding');
  const { formConfig } = usePublicOnboarding();

  return (
    <div className="text-center">
      <h1 className="text-2xl font-bold tracking-tight">{formConfig.formDetails.name || t('welcome.title')}</h1>
      <p className="mt-2 text-muted-foreground">
        {formConfig.formDetails.description || t('welcome.description', { institutionName: formConfig.institution.name })}
      </p>
      <div className="mt-8">
        <p className="text-sm text-muted-foreground">
          {t('welcome.instructions')}
        </p>
        <Button onClick={() => navigate('step-2')} className="mt-4 w-full sm:w-auto">
          {t('welcome.start_button')}
        </Button>
      </div>
    </div>
  );
};

export default Step1Welcome;