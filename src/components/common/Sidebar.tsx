import { NavLink } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import {
  isSalonAdmin,
  isSpecialist,
  isReceptionist,
  isSuperAdmin,
  ROLE_LABELS,
  ROLE_BADGE_VARIANTS,
} from '../../types/user.types';
import { Badge, BadgeVariant } from '../ui';

interface SidebarProps {
  onNavigate?: () => void;
}

interface MenuItem {
  path: string;
  icon: string;
  label: string;
  description: string;
  allowedRoles?: string[];
}

export default function Sidebar({ onNavigate }: SidebarProps) {
  const { user } = useAuth();
  const userRole = user?.role ? user.role.replace('ROLE_', '').toUpperCase() : 'SPECIALIST';

  const menuItems: MenuItem[] = [
    {
      path: '/dashboard',
      icon: '📊',
      label: 'Dashboard',
      description: isSpecialist(userRole) ? 'Mis atenciones del día' : 'Vista general',
    },
    {
      path: '/appointments',
      icon: '📅',
      label: isSpecialist(userRole) ? 'Mis Citas' : 'Citas',
      description: isSpecialist(userRole) ? 'Mis atenciones' : 'Gestión de agenda',
    },
    {
      path: '/calendar',
      icon: '🗓️',
      label: isSpecialist(userRole) ? 'Mi Calendario' : 'Calendario',
      description: isSpecialist(userRole) ? 'Mi disponibilidad' : 'Vista mensual',
    },
    {
      path: '/reminders',
      icon: '🔔',
      label: 'Recordatorios',
      description: 'Envío de avisos',
      allowedRoles: ['SALON_ADMIN', 'ADMIN', 'SUPER_ADMIN', 'RECEPTIONIST'],
    },
    {
      path: '/marketing',
      icon: '📣',
      label: 'Campañas',
      description: 'Difusión WhatsApp',
      allowedRoles: ['SALON_ADMIN', 'ADMIN', 'SUPER_ADMIN'],
    },
    {
      path: '/analytics',
      icon: '📈',
      label: 'Analíticas',
      description: 'Métricas y cierres',
      allowedRoles: ['SALON_ADMIN', 'ADMIN', 'SUPER_ADMIN', 'RECEPTIONIST'],
    },
    {
      path: '/invoices',
      icon: '🧾',
      label: 'Boletas SII',
      description: 'Trazabilidad BHE',
      allowedRoles: ['SALON_ADMIN', 'ADMIN', 'SUPER_ADMIN', 'RECEPTIONIST'],
    },
    {
      path: '/customers',
      icon: '👥',
      label: isSpecialist(userRole) ? 'Mis Clientas' : 'Clientes',
      description: isSpecialist(userRole) ? 'Clientas atendidas' : 'Base de datos',
    },
    {
      path: '/services',
      icon: '💅',
      label: 'Servicios',
      description: 'Catálogo y recetas',
      allowedRoles: ['SALON_ADMIN', 'ADMIN', 'SUPER_ADMIN', 'RECEPTIONIST'],
    },
    {
      path: '/products',
      icon: '📦',
      label: 'Inventario',
      description: 'Productos y stock',
      allowedRoles: ['SALON_ADMIN', 'ADMIN', 'SUPER_ADMIN'],
    },
    {
      path: '/giftcards',
      icon: '🎁',
      label: 'GiftCards',
      description: 'Venta y canje',
      allowedRoles: ['SALON_ADMIN', 'ADMIN', 'SUPER_ADMIN', 'RECEPTIONIST'],
    },
    {
      path: '/booking-requests',
      icon: '📬',
      label: 'Solicitudes',
      description: 'Reservas online',
      allowedRoles: ['SALON_ADMIN', 'ADMIN', 'SUPER_ADMIN', 'RECEPTIONIST'],
    },
    {
      path: '/settings/loyalty',
      icon: '⭐',
      label: 'Fidelización',
      description: 'Ranking y sellos',
    },
    {
      path: '/users',
      icon: '👤',
      label: 'Personal',
      description: 'Equipo y accesos',
      allowedRoles: ['SALON_ADMIN', 'ADMIN', 'SUPER_ADMIN'],
    },
    {
      path: '/settings',
      icon: '⚙️',
      label: 'Configuración',
      description: 'Ajustes del salón',
      allowedRoles: ['SALON_ADMIN', 'ADMIN', 'SUPER_ADMIN'],
    },
  ];

  const hasAccess = (item: MenuItem) => {
    if (!item.allowedRoles) return true;
    if (isSuperAdmin(userRole)) return true;
    if (
      isSalonAdmin(userRole) &&
      item.allowedRoles.some((r) => r === 'SALON_ADMIN' || r === 'ADMIN')
    )
      return true;
    if (isReceptionist(userRole) && item.allowedRoles.includes('RECEPTIONIST')) return true;
    if (
      isSpecialist(userRole) &&
      item.allowedRoles.some((r) => r === 'SPECIALIST' || r === 'STAFF')
    )
      return true;
    return item.allowedRoles.includes(userRole);
  };

  const visibleItems = menuItems.filter(hasAccess);
  const badgeVariant = (ROLE_BADGE_VARIANTS[userRole] as BadgeVariant) || 'neutral';

  return (
    <aside className="w-full md:w-[250px] md:sticky md:top-14 md:h-[calc(100vh-3.5rem)] md:overflow-y-auto bg-bunny-paper/40 border-r border-bunny-border/70 p-3 flex flex-col">
      <div className="flex-1 flex flex-col gap-1">
        {user && (
          <div className="px-3.5 py-2.5 mb-2.5 bg-white rounded-xl border border-bunny-border shadow-xs flex items-center justify-between">
            <div className="min-w-0 pr-2">
              <div className="text-xs font-semibold text-bunny-cocoa truncate">
                {user.fullName || user.username}
              </div>
              <p className="text-[11px] text-bunny-text-muted m-0 truncate">
                {ROLE_LABELS[userRole] || userRole}
              </p>
            </div>
            <Badge variant={badgeVariant} className="text-[10px] shrink-0">
              {userRole}
            </Badge>
          </div>
        )}

        <nav className="flex flex-col gap-1">
          {visibleItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={onNavigate}
              className={({ isActive }) =>
                `group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-150 border ${
                  isActive
                    ? 'bg-bunny-blush text-bunny-cocoa font-semibold border-bunny-terracotta/40 shadow-xs'
                    : 'text-bunny-cocoa/80 hover:bg-bunny-blush/60 hover:text-bunny-cocoa border-transparent'
                }`
              }
            >
              <span className="text-lg shrink-0 leading-none">{item.icon}</span>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium leading-tight truncate">{item.label}</div>
                <span className="block text-[11px] text-bunny-text-muted font-normal truncate mt-0.5">
                  {item.description}
                </span>
              </div>
            </NavLink>
          ))}
        </nav>
      </div>
    </aside>
  );
}
