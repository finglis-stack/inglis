import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { OnboardingLayout } from './OnboardingLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { showError, showSuccess } from '@/utils/toast';
import { Session } from '@supabase/supabase-js';

const InstitutionDetails = () => {
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate('/onboarding/create-account');
      } else {
        setSession(session);
      }
    });
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session) return;

    setLoading(true);
    const { error } = await supabase.from('institutions').insert({
      user_id: session.user.id,
      name,
      address,
      city,
      country,
    });

    if (error) {
      showError(error.message);
    } else {
      showSuccess('Informations enregistrées avec succès !');
      navigate('/dashboard');
    }
    setLoading(false);
  };

  return (
    <OnboardingLayout>
      <h1 className="text-3xl font-bold mb-2">Détails de l'institution</h1>
      <p className="text-muted-foreground mb-6">Parlez-nous un peu de vous.</p>
      <form onSubmit={handleSubmit}>
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Nom de l'institution</Label>
            <Input id="name" required value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="address">Adresse</Label>
            <Input id="address" value={address} onChange={(e) => setAddress(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="city">Ville</Label>
            <Input id="city" value={city} onChange={(e) => setCity(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="country">Pays</Label>
            <Input id="country" value={country} onChange={(e) => setCountry(e.target.value)} />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Enregistrement...' : 'Terminer'}
          </Button>
        </div>
      </form>
    </OnboardingLayout>
  );
};

export default InstitutionDetails;