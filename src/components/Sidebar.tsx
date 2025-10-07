import { NavLink } from 'react-router-dom';
import { CreditCard, LayoutDashboard, Users, ArrowRightLeft, Settings, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';

export const Sidebar = () => {
  const { t } = useTranslation();

  const navItems = [
    { to: '/dashboard', icon: <LayoutDashboard className="h-5 w-5" />, label: t('dashboard.sidebar.dashboard') },
    { to: '/dashboard/cards', icon: <CreditCard className="h-5 w-5" />, label: t('dashboard.sidebar.cards') },
    { to: '/dashboard/users', icon: <Users className="h-5 w-5" />, label: t('dashboard.sidebar.users') },
    { to: '/dashboard/transactions', icon: <ArrowRightLeft className="h-5 w-5" />, label: t('dashboard.sidebar.transactions') },
    { to: '/dashboard/credit-files', icon: <FileText className="h-5 w-5" />, label: t('dashboard.sidebar.creditFiles') },
    { to: '/dashboard/settings', icon: <Settings className="h-5 w-5" />, label: t('dashboard.sidebar.settings') },
  ];

  return (
    <aside className="w-64 flex-shrink-0 bg-gray-100 p-4 flex flex-col border-r">
      <div className="mb-8">
        <NavLink to="/">
          <img src="/logo-dark.png" alt="Inglis Dominium Logo" className="h-10" />
        </NavLink>
      </div>
      <nav className="flex flex-col gap-2">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/dashboard'}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-gray-600 transition-all hover:bg-gray-200 hover:text-gray-900',
                isActive && 'bg-gray-200 text-gray-900 font-semibold'
              )
            }
          >
            {item.icon}
            {item.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
};