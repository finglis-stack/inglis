import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useNewUser } from '@/context/NewUserContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

const Step1Name = () => {
  const navigate = useNavigate();
  const { userData, updateUser } = useNewUser();
  const [fullName, setFullName] = useState(userData.fullName || '');

  const handleSubmit = (e) => {
    e.preventDefault();
    updateUser({ fullName });
    navigate('/dashboard/users/new/personal/step-2');
  };

  return (
    <Card className="w-full max-w-lg mx-auto">
      <CardHeader>
        <CardTitle>Identité (1/4)</CardTitle>
        <CardDescription>Veuillez entrer le nom complet tel qu'il figure sur une pièce d'identité officielle.</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent>
          <div className="grid gap-2">
            <Label htmlFor="fullName">Nom complet</Label>
            <Input id="fullName" required value={fullName} onChange={(e) => setFullName(e.target.value)} />
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

export default Step1Name;