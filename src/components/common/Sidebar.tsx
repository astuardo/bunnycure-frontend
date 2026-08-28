import { Nav, Badge } from 'react-bootstrap';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { isSalonAdmin, isSpecialist, isReceptionist, isSuperAdmin, ROLE_LABELS, ROLE_BADGE_VARIANTS } from '../../types/user.types';
import './Sidebar.css';

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
            description: isSpecialist(userRole) ? 'Mis atenciones del día' : 'Vista general'
        },
        { 
            path: '/appointments', 
            icon: '📅', 
            label: isSpecialist(userRole) ? 'Mis Citas' : 'Citas',
            description: isSpecialist(userRole) ? 'Mis atenciones' : 'Gestión de agenda'
        },
        { 
            path: '/calendar', 
            icon: '🗓️', 
            label: isSpecialist(userRole) ? 'Mi Calendario' : 'Calendario',
            description: isSpecialist(userRole) ? 'Mi disponibilidad' : 'Vista mensual'
        },
        { 
            path: '/reminders', 
            icon: '🔔', 
            label: 'Recordatorios',
            description: 'Envío de avisos',
            allowedRoles: ['SALON_ADMIN', 'ADMIN', 'SUPER_ADMIN', 'RECEPTIONIST']
        },
        { 
            path: '/analytics', 
            icon: '📈', 
            label: 'Analíticas',
            description: 'Métricas y cierres',
            allowedRoles: ['SALON_ADMIN', 'ADMIN', 'SUPER_ADMIN', 'RECEPTIONIST']
        },
        { 
            path: '/invoices', 
            icon: '🧾', 
            label: 'Boletas SII',
            description: 'Trazabilidad BHE',
            allowedRoles: ['SALON_ADMIN', 'ADMIN', 'SUPER_ADMIN', 'RECEPTIONIST']
        },
        { 
            path: '/customers', 
            icon: '👥', 
            label: isSpecialist(userRole) ? 'Mis Clientas' : 'Clientes',
            description: isSpecialist(userRole) ? 'Clientas atendidas' : 'Base de datos'
        },
        { 
            path: '/services', 
            icon: '💅', 
            label: 'Servicios',
            description: 'Catálogo y recetas',
            allowedRoles: ['SALON_ADMIN', 'ADMIN', 'SUPER_ADMIN', 'RECEPTIONIST']
        },
        {
            path: '/products',
            icon: '📦',
            label: 'Inventario',
            description: 'Productos y stock',
            allowedRoles: ['SALON_ADMIN', 'ADMIN', 'SUPER_ADMIN']
        },
        { 
            path: '/giftcards',
            icon: '🎁',
            label: 'GiftCards',
            description: 'Venta y canje',
            allowedRoles: ['SALON_ADMIN', 'ADMIN', 'SUPER_ADMIN', 'RECEPTIONIST']
        },
        { 
            path: '/booking-requests', 
            icon: '📬', 
            label: 'Solicitudes',
            description: 'Reservas online',
            allowedRoles: ['SALON_ADMIN', 'ADMIN', 'SUPER_ADMIN', 'RECEPTIONIST']
        },
        { 
            path: '/settings/loyalty', 
            icon: '⭐', 
            label: 'Fidelización',
            description: 'Ranking y sellos'
        },
        { 
            path: '/users', 
            icon: '👤', 
            label: 'Personal',
            description: 'Equipo y accesos',
            allowedRoles: ['SALON_ADMIN', 'ADMIN', 'SUPER_ADMIN']
        },
        { 
            path: '/settings', 
            icon: '⚙️', 
            label: 'Configuración',
            description: 'Ajustes del salón',
            allowedRoles: ['SALON_ADMIN', 'ADMIN', 'SUPER_ADMIN']
        }
    ];

    const hasAccess = (item: MenuItem) => {
        if (!item.allowedRoles) return true;
        if (isSuperAdmin(userRole)) return true;
        if (isSalonAdmin(userRole) && item.allowedRoles.some(r => r === 'SALON_ADMIN' || r === 'ADMIN')) return true;
        if (isReceptionist(userRole) && item.allowedRoles.includes('RECEPTIONIST')) return true;
        if (isSpecialist(userRole) && item.allowedRoles.some(r => r === 'SPECIALIST' || r === 'STAFF')) return true;
        return item.allowedRoles.includes(userRole);
    };

    const visibleItems = menuItems.filter(hasAccess);

    return (
        <div className="sidebar bg-light border-end">
            <div className="sidebar-content">
                {user && (
                    <div className="px-3 py-2 mb-2 bg-white rounded-3 border shadow-xs d-flex align-items-center justify-content-between">
                        <div className="text-truncate">
                            <div className="small fw-bold text-dark text-truncate">{user.fullName || user.username}</div>
                            <small className="text-muted" style={{ fontSize: '11px' }}>
                                {ROLE_LABELS[userRole] || userRole}
                            </small>
                        </div>
                        <Badge bg={ROLE_BADGE_VARIANTS[userRole] || 'secondary'} className="ms-2" style={{ fontSize: '10px' }}>
                            {userRole}
                        </Badge>
                    </div>
                )}

                <Nav className="flex-column">
                    {visibleItems.map((item) => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            onClick={onNavigate}
                            className={({ isActive }) =>
                                `sidebar-link nav-link d-flex align-items-center py-3 px-3 rounded mb-2 ${
                                    isActive ? 'active' : ''
                                }`
                            }
                        >
                            <span className="sidebar-icon me-3 fs-5">{item.icon}</span>
                            <div className="sidebar-text">
                                <div className="sidebar-label fw-semibold">{item.label}</div>
                                <small className="sidebar-description text-muted">
                                    {item.description}
                                </small>
                            </div>
                        </NavLink>
                    ))}
                </Nav>
            </div>
        </div>
    );
}
