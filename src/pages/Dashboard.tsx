import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';

const Dashboard = () => {
  const navigate = useNavigate();
  const [userEmail, setUserEmail] = useState('');

  useEffect(() => {
    const fetchUser = async () => {
      const { data, error } = await supabase.auth.getUser();
      if (error || !data.user) {
        navigate('/onboarding/create-account');
      } else {
        setUserEmail(data.user.email || '');
      }
    };
    fetchUser();
  }, [navigate]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center">
      <h1 className="text-4xl font-bold mb-4">Bienvenue sur votre tableau de bord</h1>
      <p className="text-lg text-muted-foreground mb-8">Connecté en tant que : {userEmail}</p>
      <Button onClick={handleSignOut}>Se déconnecter</Button>
    </div>
  );
};

export default Dashboard;