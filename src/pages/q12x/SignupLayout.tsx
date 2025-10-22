import { Outlet } from 'react-router-dom';
import { AuthLayout } from './AuthLayout';

const SignupLayout = () => {
  return (
    <AuthLayout
      title="Créez votre compte marchand"
      subtitle="Suivez les étapes pour commencer à accepter des paiements."
    >
      <Outlet />
    </AuthLayout>
  );
};

export default SignupLayout;