import { Outlet, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export const CardProgramLayout = () => {
  const { t } = useTranslation('dashboard');

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">
          <Link to="/dashboard">
            <img src="/logo-dark.png" alt="Inglis Dominium Logo" className="h-10" />
          </Link>
          <h1 className="text-xl font-bold text-gray-800 hidden sm:block">
            {t('newCardProgram.title')}
          </h1>
          <Link to="/dashboard/settings/card-programs" className="text-sm font-medium text-gray-600 hover:text-primary">
            {t('newCardProgram.cancel')}
          </Link>
        </div>
      </header>
      <main className="container mx-auto p-4 sm:p-8 flex-grow">
        <Outlet />
      </main>
    </div>
  );
};

export default CardProgramLayout;