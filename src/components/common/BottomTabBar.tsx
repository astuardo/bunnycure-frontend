import { useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { FiCalendar, FiClipboard, FiHome, FiMenu, FiUsers } from 'react-icons/fi';
import { useAuth } from '../../hooks/useAuth';
import { isSpecialist } from '../../types/user.types';

interface BottomTabBarProps {
  onOpenMenu: () => void;
  menuOpen: boolean;
}

const tabClass = ({ isActive }: { isActive: boolean }) =>
  `flex flex-1 flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors ${
    isActive ? 'text-bunny-primary' : 'text-bunny-text-muted'
  }`;

const TabIcon = ({ children, active }: { children: React.ReactNode; active: boolean }) => (
  <span
    className={`flex h-7 w-12 items-center justify-center rounded-full text-[19px] transition-colors ${
      active ? 'bg-bunny-primary/10' : ''
    }`}
  >
    {children}
  </span>
);

/**
 * Pestañas inferiores en el celular: las cuatro secciones de uso diario a un toque y "Más" abre el
 * menú completo. Publica su alto en --bottom-nav-h para que los avisos flotantes queden encima.
 */
export function BottomTabBar({ onOpenMenu, menuOpen }: BottomTabBarProps) {
  const { user } = useAuth();
  const specialist = isSpecialist(user?.role ? user.role.replace('ROLE_', '').toUpperCase() : 'SPECIALIST');

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const apply = () => document.documentElement.style.setProperty('--bottom-nav-h', mq.matches ? '4rem' : '0px');
    apply();
    mq.addEventListener('change', apply);
    return () => {
      mq.removeEventListener('change', apply);
      document.documentElement.style.setProperty('--bottom-nav-h', '0px');
    };
  }, []);

  const tabs = [
    { to: '/dashboard', label: 'Inicio', icon: <FiHome /> },
    { to: '/appointments', label: specialist ? 'Mis citas' : 'Citas', icon: <FiClipboard /> },
    { to: '/calendar', label: 'Calendario', icon: <FiCalendar /> },
    { to: '/customers', label: 'Clientas', icon: <FiUsers /> },
  ];

  return (
    <nav
      aria-label="Navegación principal"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-bunny-border bg-white/95 pb-[env(safe-area-inset-bottom,0px)] backdrop-blur-md md:hidden"
    >
      <div className="flex h-16">
        {tabs.map((tab) => (
          <NavLink key={tab.to} to={tab.to} className={tabClass}>
            {({ isActive }) => (
              <>
                <TabIcon active={isActive}>{tab.icon}</TabIcon>
                <span>{tab.label}</span>
              </>
            )}
          </NavLink>
        ))}
        <button
          type="button"
          onClick={onOpenMenu}
          aria-expanded={menuOpen}
          className={`flex flex-1 flex-col items-center justify-center gap-1 text-[11px] font-medium ${
            menuOpen ? 'text-bunny-primary' : 'text-bunny-text-muted'
          }`}
        >
          <TabIcon active={menuOpen}>
            <FiMenu />
          </TabIcon>
          <span>Más</span>
        </button>
      </div>
    </nav>
  );
}
