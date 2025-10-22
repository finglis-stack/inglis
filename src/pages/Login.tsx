import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { showError } from '@/utils/toast';
import { useTranslation } from 'react-i18next';

const Login = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      showError(error.message);
    } else {
      navigate('/dashboard');
    }
    setLoading(false);
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center bg-cover bg-center p-4"
      style={{ backgroundImage: "url('/login-background.jpeg')" }}
    >
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-xl p-8 space-y-6">
        <div className="absolute top-4 right-4">
          <LanguageSwitcher />
        </div>
        
        <div className="text-center">
          <Link to="/">
            <img src="/logo-dark.png" alt="Inglis Dominium Logo" className="mx-auto h-12 mb-4" />
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">{t('login.title')}</h1>
          <p className="text-gray-500">{t('login.subtitle')}</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <Label htmlFor="email">{t('login.emailLabel')}</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1"
            />
          </div>

          <div>
            <div className="flex items-center justify-between">
              <Label htmlFor="password">{t('login.passwordLabel')}</Label>
              <div className="text-sm">
                <a href="#" className="font-medium text-primary hover:underline">
                  {t('login.forgotPassword')}
                </a>
              </div>
            </div>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1"
            />
          </div>

          <div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? '...' : t('login.button')}
            </Button>
          </div>
        </form>

        <p className="text-center text-sm text-gray-500">
          {t('login.noAccount')}{' '}
          <Link to="/onboarding/welcome" className="font-medium text-primary hover:underline">
            {t('login.signUp')}
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Login;