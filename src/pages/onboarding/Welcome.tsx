import { useNavigate } from 'react-router-dom';
import { OnboardingLayout } from './OnboardingLayout';
import { Button } from '@/components/ui/button';
import { useTranslation, Trans } from 'react-i18next';

const Welcome = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <OnboardingLayout>
      <h1 className="text-3xl font-bold mb-4">{t('onboarding.welcome.title')}</h1>
      <div className="space-y-4 text-muted-foreground">
        <p>
          {t('onboarding.welcome.p1')}
        </p>
        <p>
          <Trans
            i18nKey="onboarding.welcome.p2"
            components={[
              <a href="/terms" target="_blank" className="underline hover:text-primary" />,
              <a href="/privacy" target="_blank" className="underline hover:text-primary" />,
            ]}
          />
        </p>
      </div>
      <Button onClick={() => navigate('/onboarding/institution-info')} className="w-full mt-8">
        {t('onboarding.welcome.acceptButton')}
      </Button>
    </OnboardingLayout>
  );
};

export default Welcome;