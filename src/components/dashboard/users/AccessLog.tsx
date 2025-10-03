import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Clock } from 'lucide-react';

const AccessLog = ({ logs }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Historique d'accès</CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-48">
          <ul className="space-y-2">
            {logs.map((log, index) => (
              <li key={index} className="text-sm text-muted-foreground flex items-center gap-2">
                <Clock className="h-4 w-4 flex-shrink-0" />
                <span>
                  Consulté par <strong>{log.visitor_email || 'Utilisateur inconnu'}</strong> le {new Date(log.created_at).toLocaleString('fr-CA')}
                </span>
              </li>
            ))}
            {logs.length === 0 && <p>Aucun accès enregistré.</p>}
          </ul>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default AccessLog;