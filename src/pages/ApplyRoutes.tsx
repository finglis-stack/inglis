import { Routes, Route } from 'react-router-dom';
import PublicOnboardingLayout from './public-onboarding/PublicOnboardingLayout';
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
          {/* Les étapes du formulaire seront ajoutées ici */}
        </Route>
        <Route path="*" element={<NotFound />} />
      </Routes>
    );
  }

  // Logique pour la production sur le sous-domaine apply.*
  return (
    <Routes>
      <Route path="/:formId" element={<PublicOnboardingLayout />}>
        {/* Les étapes du formulaire seront ajoutées ici */}
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

export default ApplyRoutes;