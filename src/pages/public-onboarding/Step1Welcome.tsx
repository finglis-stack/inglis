import { useNavigate } from 'react-router-dom';
import { usePublicOnboarding } from '@/context/PublicOnboardingContext';
import { Button } from '@/components/ui/button';

const Step1Welcome = () => {
  const navigate = useNavigate();
  const { formConfig } = usePublicOnboarding();

  return (
    <div className="text-center">
      <h1 className="text-2xl font-bold tracking-tight">{formConfig.formDetails.name}</h1>
      <p className="mt-2 text-muted-foreground">
        {formConfig.formDetails.description || `Demande de carte auprès de ${formConfig.institution.name}`}
      </p>
      <div className="mt-8">
        <p className="text-sm text-muted-foreground">
          Ce formulaire vous guidera à travers les étapes nécessaires pour compléter votre demande.
        </p>
        <Button onClick={() => navigate('step-2')} className="mt-4 w-full sm:w-auto">
          Commencer
        </Button>
      </div>
    </div>
  );
};

export default Step1Welcome;