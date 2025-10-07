import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const NewCardProgram = () => {
  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Créer un nouveau programme de carte</h1>
        <Button variant="outline" asChild>
          <Link to="/dashboard/settings/card-programs">
            Annuler
          </Link>
        </Button>
      </div>

      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Nouveau Programme</CardTitle>
          <CardDescription>
            Le formulaire de création de programme sera disponible ici.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">En construction...</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default NewCardProgram;