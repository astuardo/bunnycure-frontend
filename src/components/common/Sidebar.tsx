import { Nav } from 'react-bootstrap';
import { NavLink } from 'react-router-dom';
import './Sidebar.css';

export default function Sidebar() {
    const menuItems = [
        { 
            path: '/dashboard', 
            icon: '📊', 
            label: 'Dashboard',
            description: 'Vista general'
        },
        { 
            path: '/appointments', 
            icon: '📅', 
            label: 'Citas',
            description: 'Gestión de agenda'
        },
        { 
            path: '/customers', 
            icon: '👥', 
            label: 'Clientes',
            description: 'Registro de clientes'
        },
        { 
            path: '/services', 
            icon: '💅', 
            label: 'Servicios',
            description: 'Catálogo de servicios'
        },
        { 
            path: '/booking-requests', 
            icon: '📬', 
            label: 'Solicitudes',
            description: 'Reservas pendientes'
        }
    ];

    return (
        <div className="sidebar bg-light border-end">
            <div className="sidebar-content">
                <Nav className="flex-column">
                    {menuItems.map((item) => (
                        <NavLink
                            key={item.path}
                            to={item.path}
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
