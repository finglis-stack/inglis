import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { OnboardingLayout } from './OnboardingLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { showError, showSuccess } from '@/utils/toast';

const CreateAccount = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const savedData = localStorage.getItem('onboardingData');
    if (!savedData) {
      showError("Veuillez d'abord remplir les informations sur l'institution.");
      navigate('/onboarding/institution-info');
    }
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const savedData = localStorage.getItem('onboardingData');
    if (!savedData) {
      showError("Les données d'intégration sont manquantes. Veuillez recommencer.");
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
        showError("La création du compte a échoué. Veuillez réessayer.");
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
      showError(`Erreur lors de la sauvegarde des informations : ${insertError.message}`);
    } else {
      showSuccess('Compte créé et profil complété avec succès !');
      localStorage.removeItem('onboardingData');
      navigate('/dashboard');
    }
    
    setLoading(false);
  };

  return (
    <OnboardingLayout>
      <h1 className="text-3xl font-bold mb-2">Créer votre compte (4/4)</h1>
      <p className="text-muted-foreground mb-6">Finalisez votre inscription.</p>
      <form onSubmit={handleSubmit}>
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="nom@exemple.com"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="password">Mot de passe</Label>
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
                Précédent
            </Button>
            <Button type="submit" disabled={loading}>
                {loading ? 'Création...' : 'Terminer et créer le compte'}
            </Button>
          </div>
        </div>
      </form>
    </OnboardingLayout>
  );
};

export default CreateAccount;