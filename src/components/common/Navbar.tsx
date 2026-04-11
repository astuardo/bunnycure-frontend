import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';

export default function Navbar() {
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
        }}>
            {/* Brand */}
            <a href="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}>
                <span style={{ fontSize: '22px' }}>🐰</span>
                <span style={{ fontWeight: 700, fontSize: '18px', color: '#5c3d2e', letterSpacing: '-0.3px' }}>
                    BunnyCure
                </span>
            </a>

            {/* User dropdown */}
            <div ref={dropRef} style={{ position: 'relative' }}>
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
        </nav>
    );
}
