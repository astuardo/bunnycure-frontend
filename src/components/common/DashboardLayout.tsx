import { useState, useEffect, ReactNode } from 'react';
import { Offcanvas } from 'react-bootstrap';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import { SpotlightSearchModal } from './SpotlightSearchModal';
import { CashClosingModal } from '../finances/CashClosingModal';
import { CamiLoveModal } from './CamiLoveModal';
import './DashboardLayout.css';

interface DashboardLayoutProps {
    children: ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
    const [showSidebar, setShowSidebar] = useState(false);
    const [showSpotlight, setShowSpotlight] = useState(false);
    const [showCashClosing, setShowCashClosing] = useState(false);
    const [showCamiLove, setShowCamiLove] = useState(false);

    const handleCloseSidebar = () => setShowSidebar(false);
    const handleShowSidebar  = () => setShowSidebar(true);

    // Escuchador global para abrir el Spotlight con Cmd+K o Ctrl+K
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) {
                e.preventDefault();
                setShowSpotlight((prev) => !prev);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    return (
        <div className="dashboard-layout">
            <Navbar 
                onOpenSpotlight={() => setShowSpotlight(true)} 
                onOpenCamiLoveModal={() => setShowCamiLove(true)}
            />

            {/* ── Botón hamburguesa móvil — estilo BunnyCure ── */}
            <div
                className="d-md-none"
                style={{
                    padding: '10px 16px',
                    borderBottom: '1px solid #f0e0d8',
                    background: '#fdf6f3',
                }}
            >
                <button
                    onClick={handleShowSidebar}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        background: '#fff',
                        border: '1px solid #f0d8d0',
                        borderRadius: '10px',
                        padding: '8px 16px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: 600,
                        color: '#5c3d2e',
                        boxShadow: '0 1px 4px rgba(180,120,100,0.08)',
                    }}
                >
                    <span style={{ fontSize: '18px', lineHeight: 1 }}>☰</span>
                    <span>Menú</span>
                </button>
            </div>

            {/* ── Offcanvas sidebar móvil — estilo BunnyCure ── */}
            <Offcanvas
                show={showSidebar}
                onHide={handleCloseSidebar}
                className="d-md-none"
                placement="start"
            >
                <Offcanvas.Header
                    closeButton
                    style={{ borderBottom: '1px solid #f0e0d8', background: '#fdf6f3' }}
                >
                    <Offcanvas.Title>
                        <span style={{ fontWeight: 700, color: '#5c3d2e', fontSize: '17px' }}>
                            🐰 BunnyCure
                        </span>
                    </Offcanvas.Title>
                </Offcanvas.Header>
                <Offcanvas.Body className="p-0" style={{ background: '#fdf6f3' }}>
                    <Sidebar onNavigate={handleCloseSidebar} />
                </Offcanvas.Body>
            </Offcanvas>

            {/* ── Layout Principal: Sidebar Fijo + Contenido Fluido ── */}
            <div className="dashboard-body">
                {/* Sidebar fijo desktop */}
                <aside className="d-none d-md-block dashboard-sidebar-wrapper">
                    <Sidebar />
                </aside>

                {/* Main content que llena el 100% del espacio restante */}
                <main className="dashboard-main-content">
                    {children}
                </main>
            </div>

            {/* Buscador Universal Spotlight (Cmd+K / Ctrl+K) */}
            <SpotlightSearchModal
                show={showSpotlight}
                onHide={() => setShowSpotlight(false)}
                onOpenCashClosing={() => setShowCashClosing(true)}
            />

            {/* Cierre de Caja Modal Global */}
            <CashClosingModal
                show={showCashClosing}
                onHide={() => setShowCashClosing(false)}
            />

            {/* Modal de Amor para Cami (Aparece 1 vez al día o al hacer clic en su corazón) */}
            <CamiLoveModal
                forceOpen={showCamiLove}
                onCloseManual={() => setShowCamiLove(false)}
            />
        </div>
    );
}
