import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQ12xOnboarding } from '@/context/Q12xOnboardingContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const Step2BusinessInfo = () => {
  const navigate = useNavigate();
  const { onboardingData, updateData } = useQ12xOnboarding();
  const [formData, setFormData] = useState({
    business_number: onboardingData.business_number || '',
    jurisdiction: onboardingData.jurisdiction || '',
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.id]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    updateData(formData);
    navigate('/contact');
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-2">
        <Label htmlFor="business_number">Numéro d'entreprise (Optionnel)</Label>
        <Input id="business_number" value={formData.business_number} onChange={handleChange} />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="jurisdiction">Juridiction (Optionnel)</Label>
        <Input id="jurisdiction" value={formData.jurisdiction} onChange={handleChange} />
      </div>
      <div className="flex justify-between mt-4">
        <Button variant="outline" type="button" onClick={() => navigate('/')}>Précédent</Button>
        <Button type="submit">Suivant</Button>
      </div>
    </form>
  );
};

export default Step2BusinessInfo;