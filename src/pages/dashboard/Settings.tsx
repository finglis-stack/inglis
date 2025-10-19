import { Link } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { CreditCard, KeyRound, Store } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const Settings = () => {
  const { t } = useTranslation('dashboard');
  return (
    <div>
      <h1 className="text-3xl font-bold">{t('settings.title')}</h1>
      <p className="mt-4 text-muted-foreground">{t('settings.subtitle')}</p>

      <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Link to="/dashboard/settings/card-programs">
          <Card className="hover:bg-gray-50 transition-colors h-full">
            <CardHeader className="flex flex-row items-center justify-between">
              <div className="space-y-1">
                <CardTitle>{t('settings.cardPrograms')}</CardTitle>
                <CardDescription>{t('settings.cardProgramsDesc')}</CardDescription>
              </div>
              <CreditCard className="h-8 w-8 text-muted-foreground" />
            </CardHeader>
          </Card>
        </Link>
        <Link to="/dashboard/settings/api">
          <Card className="hover:bg-gray-50 transition-colors h-full">
            <CardHeader className="flex flex-row items-center justify-between">
              <div className="space-y-1">
                <CardTitle>{t('settings.apiKeys')}</CardTitle>
                <CardDescription>{t('settings.apiKeysDesc')}</CardDescription>
              </div>
              <KeyRound className="h-8 w-8 text-muted-foreground" />
            </CardHeader>
          </Card>
        </Link>
        <Link to="/dashboard/settings/merchants">
          <Card className="hover:bg-gray-50 transition-colors h-full">
            <CardHeader className="flex flex-row items-center justify-between">
              <div className="space-y-1">
                <CardTitle>{t('settings.merchants')}</CardTitle>
                <CardDescription>{t('settings.merchantsDesc')}</CardDescription>
              </div>
              <Store className="h-8 w-8 text-muted-foreground" />
            </CardHeader>
          </Card>
        </Link>
      </div>
    </div>
  );
};
export default Settings;