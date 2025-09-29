import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useNewUser } from '@/context/NewUserContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

const Step1BusinessInfo = () => {
  const navigate = useNavigate();
  const { userData, updateUser } = useNewUser();
  const [formData, setFormData] = useState({
    legalName: userData.legalName || '',
    operatingName: userData.operatingName || '',
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.id]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    updateUser(formData);
    navigate('/dashboard/users/new/corporate/step-2');
  };

  return (
    <Card className="w-full max-w-lg mx-auto">
      <CardHeader>
        <CardTitle>Informations sur l'entreprise (1/4)</CardTitle>
        <CardDescription>Entrez les détails de base de l'entreprise.</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="legalName">Nom légal de l'entreprise</Label>
            <Input id="legalName" required value={formData.legalName} onChange={handleChange} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="operatingName">Nom commercial (si différent)</Label>
            <Input id="operatingName" value={formData.operatingName} onChange={handleChange} />
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="ghost" asChild><Link to="/dashboard/users/new">Annuler</Link></Button>
          <Button type="submit">Suivant</Button>
        </CardFooter>
      </form>
    </Card>
  );
};

export default Step1BusinessInfo;