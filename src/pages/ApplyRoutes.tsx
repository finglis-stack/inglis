import { Routes, Route } from 'react-router-dom';
import PublicOnboardingLayout from './public-onboarding/PublicOnboardingLayout';
import Step1Welcome from './public-onboarding/Step1Welcome';
import Step2CardSelection from './public-onboarding/Step2CardSelection';
import Step3PersonalInfo from './public-onboarding/Step3PersonalInfo';
import ApplyIdPrompt from './ApplyIdPrompt';
import NotFound from '@/pages/NotFound';

const ApplyRoutes = () => {
  const hostname = window.location.hostname;
  const isLocal = hostname === 'localhost';

  if (isLocal) {
    return (
      <Routes>
        <Route path="/" element={<ApplyIdPrompt />} />
        <Route path="/apply/:formId" element={<PublicOnboardingLayout />}>
          <Route index element={<Step1Welcome />} />
          <Route path="step-2" element={<Step2CardSelection />} />
          <Route path="step-3" element={<Step3PersonalInfo />} />
          {/* Les autres étapes seront ajoutées ici */}
        </Route>
        <Route path="*" element={<NotFound />} />
      </Routes>
    );
  }

  // Logique pour la production sur le sous-domaine apply.*
  return (
    <Routes>
      <Route path="/:formId" element={<PublicOnboardingLayout />}>
        <Route index element={<Step1Welcome />} />
        <Route path="step-2" element={<Step2CardSelection />} />
        <Route path="step-3" element={<Step3PersonalInfo />} />
        {/* Les autres étapes seront ajoutées ici */}
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

export default ApplyRoutes;