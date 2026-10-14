import { useState, useRef, useEffect } from 'react';
import { FiSearch, FiMenu, FiX } from 'react-icons/fi';
import { useAuth } from '../../hooks/useAuth';
import { useTenant } from '../../context/TenantContext';
import { isCamiUser } from '../../services/loveNotes.service';

interface NavbarProps {
    onOpenSpotlight?: () => void;
    onOpenCamiLoveModal?: () => void;
    onOpenSidebar?: () => void;
    onToggleSidebar?: () => void;
    isSidebarOpen?: boolean;
}

export default function Navbar({
    onOpenSpotlight,
    onOpenCamiLoveModal,
    onOpenSidebar,
    onToggleSidebar,
    isSidebarOpen = false,
}: NavbarProps) {
    const { user, logout } = useAuth();
    const { tenant } = useTenant();
    const [open, setOpen] = useState(false);
    const dropRef = useRef<HTMLDivElement>(null);

    const handleLogout = async () => {
        await logout();
        window.location.href = '/login';
    };

    // Cerrar dropdown al hacer click fuera
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (dropRef.current && !dropRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const handleMenuClick = onToggleSidebar || onOpenSidebar;

    return (
        <nav style={{
            position: 'sticky', top: 0, zIndex: 1000,
            background: 'rgba(255,255,255,0.95)',
            backdropFilter: 'blur(8px)',
            borderBottom: '1px solid #f0e0d8',
            boxShadow: '0 1px 8px rgba(180,120,100,0.08)',
            padding: '0 12px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            height: '56px',
            gap: '8px',
        }}>
            {/* Brand + Hamburguesa Móvil */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                {handleMenuClick && (
                    <button
                        type="button"
                        onClick={handleMenuClick}
                        className="md:hidden flex items-center justify-center p-1.5 rounded-xl border border-[#f0e0d8] bg-white text-[#5c3d2e] hover:bg-[#fdf6f3] transition-colors cursor-pointer"
                        aria-label={isSidebarOpen ? "Cerrar menú" : "Abrir menú"}
                        aria-expanded={isSidebarOpen}
                        title={isSidebarOpen ? "Cerrar menú" : "Menú"}
                    >
                        {isSidebarOpen ? (
                            <FiX style={{ fontSize: '18px' }} />
                        ) : (
                            <FiMenu style={{ fontSize: '18px' }} />
                        )}
                    </button>
                )}
                <a href="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none', flexShrink: 0 }}>
                    {tenant.logoUrl && tenant.logoUrl !== '/images/logo.png' ? (
                        <img
                            src={tenant.logoUrl}
                            alt={tenant.name}
                            style={{ height: '28px', width: 'auto', maxHeight: '28px', objectFit: 'contain', borderRadius: '6px' }}
                            onError={(e) => {
                                (e.currentTarget as HTMLElement).style.display = 'none';
                                const fallback = e.currentTarget.parentElement?.querySelector('.tenant-navbar-fallback') as HTMLElement | null;
                                if (fallback) fallback.style.display = 'inline';
                            }}
                        />
                    ) : null}
                    <span
                        className="tenant-navbar-fallback"
                        style={{
                            fontSize: '22px',
                            display: tenant.logoUrl && tenant.logoUrl !== '/images/logo.png' ? 'none' : 'inline',
                        }}
                    >
                        💅
                    </span>
                    <span style={{ fontWeight: 700, fontSize: '18px', color: '#5c3d2e', letterSpacing: '-0.3px' }} className="hidden sm:inline">
                        {tenant.name || 'BunnyCure'}
                    </span>
                </a>
            </div>

            {/* Buscador Universal Spotlight (Ctrl+K) */}
            {onOpenSpotlight && (
                <button
                    onClick={onOpenSpotlight}
                    type="button"
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        background: '#fdf6f3',
                        border: '1px solid #eed0c5',
                        borderRadius: '10px',
                        padding: '6px 10px',
                        cursor: 'pointer',
                        color: '#8c6052',
                        fontSize: '13px',
                        fontWeight: 500,
                        transition: 'all 0.15s ease',
                        maxWidth: '360px',
                        flex: '1 1 auto',
                        minWidth: 0,
                        justifyContent: 'space-between',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = '#fce8e4')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = '#fdf6f3')}
                    title="Buscar (Ctrl+K)"
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                        <FiSearch style={{ color: '#8c2a3e', fontSize: '15px', flexShrink: 0 }} />
                        <span className="hidden md:inline truncate">Buscar clientas, citas...</span>
                        <span className="hidden sm:inline md:hidden truncate">Buscar...</span>
                        <span className="sm:hidden text-xs truncate">Buscar</span>
                    </div>
                    <kbd
                        className="hidden sm:inline-block"
                        style={{
                            background: '#fff',
                            color: '#8c2a3e',
                            border: '1px solid #eed0c5',
                            fontSize: '10.5px',
                            padding: '2px 6px',
                            borderRadius: '5px',
                            flexShrink: 0,
                        }}
                    >
                        Ctrl+K
                    </kbd>
                </button>
            )}

            {/* User dropdown & Cami button */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                {isCamiUser(user?.username) && onOpenCamiLoveModal && (
                    <button
                        onClick={onOpenCamiLoveModal}
                        title="Ver mi mensajito de amor ❤️"
                        style={{
                            background: 'linear-gradient(135deg, #ff758c 0%, #ff7eb3 100%)',
                            border: 'none',
                            borderRadius: '10px',
                            padding: '6px 10px',
                            cursor: 'pointer',
                            color: '#fff',
                            fontSize: '14px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            boxShadow: '0 2px 8px rgba(255, 117, 140, 0.35)',
                            transition: 'transform 0.15s ease',
                            flexShrink: 0,
                        }}
                        onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.05)')}
                        onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
                    >
                        <span>💖</span>
                        <span style={{ fontSize: '12px', fontWeight: 600 }} className="hidden sm:inline">
                            Para ti
                        </span>
                    </button>
                )}

                <div ref={dropRef} style={{ position: 'relative', flexShrink: 0 }}>
                    <button
                        onClick={() => setOpen(o => !o)}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '6px',
                            background: open ? '#fce8e4' : '#fdf6f3',
                            border: '1px solid #f0d8d0',
                            borderRadius: '10px',
                            padding: '6px 10px',
                            cursor: 'pointer',
                            fontSize: '14px',
                            color: '#5c3d2e',
                            fontWeight: 500,
                            transition: 'background 0.15s',
                        }}
                        onMouseEnter={e => { if (!open) e.currentTarget.style.background = '#fce8e4'; }}
                        onMouseLeave={e => { if (!open) e.currentTarget.style.background = '#fdf6f3'; }}
                        title={user?.fullName || user?.username || 'Usuario'}
                    >
                        <span style={{ fontSize: '16px' }}>👤</span>
                        <span className="hidden sm:inline" style={{ maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {user?.fullName || user?.username || 'Usuario'}
                        </span>
                        <span style={{ fontSize: '10px', color: '#9e7b6e', marginLeft: '2px' }}>▼</span>
                    </button>

                    {open && (
                        <div style={{
                            position: 'absolute', right: 0, top: 'calc(100% + 6px)',
                            background: '#fff',
                            border: '1px solid #f0e0d8',
                            borderRadius: '12px',
                            boxShadow: '0 4px 20px rgba(180,120,100,0.15)',
                            minWidth: '180px',
                            overflow: 'hidden',
                            zIndex: 100,
                        }}>
                            <div style={{ padding: '10px 14px', borderBottom: '1px solid #f0e0d8' }}>
                                <div style={{ fontSize: '11px', color: '#b09080', marginBottom: '2px' }}>Sesión activa</div>
                                <div style={{ fontSize: '13px', color: '#5c3d2e', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {user?.email || user?.fullName || 'Sin email'}
                                </div>
                            </div>
                            {isCamiUser(user?.username) && onOpenCamiLoveModal && (
                                <button
                                    onClick={() => {
                                        setOpen(false);
                                        onOpenCamiLoveModal();
                                    }}
                                    style={{
                                        width: '100%', textAlign: 'left',
                                        padding: '10px 14px',
                                        background: 'none', border: 'none',
                                        borderBottom: '1px solid #fdf0eb',
                                        cursor: 'pointer', fontSize: '14px',
                                        color: '#e03a72', fontWeight: 600,
                                        display: 'flex', alignItems: 'center', gap: '8px',
                                    }}
                                    onMouseEnter={e => (e.currentTarget.style.background = '#fff0f3')}
                                    onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                                >
                                    💖 Mi Mensaje de Amor
                                </button>
                            )}
                            <button
                                onClick={handleLogout}
                                style={{
                                    width: '100%', textAlign: 'left',
                                    padding: '10px 14px',
                                    background: 'none', border: 'none',
                                    cursor: 'pointer', fontSize: '14px',
                                    color: '#c9897a', fontWeight: 500,
                                    display: 'flex', alignItems: 'center', gap: '8px',
                                }}
                                onMouseEnter={e => (e.currentTarget.style.background = '#fdf6f3')}
                                onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                            >
                                🚪 Cerrar Sesión
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </nav>
    );
}
