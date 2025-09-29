import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

const Users = () => {
  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Utilisateurs</h1>
        <Button asChild>
          <Link to="/dashboard/users/new">
            <PlusCircle className="mr-2 h-4 w-4" />
            Ajouter un utilisateur
          </Link>
        </Button>
      </div>
      <p className="mt-4 text-muted-foreground">Gérez les comptes utilisateurs ici.</p>
    </div>
  );
};
export default Users;