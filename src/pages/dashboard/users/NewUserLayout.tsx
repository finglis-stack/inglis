import { Outlet, useLocation, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { StepIndicator } from '@/components/dashboard/users/StepIndicator';

const personalSteps = (t) => [
  { id: 1, name: t('personalSteps.step1_title'), description: t('personalSteps.step1_desc_short') },
  { id: 2, name: t('personalSteps.step2_title'), description: t('personalSteps.step2_desc_short') },
  { id: 3, name: t('personalSteps.step3_title'), description: t('personalSteps.step3_desc_short') },
  { id: 4, name: t('sharedSteps.pin_title_short'), description: t('sharedSteps.pin_desc_short') },
  { id: 5, name: t('personalSteps.step5_title'), description: t('personalSteps.step5_desc_short') },
];

const corporateSteps = (t) => [
  { id: 1, name: t('corporateSteps.step1_title'), description: t('corporateSteps.step1_desc_short') },
  { id: 2, name: t('corporateSteps.step2_title'), description: t('corporateSteps.step2_desc_short') },
  { id: 3, name: t('corporateSteps.step3_title'), description: t('corporateSteps.step3_desc_short') },
  { id: 4, name: t('sharedSteps.pin_title_short'), description: t('sharedSteps.pin_desc_short') },
  { id: 5, name: t('corporateSteps.step5_title'), description: t('corporateSteps.step5_desc_short') },
];

const NewUserLayout = () => {
  const { t } = useTranslation('dashboard');
  const location = useLocation();

  const path = location.pathname;
  const isPersonal = path.includes('/personal/');
  const isCorporate = path.includes('/corporate/');
  
  const steps = isPersonal ? personalSteps(t) : isCorporate ? corporateSteps(t) : [];
  
  const match = path.match(/step-(\d+)/);
  const currentStepId = match ? parseInt(match[1], 10) : 0;

  const currentStepInfo = steps.find(s => s.id === currentStepId);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">
          <Link to="/dashboard">
            <img src="/logo-dark.png" alt="Inglis Dominium Logo" className="h-10" />
          </Link>
          <h1 className="text-xl font-bold text-gray-800 hidden sm:block">
            {t('newUser.title')}
          </h1>
          <Link to="/dashboard/users" className="text-sm font-medium text-gray-600 hover:text-primary">
            {t('newUser.cancel')}
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

export default NewUserLayout;