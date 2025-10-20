import { Outlet, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';

const Q12xDashboardLayout = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const checkUser = async () => {
      const { data, error } = await supabase.auth.getUser();
      if (error || !data.user) {
        navigate('/login');
      }
    };
    checkUser();
  }, [navigate]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <header className="bg-gray-800 border-b border-gray-700">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <h1 className="text-2xl font-bold font-mono">Q12x</h1>
          <Button onClick={handleSignOut} variant="ghost" className="hover:bg-gray-700 hover:text-white">
            Se déconnecter
          </Button>
        </div>
      </header>
      <main className="container mx-auto p-8">
        <Outlet />
      </main>
    </div>
  );
};

export default Q12xDashboardLayout;