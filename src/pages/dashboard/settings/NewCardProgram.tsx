import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useTranslation } from 'react-i18next';

const NewCardProgram = () => {
  const { t } = useTranslation();
  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">{t('dashboard.newCardProgram.title')}</h1>
        <Button variant="outline" asChild>
          <Link to="/dashboard/settings/card-programs">
            {t('dashboard.newCardProgram.cancel')}
          </Link>
        </Button>
      </div>

      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>{t('dashboard.newCardProgram.formTitle')}</CardTitle>
          <CardDescription>
            {t('dashboard.newCardProgram.formDesc')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">{t('dashboard.newCardProgram.wip')}</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default NewCardProgram;