import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const CreditFiles = () => {
  const { t } = useTranslation();
  return (
    <div>
      <h1 className="text-3xl font-bold">{t('dashboard.creditFiles.title')}</h1>
      <p className="mt-4 text-muted-foreground">{t('dashboard.creditFiles.subtitle')}</p>

      <Card className="mt-8 max-w-lg">
        <CardHeader>
          <CardTitle>{t('dashboard.creditFiles.directAccessTitle')}</CardTitle>
          <CardDescription>
            {t('dashboard.creditFiles.directAccessDesc')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <Link to="/credit-report-access" target="_blank" rel="noopener noreferrer">
              {t('dashboard.creditFiles.viewCreditReport')}
              <ExternalLink className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};
export default CreditFiles;