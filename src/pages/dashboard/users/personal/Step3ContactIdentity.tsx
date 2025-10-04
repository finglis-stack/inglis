import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNewUser } from '@/context/NewUserContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

const Step3ContactIdentity = () => {
  const navigate = useNavigate();
  const { userData, updateUser } = useNewUser();
  const [formData, setFormData] = useState({
    phone: userData.phone || '',
    email: userData.email || '',
    // Assure que la date est correctement formatée et évite les problèmes de fuseau horaire
    dob: userData.dob ? new Date(userData.dob).toISOString().split('T')[0] : '',
    sin: userData.sin || '',
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.id]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    updateUser(formData);
    navigate('/dashboard/users/new/personal/step-4');
  };

  return (
    <Card className="w-full max-w-lg mx-auto">
      <CardHeader>
        <CardTitle>Contact & Vérification (3/5)</CardTitle>
        <CardDescription>Informations pour contacter et vérifier l'utilisateur.</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="phone">Numéro de téléphone</Label>
            <Input id="phone" type="tel" required value={formData.phone} onChange={handleChange} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="email">Adresse e-mail</Label>
            <Input id="email" type="email" required value={formData.email} onChange={handleChange} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="dob">Date de naissance</Label>
            <Input id="dob" type="date" required value={formData.dob} onChange={handleChange} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="sin">Numéro d'assurance sociale (Optionnel)</Label>
            <Input id="sin" value={formData.sin} onChange={handleChange} />
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="outline" type="button" onClick={() => navigate('/dashboard/users/new/personal/step-2')}>Précédent</Button>
          <Button type="submit">Suivant</Button>
        </CardFooter>
      </form>
    </Card>
  );
};

export default Step3ContactIdentity;