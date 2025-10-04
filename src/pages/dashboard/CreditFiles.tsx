import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';

const CreditFiles = () => {
  return (
    <div>
      <h1 className="text-3xl font-bold">Dossier de crédit</h1>
      <p className="mt-4 text-muted-foreground">Consultez et gérez les dossiers de crédit ici.</p>

      <Card className="mt-8 max-w-lg">
        <CardHeader>
          <CardTitle>Accès Direct au Bureau de Crédit</CardTitle>
          <CardDescription>
            Ouvrir l'interface sécurisée pour interroger directement la base de données du bureau de crédit à l'aide d'un numéro d'assurance sociale.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <Link to="/credit-report-access" target="_blank" rel="noopener noreferrer">
              Voir dossier de crédit
              <ExternalLink className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};
export default CreditFiles;