import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PlusCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

const CardPrograms = () => {
  // Données fictives en attendant la suite
  const programs: any[] = [];

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Programmes de carte</h1>
        <Button asChild>
          <Link to="/dashboard/settings/card-programs/new">
            <PlusCircle className="mr-2 h-4 w-4" />
            Créer un programme
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Liste des programmes</CardTitle>
          <CardDescription>Voici la liste de tous les programmes de carte actifs et inactifs pour votre institution.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom du programme</TableHead>
                <TableHead>Identifiant</TableHead>
                <TableHead>Type de carte</TableHead>
                <TableHead>Statut</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {programs.length > 0 ? (
                programs.map((program) => (
                  <TableRow key={program.id}>
                    <TableCell>{program.name}</TableCell>
                    <TableCell>{program.id}</TableCell>
                    <TableCell>{program.type}</TableCell>
                    <TableCell>{program.status}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="text-center h-24">
                    Aucun programme de carte trouvé.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default CardPrograms;