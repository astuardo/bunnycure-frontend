import { useState, useRef, useEffect } from 'react';
import { FiSearch } from 'react-icons/fi';
import { useAuth } from '../../hooks/useAuth';
import { isCamiUser } from '../../services/loveNotes.service';

interface NavbarProps {
    onOpenSpotlight?: () => void;
    onOpenCamiLoveModal?: () => void;
}

export default function Navbar({ onOpenSpotlight, onOpenCamiLoveModal }: NavbarProps) {
    const { user, logout } = useAuth();
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

    return (
        <nav style={{
            position: 'sticky', top: 0, zIndex: 1000,
            background: 'rgba(255,255,255,0.95)',
            backdropFilter: 'blur(8px)',
            borderBottom: '1px solid #f0e0d8',
            boxShadow: '0 1px 8px rgba(180,120,100,0.08)',
            padding: '0 16px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            height: '56px',
            gap: '12px',
        }}>
            {/* Brand */}
            <a href="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none', flexShrink: 0 }}>
                <span style={{ fontSize: '22px' }}>🐰</span>
                <span style={{ fontWeight: 700, fontSize: '18px', color: '#5c3d2e', letterSpacing: '-0.3px' }}>
                    BunnyCure
                </span>
            </a>

            {/* Buscador Universal Spotlight (Ctrl+K) */}
            {onOpenSpotlight && (
                <button
                    onClick={onOpenSpotlight}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        background: '#fdf6f3',
                        border: '1px solid #eed0c5',
                        borderRadius: '10px',
                        padding: '6px 14px',
                        cursor: 'pointer',
                        color: '#8c6052',
                        fontSize: '13px',
                        fontWeight: 500,
                        transition: 'all 0.15s ease',
                        maxWidth: '360px',
                        flex: '1 1 auto',
                        justifyContent: 'space-between',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = '#fce8e4')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = '#fdf6f3')}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <FiSearch style={{ color: '#8c2a3e', fontSize: '15px' }} />
                        <span className="d-none d-sm-inline">Buscar clientas, citas...</span>
                        <span className="d-sm-none">Buscar...</span>
                    </div>
                    <kbd
                        style={{
                            background: '#fff',
                            color: '#8c2a3e',
                            border: '1px solid #eed0c5',
                            fontSize: '10.5px',
                            padding: '2px 6px',
                            borderRadius: '5px',
                        }}
                    >
                        Ctrl+K
                    </kbd>
                </button>
            )}

            {/* User dropdown */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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
                        }}
                        onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.05)')}
                        onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
                    >
                        <span>💖</span>
                        <span style={{ fontSize: '12px', fontWeight: 600 }} className="d-none d-sm-inline">
                            Para ti
                        </span>
                    </button>
                )}

                <div ref={dropRef} style={{ position: 'relative', flexShrink: 0 }}>
                    <button
                        onClick={() => setOpen(o => !o)}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '8px',
                            background: open ? '#fce8e4' : '#fdf6f3',
                            border: '1px solid #f0d8d0',
                            borderRadius: '10px',
                            padding: '6px 12px',
                            cursor: 'pointer',
                            fontSize: '14px',
                            color: '#5c3d2e',
                            fontWeight: 500,
                            transition: 'background 0.15s',
                        }}
                        onMouseEnter={e => { if (!open) e.currentTarget.style.background = '#fce8e4'; }}
                        onMouseLeave={e => { if (!open) e.currentTarget.style.background = '#fdf6f3'; }}
                    >
                        <span style={{ fontSize: '18px' }}>👤</span>
                        <span style={{ maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
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
