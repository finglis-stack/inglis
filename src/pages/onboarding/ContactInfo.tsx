import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { OnboardingLayout } from './OnboardingLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { showError, showSuccess } from '@/utils/toast';
import { Session } from '@supabase/supabase-js';

const ContactInfo = () => {
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate('/onboarding/create-account');
      } else {
        setSession(session);
      }
    });

    const savedData = localStorage.getItem('onboardingData');
    if (savedData) {
      const data = JSON.parse(savedData);
      setPhoneNumber(data.phoneNumber || '');
    } else {
        navigate('/onboarding/institution-info');
    }
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session) return;

    setLoading(true);
    const savedData = localStorage.getItem('onboardingData');
    if (!savedData) {
        showError("Une erreur est survenue. Veuillez recommencer.");
        navigate('/onboarding/institution-info');
        setLoading(false);
        return;
    }

    const allData = JSON.parse(savedData);

    const finalData = {
        user_id: session.user.id,
        name: allData.name,
        address: allData.address,
        city: allData.city,
        country: allData.country,
        institution_type: allData.institutionType,
        jurisdiction: allData.jurisdiction,
        phone_number: phoneNumber,
    };

    const { error } = await supabase.from('institutions').insert(finalData);

    if (error) {
      showError(error.message);
    } else {
      showSuccess('Profil complété avec succès !');
      localStorage.removeItem('onboardingData');
      navigate('/dashboard');
    }
    setLoading(false);
  };

  return (
    <OnboardingLayout>
      <h1 className="text-3xl font-bold mb-2">Détails de l'institution (3/3)</h1>
      <p className="text-muted-foreground mb-6">Presque terminé !</p>
      <form onSubmit={handleSubmit}>
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="phone">Numéro de téléphone</Label>
            <Input id="phone" type="tel" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} />
          </div>
          <div className="flex justify-between mt-4">
            <Button type="button" variant="outline" onClick={() => navigate('/onboarding/institution-type')}>
                Précédent
            </Button>
            <Button type="submit" disabled={loading}>
                {loading ? 'Enregistrement...' : 'Terminer'}
            </Button>
          </div>
        </div>
      </form>
    </OnboardingLayout>
  );
};

export default ContactInfo;