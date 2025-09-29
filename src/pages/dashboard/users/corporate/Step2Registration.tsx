import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNewUser } from '@/context/NewUserContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

const Step2Registration = () => {
  const navigate = useNavigate();
  const { userData, updateUser } = useNewUser();
  const [formData, setFormData] = useState({
    businessNumber: userData.businessNumber || '',
    jurisdiction: userData.jurisdiction || '',
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.id]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    updateUser(formData);
    navigate('/dashboard/users/new/corporate/step-3');
  };

  return (
    <Card className="w-full max-w-lg mx-auto">
      <CardHeader>
        <CardTitle>Enregistrement (2/4)</CardTitle>
        <CardDescription>Détails d'enregistrement officiels de l'entreprise.</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="businessNumber">Numéro d'entreprise (NEQ, etc.)</Label>
            <Input id="businessNumber" required value={formData.businessNumber} onChange={handleChange} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="jurisdiction">Juridiction d'incorporation</Label>
            <Input id="jurisdiction" required value={formData.jurisdiction} onChange={handleChange} />
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="outline" type="button" onClick={() => navigate('/dashboard/users/new/corporate/step-1')}>Précédent</Button>
          <Button type="submit">Suivant</Button>
        </CardFooter>
      </form>
    </Card>
  );
};

export default Step2Registration;