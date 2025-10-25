import { Outlet } from 'react-router-dom';
import { AuthLayout } from './AuthLayout';
import { useTranslation } from 'react-i18next';

const SignupLayout = () => {
  const { t } = useTranslation('q12x');
  return (
    <AuthLayout
      title={t('signup.title')}
      subtitle={t('signup.subtitle')}
    >
      <Outlet />
    </AuthLayout>
  );
};

export default SignupLayout;