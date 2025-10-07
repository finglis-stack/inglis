import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';

const Dashboard = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [userEmail, setUserEmail] = useState('');

  useEffect(() => {
    const fetchUser = async () => {
      const { data } = await supabase.auth.getUser();
      if (data.user) {
        setUserEmail(data.user.email || '');
      }
    };
    fetchUser();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">{t('dashboard.title')}</h1>
        <div className="flex items-center gap-4">
            <p className="text-sm text-muted-foreground">{t('dashboard.loggedInAs', { email: userEmail })}</p>
            <Button onClick={handleSignOut} variant="outline">{t('dashboard.signOut')}</Button>
        </div>
      </div>
      <p className="text-lg">{t('dashboard.welcome')}</p>
    </div>
  );
};

export default Dashboard;