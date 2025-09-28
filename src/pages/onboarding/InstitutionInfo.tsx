import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { OnboardingLayout } from './OnboardingLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { showError } from '@/utils/toast';

const InstitutionInfo = () => {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('');

  useEffect(() => {
    const savedData = localStorage.getItem('onboardingData');
    if (savedData) {
      const data = JSON.parse(savedData);
      setName(data.name || '');
      setAddress(data.address || '');
      setCity(data.city || '');
      setCountry(data.country || '');
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name) {
        showError("Le nom de l'institution est requis.");
        return;
    }

    const savedData = localStorage.getItem('onboardingData');
    const data = savedData ? JSON.parse(savedData) : {};
    
    const updatedData = { ...data, name, address, city, country };
    localStorage.setItem('onboardingData', JSON.stringify(updatedData));
    
    navigate('/onboarding/institution-type');
  };

  return (
    <OnboardingLayout>
      <h1 className="text-3xl font-bold mb-2">Détails de l'institution (2/5)</h1>
      <p className="text-muted-foreground mb-6">Commençons par les informations de base.</p>
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
        </div>
        <div className="flex justify-between mt-6">
            <Button type="button" variant="outline" onClick={() => navigate('/onboarding/welcome')}>
                Précédent
            </Button>
            <Button type="submit">
                Suivant
            </Button>
        </div>
      </form>
    </OnboardingLayout>
  );
};

export default InstitutionInfo;