import { Link } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { CreditCard } from 'lucide-react';

const Settings = () => {
  return (
    <div>
      <h1 className="text-3xl font-bold">Paramètres</h1>
      <p className="mt-4 text-muted-foreground">Gérez les paramètres de votre compte et de votre institution ici.</p>

      <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Link to="/dashboard/settings/card-programs">
          <Card className="hover:bg-gray-50 transition-colors h-full">
            <CardHeader className="flex flex-row items-center justify-between">
              <div className="space-y-1">
                <CardTitle>Programmes de carte</CardTitle>
                <CardDescription>Gérez vos programmes de carte existants ou créez-en de nouveaux.</CardDescription>
              </div>
              <CreditCard className="h-8 w-8 text-muted-foreground" />
            </CardHeader>
          </Card>
        </Link>
      </div>
    </div>
  );
};
export default Settings;