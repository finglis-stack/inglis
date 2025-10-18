import { Outlet, Link, useParams, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { StepIndicator } from '@/components/dashboard/users/StepIndicator';

const transactionSteps = (t) => [
  { id: 1, name: "Détails", description: "Montant et marchand" },
  { id: 2, name: "Sécurité", description: "Justification et confirmation" },
  { id: 3, name: "Vérification", description: "Résumé et soumission" },
];

const NewTransactionLayout = () => {
  const { t } = useTranslation();
  const { accountType, accountId } = useParams();
  const location = useLocation();
  
  const backUrl = `/dashboard/accounts/${accountType}/${accountId}`;

  const path = location.pathname;
  let currentStepId;
  if (path.endsWith('step-3')) {
    currentStepId = 3;
  } else if (path.endsWith('step-2')) {
    currentStepId = 2;
  } else {
    currentStepId = 1;
  }
  
  const steps = transactionSteps(t);
  const currentStepInfo = steps.find(s => s.id === currentStepId);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">
          <Link to="/dashboard">
            <img src="/logo-dark.png" alt="Inglis Dominium Logo" className="h-10" />
          </Link>
          <h1 className="text-xl font-bold text-gray-800 hidden sm:block">
            Ajouter une Transaction Manuelle
          </h1>
          <Link to={backUrl} className="text-sm font-medium text-gray-600 hover:text-primary">
            Annuler
          </Link>
        </div>
      </header>
      <main className="container mx-auto p-4 sm:p-8 flex-grow">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
          <div className="md:col-span-1">
            <StepIndicator steps={steps} currentStep={currentStepId} />
          </div>
          <div className="md:col-span-3">
            <div className="bg-white p-8 rounded-lg shadow-md">
              <div className="mb-6">
                <h2 className="text-2xl font-bold">{currentStepInfo?.name}</h2>
                <p className="text-muted-foreground">{currentStepInfo?.description}</p>
              </div>
              <Outlet />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default NewTransactionLayout;