import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AuthLayout } from './AuthLayout';
import { useTranslation } from 'react-i18next';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";

const Q12xLogin = () => {
  const navigate = useNavigate();
  const { t } = useTranslation(['q12x', 'common']);
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
      const { data: merchant, error: merchantError } = await supabase
        .from('merchant_accounts')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (merchantError || !merchant) {
        setErrorMessage(t('login.accessDeniedMerchant'));
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
    <AuthLayout 
      title={t('login.title')}
      subtitle={t('login.subtitle')}
    >
      {errorMessage && (
        <Alert variant="destructive" className="mb-4">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>{t('error', { ns: 'common' })}</AlertTitle>
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      )}
      <form onSubmit={handleLogin} className="space-y-4">
        <div>
          <Label htmlFor="email">{t('login.emailLabel')}</Label>
          <Input id="email" type="email" required value={email} onChange={handleEmailChange} className="mt-1" />
        </div>
        <div>
          <Label htmlFor="password">{t('login.passwordLabel')}</Label>
          <Input id="password" type="password" required value={password} onChange={handlePasswordChange} className="mt-1" />
        </div>
        <div>
          <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700" disabled={loading}>
            {loading ? t('login.loading') : t('login.button')}
          </Button>
        </div>
      </form>
      <p className="text-center text-sm text-gray-500 mt-6">
        {t('login.noAccount')}{' '}
        <Link to="/" className="font-medium text-indigo-600 hover:underline">
          {t('login.signUp')}
        </Link>
      </p>
    </AuthLayout>
  );
};

export default Q12xLogin;