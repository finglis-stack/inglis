import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';

const Dashboard = () => {
  const navigate = useNavigate();
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
        <h1 className="text-3xl font-bold">Tableau de bord</h1>
        <div className="flex items-center gap-4">
            <p className="text-sm text-muted-foreground">Connecté en tant que : {userEmail}</p>
            <Button onClick={handleSignOut} variant="outline">Se déconnecter</Button>
        </div>
      </div>
      <p className="text-lg">Bienvenue sur votre tableau de bord.</p>
    </div>
  );
};

export default Dashboard;