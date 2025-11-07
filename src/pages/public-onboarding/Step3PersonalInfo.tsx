import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePublicOnboarding } from '@/context/PublicOnboardingContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const Step3PersonalInfo = () => {
  const navigate = useNavigate();
  const { formData, updateData } = usePublicOnboarding();
  const [localData, setLocalData] = useState({
    fullName: formData.fullName || '',
    email: formData.email || '',
    phone: formData.phone || '',
    dob: formData.dob || '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalData({ ...localData, [e.target.id]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateData(localData);
    // La navigation vers l'étape 4 sera implémentée ensuite
    // Pour l'instant, cela prépare la structure
    alert("Prochaine étape à implémenter !");
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <h2 className="text-xl font-semibold">Vos informations personnelles</h2>
      <p className="text-muted-foreground mt-1">Veuillez remplir les champs ci-dessous.</p>
      
      <div className="grid gap-4 pt-4">
        <div className="grid gap-2">
          <Label htmlFor="fullName">Nom complet</Label>
          <Input id="fullName" value={localData.fullName} onChange={handleChange} required />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label htmlFor="email">Adresse e-mail</Label>
            <Input id="email" type="email" value={localData.email} onChange={handleChange} required />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="phone">Numéro de téléphone</Label>
            <Input id="phone" type="tel" value={localData.phone} onChange={handleChange} required />
          </div>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="dob">Date de naissance</Label>
          <Input id="dob" type="date" value={localData.dob} onChange={handleChange} required />
        </div>
      </div>

      <div className="flex justify-between mt-8">
        <Button variant="outline" type="button" onClick={() => navigate('../step-2')}>Précédent</Button>
        <Button type="submit">Suivant</Button>
      </div>
    </form>
  );
};

export default Step3PersonalInfo;