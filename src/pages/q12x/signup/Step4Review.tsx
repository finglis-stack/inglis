import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQ12xOnboarding } from '@/context/Q12xOnboardingContext';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess } from '@/utils/toast';

const Step4Review = () => {
  const navigate = useNavigate();
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
      showError("La création du compte a échoué.");
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
      showError(`Erreur lors de la création du profil marchand : ${insertError.message}`);
    } else {
      showSuccess("Compte créé avec succès ! Vous pouvez maintenant vous connecter.");
      resetData();
      navigate('/login');
    }
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4 p-4 border rounded-md">
        <div>
          <h4 className="font-semibold">Nom du commerce</h4>
          <p className="text-muted-foreground">{onboardingData.name}</p>
        </div>
        <div>
          <h4 className="font-semibold">Email</h4>
          <p className="text-muted-foreground">{onboardingData.email}</p>
        </div>
        <div>
          <h4 className="font-semibold">Informations sur l'entreprise</h4>
          <p className="text-muted-foreground">Numéro d'entreprise: {onboardingData.business_number || 'N/A'}</p>
          <p className="text-muted-foreground">Juridiction: {onboardingData.jurisdiction || 'N/A'}</p>
        </div>
        <div>
          <h4 className="font-semibold">Contact</h4>
          <p className="text-muted-foreground">Téléphone: {onboardingData.phoneNumber || 'N/A'}</p>
          <p className="text-muted-foreground">Adresse: {onboardingData.address?.street || 'N/A'}</p>
        </div>
      </div>
      <div className="flex justify-between mt-4">
        <Button variant="outline" type="button" onClick={() => navigate('/contact')} disabled={loading}>Précédent</Button>
        <Button onClick={handleSubmit} disabled={loading}>
          {loading ? 'Création en cours...' : 'Terminer l\'inscription'}
        </Button>
      </div>
    </div>
  );
};

export default Step4Review;