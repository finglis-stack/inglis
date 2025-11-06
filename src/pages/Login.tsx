import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { useTranslation } from 'react-i18next';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";

const Login = () => {
  const navigate = useNavigate();
  const { t } = useTranslation(['login', 'common']);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage('');

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setErrorMessage(signInError.message);
      setLoading(false);
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: institution, error: institutionError } = await supabase
        .from('institutions')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (institutionError || !institution) {
        setErrorMessage(t('accessDeniedInstitution'));
        await supabase.auth.signOut();
        setLoading(false);
        return;
      }
    }

    navigate('/dashboard');
    setLoading(false);
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    if (errorMessage) setErrorMessage('');
  }

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
    if (errorMessage) setErrorMessage('');
  }

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
            <img src="/logo-dark.png" alt="Inglis Dominion Logo" className="mx-auto h-12 mb-4" />
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>
          <p className="text-gray-500">{t('subtitle')}</p>
        </div>

        {errorMessage && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>{t('error', { ns: 'common' })}</AlertTitle>
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <Label htmlFor="email">{t('emailLabel')}</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={handleEmailChange}
              className="mt-1"
            />
          </div>

          <div>
            <div className="flex items-center justify-between">
              <Label htmlFor="password">{t('passwordLabel')}</Label>
              <div className="text-sm">
                <a href="#" className="font-medium text-primary hover:underline">
                  {t('forgotPassword')}
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
              onChange={handlePasswordChange}
              className="mt-1"
            />
          </div>

          <div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? '...' : t('button')}
            </Button>
          </div>
        </form>

        <p className="text-center text-sm text-gray-500">
          {t('noAccount')}{' '}
          <Link to="/onboarding/welcome" className="font-medium text-primary hover:underline">
            {t('signUp')}
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Login;