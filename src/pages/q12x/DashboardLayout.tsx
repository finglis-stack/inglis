import { Outlet, useNavigate, NavLink } from 'react-router-dom';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

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

  const navLinkClasses = ({ isActive }: { isActive: boolean }) =>
    cn(
      "px-3 py-2 rounded-md text-sm font-medium transition-colors",
      isActive
        ? "bg-gray-900 text-white"
        : "text-gray-300 hover:bg-gray-700 hover:text-white"
    );

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <header className="bg-gray-800 border-b border-gray-700">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-8">
            <h1 className="text-2xl font-bold font-mono">Q12x</h1>
            <nav className="flex items-center gap-4">
              <NavLink to="/dashboard" end className={navLinkClasses}>
                Tableau de bord
              </NavLink>
              <NavLink to="/dashboard/transactions" className={navLinkClasses}>
                Transactions
              </NavLink>
            </nav>
          </div>
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