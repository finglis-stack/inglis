import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
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
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">
          <Link to="/dashboard">
            <img src="/logo-dark.png" alt="Inglis Dominium Logo" className="h-10" />
          </Link>
          <h1 className="text-xl font-bold text-gray-800 hidden sm:block">
            {t('dashboard.newUser.title')}
          </h1>
          <Link to="/dashboard/users" className="text-sm font-medium text-gray-600 hover:text-primary">
            {t('dashboard.newUser.cancel')}
          </Link>
        </div>
      </header>

      <main className="container mx-auto p-4 sm:p-8 flex-grow flex items-center justify-center">
        <div className="max-w-4xl w-full">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold tracking-tight">{t('dashboard.newUser.subtitle')}</h2>
            <p className="text-muted-foreground mt-2">{t('dashboard.newUser.selection_prompt')}</p>
          </div>
          <div className="grid md:grid-cols-2 gap-8">
            <Card 
              className="flex flex-col text-center items-center p-8 bg-white hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer group"
              onClick={() => handleSelect('personal')}
            >
              <CardHeader className="p-0 items-center">
                <div className="bg-primary/10 rounded-full p-4 mb-6 inline-flex">
                  <User className="h-10 w-10 text-primary" />
                </div>
                <CardTitle className="text-2xl">{t('dashboard.newUser.personalTitle')}</CardTitle>
                <CardDescription className="mt-2">{t('dashboard.newUser.personalDesc')}</CardDescription>
              </CardHeader>
              <CardContent className="p-0 mt-auto pt-8 w-full">
                <Button className="w-full group-hover:bg-primary group-hover:text-primary-foreground" variant="outline">{t('dashboard.newUser.select')}</Button>
              </CardContent>
            </Card>

            <Card 
              className="flex flex-col text-center items-center p-8 bg-white hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer group"
              onClick={() => handleSelect('corporate')}
            >
              <CardHeader className="p-0 items-center">
                <div className="bg-primary/10 rounded-full p-4 mb-6 inline-flex">
                  <Building className="h-10 w-10 text-primary" />
                </div>
                <CardTitle className="text-2xl">{t('dashboard.newUser.corporateTitle')}</CardTitle>
                <CardDescription className="mt-2">{t('dashboard.newUser.corporateDesc')}</CardDescription>
              </CardHeader>
              <CardContent className="p-0 mt-auto pt-8 w-full">
                <Button className="w-full group-hover:bg-primary group-hover:text-primary-foreground" variant="outline">{t('dashboard.newUser.select')}</Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};