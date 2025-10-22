import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQ12xOnboarding } from '@/context/Q12xOnboardingContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const Step3Contact = () => {
  const navigate = useNavigate();
  const { onboardingData, updateData } = useQ12xOnboarding();
  const [address, setAddress] = useState(onboardingData.address || {});
  const [phoneNumber, setPhoneNumber] = useState(onboardingData.phoneNumber || '');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAddress({ ...address, [e.target.id]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateData({ address, phoneNumber });
    navigate('/review');
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-2">
        <Label htmlFor="phone_number">Numéro de téléphone (Optionnel)</Label>
        <Input id="phone_number" type="tel" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="street">Adresse (Optionnel)</Label>
        <Input id="street" value={address.street || ''} onChange={handleChange} placeholder="Rue" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Input id="city" value={address.city || ''} onChange={handleChange} placeholder="Ville" />
        <Input id="province" value={address.province || ''} onChange={handleChange} placeholder="Province" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Input id="postalCode" value={address.postalCode || ''} onChange={handleChange} placeholder="Code Postal" />
        <Input id="country" value={address.country || ''} onChange={handleChange} placeholder="Pays" />
      </div>
      <div className="flex justify-between mt-4">
        <Button variant="outline" type="button" onClick={() => navigate('/business-info')}>Précédent</Button>
        <Button type="submit">Suivant</Button>
      </div>
    </form>
  );
};

export default Step3Contact;