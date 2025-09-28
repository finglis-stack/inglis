import { useNavigate } from 'react-router-dom';
import { OnboardingLayout } from './OnboardingLayout';
import { Button } from '@/components/ui/button';

const Welcome = () => {
  const navigate = useNavigate();

  return (
    <OnboardingLayout>
      <h1 className="text-3xl font-bold mb-4">Bienvenue chez Inglis Dominium</h1>
      <div className="space-y-4 text-muted-foreground">
        <p>
          Inglis Dominium est un réseau de paiement indépendant qui permet aux institutions financières, aux commerces et aux entreprises d'émettre leurs propres cartes de paiement virtuelles et physiques.
        </p>
        <p>
          En continuant, vous reconnaissez avoir lu et accepté nos <a href="/terms" target="_blank" className="underline hover:text-primary">Conditions d'utilisation</a> ainsi que notre <a href="/privacy" target="_blank" className="underline hover:text-primary">Politique de confidentialité</a>, qui régit l'utilisation de vos informations personnelles et corporatives.
        </p>
      </div>
      <Button onClick={() => navigate('/onboarding/institution-info')} className="w-full mt-8">
        J'accepte et je continue
      </Button>
    </OnboardingLayout>
  );
};

export default Welcome;