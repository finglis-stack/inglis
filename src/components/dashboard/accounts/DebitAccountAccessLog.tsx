import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Clock } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const DebitAccountAccessLog = ({ logs, className }) => {
  const { t } = useTranslation('dashboard');
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{t('userProfile.accessLogTitle')}</CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-48">
          <ul className="space-y-2">
            {logs.map((log, index) => (
              <li key={index} className="text-sm text-muted-foreground flex items-center gap-2">
                <Clock className="h-4 w-4 flex-shrink-0" />
                <span>
                  {t('userProfile.accessedBy')} <strong>{log.visitor_email || t('userProfile.unknownUser')}</strong> {t('userProfile.on')} {new Date(log.created_at).toLocaleString('fr-CA')}
                </span>
              </li>
            ))}
            {logs.length === 0 && <p>{t('userProfile.noAccess')}</p>}
          </ul>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default DebitAccountAccessLog;