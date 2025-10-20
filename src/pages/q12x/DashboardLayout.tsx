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
        ? "bg-indigo-600 text-white"
        : "text-gray-500 hover:bg-gray-200 hover:text-gray-900"
    );

  return (
    <div className="min-h-screen bg-gray-100 text-gray-900">
      <header className="bg-white border-b border-gray-200">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-8">
            <h1 className="text-2xl font-bold font-mono text-gray-900">Q12x</h1>
            <nav className="flex items-center gap-4">
              <NavLink to="/dashboard" end className={navLinkClasses}>
                Tableau de bord
              </NavLink>
              <NavLink to="/dashboard/transactions" className={navLinkClasses}>
                Transactions
              </NavLink>
            </nav>
          </div>
          <Button onClick={handleSignOut} variant="ghost" className="hover:bg-gray-200">
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