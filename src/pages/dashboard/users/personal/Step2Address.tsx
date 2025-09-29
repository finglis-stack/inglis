import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNewUser } from '@/context/NewUserContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

const Step2Address = () => {
  const navigate = useNavigate();
  const { userData, updateUser } = useNewUser();
  const [address, setAddress] = useState(userData.address || {});

  const handleChange = (e) => {
    setAddress({ ...address, [e.target.id]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    updateUser({ address });
    navigate('/dashboard/users/new/personal/step-3');
  };

  return (
    <Card className="w-full max-w-lg mx-auto">
      <CardHeader>
        <CardTitle>Adresse (2/4)</CardTitle>
        <CardDescription>Veuillez entrer l'adresse de résidence principale.</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="street">Adresse</Label>
            <Input id="street" required value={address.street || ''} onChange={handleChange} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="city">Ville</Label>
              <Input id="city" required value={address.city || ''} onChange={handleChange} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="province">Province/État</Label>
              <Input id="province" required value={address.province || ''} onChange={handleChange} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="postalCode">Code Postal</Label>
              <Input id="postalCode" required value={address.postalCode || ''} onChange={handleChange} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="country">Pays</Label>
              <Input id="country" required value={address.country || ''} onChange={handleChange} />
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="outline" type="button" onClick={() => navigate('/dashboard/users/new/personal/step-1')}>Précédent</Button>
          <Button type="submit">Suivant</Button>
        </CardFooter>
      </form>
    </Card>
  );
};

export default Step2Address;