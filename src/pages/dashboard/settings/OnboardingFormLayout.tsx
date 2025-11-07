import { Outlet, Link } from 'react-router-dom';

export const OnboardingFormLayout = () => {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">
          <Link to="/dashboard">
            <img src="/logo-dark.png" alt="Inglis Dominion Logo" className="h-10" />
          </Link>
          <h1 className="text-xl font-bold text-gray-800 hidden sm:block">
            Nouveau Formulaire d'Intégration
          </h1>
          <Link to="/dashboard/settings/forms" className="text-sm font-medium text-gray-600 hover:text-primary">
            Annuler
          </Link>
        </div>
      </header>
      <main className="container mx-auto p-4 sm:p-8 flex-grow">
        <Outlet />
      </main>
    </div>
  );
};

export default OnboardingFormLayout;