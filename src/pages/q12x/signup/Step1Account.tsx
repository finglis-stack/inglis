import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQ12xOnboarding } from '@/context/Q12xOnboardingContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { showError } from '@/utils/toast';

const Step1Account = () => {
  const navigate = useNavigate();
  const { onboardingData, updateData } = useQ12xOnboarding();
  const [formData, setFormData] = useState({
    name: onboardingData.name || '',
    email: onboardingData.email || '',
    password: '',
  });
  const [agreed, setAgreed] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.id]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!agreed) {
      showError("Vous devez accepter les conditions d'utilisation.");
      return;
    }
    updateData(formData);
    navigate('/business-info');
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-2">
        <Label htmlFor="name">Nom du commerce</Label>
        <Input id="name" required value={formData.name} onChange={handleChange} />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="email">Adresse e-mail</Label>
        <Input id="email" type="email" required value={formData.email} onChange={handleChange} />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="password">Mot de passe</Label>
        <Input id="password" type="password" required value={formData.password} onChange={handleChange} />
      </div>
      <div className="flex items-center space-x-2">
        <Checkbox id="terms" checked={agreed} onCheckedChange={(checked) => setAgreed(checked === true)} />
        <Label htmlFor="terms" className="text-sm font-normal">
          J'accepte les <a href="#" className="underline">conditions d'utilisation</a> et la <a href="#" className="underline">politique de confidentialité</a>.
        </Label>
      </div>
      <Button type="submit" className="w-full">Suivant</Button>
    </form>
  );
};

export default Step1Account;