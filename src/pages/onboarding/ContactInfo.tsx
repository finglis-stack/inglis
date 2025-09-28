import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { OnboardingLayout } from './OnboardingLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const ContactInfo = () => {
  const navigate = useNavigate();
  const [phoneNumber, setPhoneNumber] = useState('');

  useEffect(() => {
    const savedData = localStorage.getItem('onboardingData');
    if (savedData) {
      const data = JSON.parse(savedData);
      setPhoneNumber(data.phoneNumber || '');
    } else {
        navigate('/onboarding/institution-info');
    }
  }, [navigate]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const savedData = localStorage.getItem('onboardingData');
    const data = savedData ? JSON.parse(savedData) : {};
    
    const updatedData = { ...data, phoneNumber };
    localStorage.setItem('onboardingData', JSON.stringify(updatedData));
    
    navigate('/onboarding/create-account');
  };

  return (
    <OnboardingLayout>
      <h1 className="text-3xl font-bold mb-2">Détails de l'institution (4/5)</h1>
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
            <Button type="submit">
                Suivant
            </Button>
          </div>
        </div>
      </form>
    </OnboardingLayout>
  );
};

export default ContactInfo;