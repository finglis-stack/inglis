import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { User, Building } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useNewUser } from '@/context/NewUserContext';
import { useEffect } from 'react';

export const NewUserTypeSelection = () => {
  const navigate = useNavigate();
  const { resetUser, updateUser } = useNewUser();

  useEffect(() => {
    resetUser();
  }, [resetUser]);

  const handleSelect = (type) => {
    updateUser({ type });
    if (type === 'personal') {
      navigate('/dashboard/users/new/personal/step-1');
    } else {
      navigate('/dashboard/users/new/corporate/step-1');
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold">Ajouter un nouvel utilisateur</h1>
        <p className="text-muted-foreground mt-2">Quel type de compte souhaitez-vous créer ?</p>
      </div>
      <div className="grid md:grid-cols-2 gap-8">
        <Card className="flex flex-col">
          <CardHeader className="flex-grow">
            <User className="h-10 w-10 mb-4 text-primary" />
            <CardTitle>Personnel</CardTitle>
            <CardDescription>Pour les individus et les clients particuliers.</CardDescription>
          </CardHeader>
          <div className="p-6 pt-0">
            <Button className="w-full" onClick={() => handleSelect('personal')}>Sélectionner</Button>
          </div>
        </Card>
        <Card className="flex flex-col">
          <CardHeader className="flex-grow">
            <Building className="h-10 w-10 mb-4 text-primary" />
            <CardTitle>Corporatif</CardTitle>
            <CardDescription>Pour les entreprises, les sociétés et les organisations.</CardDescription>
          </CardHeader>
          <div className="p-6 pt-0">
            <Button className="w-full" onClick={() => handleSelect('corporate')}>Sélectionner</Button>
          </div>
        </Card>
      </div>
       <div className="text-center mt-8">
          <Button variant="ghost" asChild>
            <Link to="/dashboard/users">Annuler</Link>
          </Button>
        </div>
    </div>
  );
};