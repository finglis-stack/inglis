import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { User, Building } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useNewUser } from '@/context/NewUserContext';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

export const NewUserTypeSelection = () => {
  const navigate = useNavigate();
  const { resetUser, updateUser } = useNewUser();
  const { t } = useTranslation();

  useEffect(() => {
    resetUser();
  }, [resetUser]);

  const handleSelect = (type) => {
    updateUser({ type });
    if (type === 'personal') {
      navigate('/dashboard/users/new/personal/step-1');
    } else {
      navigate('/dashboard/users/new/corporate/step-1');
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold">{t('dashboard.newUser.title')}</h1>
        <p className="text-muted-foreground mt-2">{t('dashboard.newUser.subtitle')}</p>
      </div>
      <div className="grid md:grid-cols-2 gap-8">
        <Card className="flex flex-col">
          <CardHeader className="flex-grow">
            <User className="h-10 w-10 mb-4 text-primary" />
            <CardTitle>{t('dashboard.newUser.personalTitle')}</CardTitle>
            <CardDescription>{t('dashboard.newUser.personalDesc')}</CardDescription>
          </CardHeader>
          <div className="p-6 pt-0">
            <Button className="w-full" onClick={() => handleSelect('personal')}>{t('dashboard.newUser.select')}</Button>
          </div>
        </Card>
        <Card className="flex flex-col">
          <CardHeader className="flex-grow">
            <Building className="h-10 w-10 mb-4 text-primary" />
            <CardTitle>{t('dashboard.newUser.corporateTitle')}</CardTitle>
            <CardDescription>{t('dashboard.newUser.corporateDesc')}</CardDescription>
          </CardHeader>
          <div className="p-6 pt-0">
            <Button className="w-full" onClick={() => handleSelect('corporate')}>{t('dashboard.newUser.select')}</Button>
          </div>
        </Card>
      </div>
       <div className="text-center mt-8">
          <Button variant="ghost" asChild>
            <Link to="/dashboard/users">{t('dashboard.newUser.cancel')}</Link>
          </Button>
        </div>
    </div>
  );
};