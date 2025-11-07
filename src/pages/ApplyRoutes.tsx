import { Routes, Route } from 'react-router-dom';
import PublicOnboardingForm from '@/pages/PublicOnboardingForm';
import ApplyIdPrompt from './ApplyIdPrompt';
import NotFound from '@/pages/NotFound';

const ApplyRoutes = () => {
  const hostname = window.location.hostname;
  const isLocal = hostname === 'localhost';

  if (isLocal) {
    return (
      <Routes>
        <Route path="/" element={<ApplyIdPrompt />} />
        <Route path="/apply/:formId" element={<PublicOnboardingForm />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    );
  }

  // Logique pour la production sur le sous-domaine apply.*
  return (
    <Routes>
      <Route path="/:formId" element={<PublicOnboardingForm />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

export default ApplyRoutes;