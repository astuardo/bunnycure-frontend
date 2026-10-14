import { useState, useEffect, ReactNode } from 'react';
import { FiX } from 'react-icons/fi';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import { SpotlightSearchModal } from './SpotlightSearchModal';
import { CashClosingModal } from '../finances/CashClosingModal';
import { CamiLoveModal } from './CamiLoveModal';
import { useTenant } from '../../context/TenantContext';

interface DashboardLayoutProps {
  children: ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const { tenant } = useTenant();
  const [showSidebar, setShowSidebar] = useState(false);
  const [showSpotlight, setShowSpotlight] = useState(false);
  const [showCashClosing, setShowCashClosing] = useState(false);
  const [showCamiLove, setShowCamiLove] = useState(false);

  const handleCloseSidebar = () => setShowSidebar(false);
  const handleToggleSidebar = () => setShowSidebar((prev) => !prev);

  // Bloquear scroll de fondo cuando el drawer móvil está abierto
  useEffect(() => {
    if (showSidebar) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [showSidebar]);

  // Escuchador global para abrir el Spotlight con Cmd+K o Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        setShowSpotlight((prev) => !prev);
      }
      if (e.key === 'Escape' && showSidebar) {
        setShowSidebar(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showSidebar]);

  return (
    <div className="min-h-screen min-h-[100dvh] md:h-screen md:h-[100dvh] md:overflow-hidden flex flex-col w-full max-w-full m-0 p-0 overflow-x-hidden bg-bunny-bg text-bunny-text">
      <Navbar
        onOpenSpotlight={() => setShowSpotlight(true)}
        onOpenCamiLoveModal={() => setShowCamiLove(true)}
        onToggleSidebar={handleToggleSidebar}
        isSidebarOpen={showSidebar}
      />

      {/* ── Drawer móvil de navegación (Tailwind) ── */}
      {showSidebar && (
        <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true">
          {/* Overlay backdrop */}
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity animate-fade-in"
            onClick={handleCloseSidebar}
          />

          {/* Panel lateral */}
          <div className="fixed inset-y-0 left-0 w-72 max-w-[85vw] bg-white border-r border-bunny-border shadow-bunny-lg flex flex-col z-10 animate-fade-in">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-bunny-border/70 bg-bunny-paper/50">
              <span className="font-bold text-bunny-cocoa text-base flex items-center gap-2">
                {tenant.logoUrl && tenant.logoUrl !== '/images/logo.png' ? (
                  <img
                    src={tenant.logoUrl}
                    alt={tenant.name}
                    className="h-6 w-auto object-contain rounded"
                    onError={(e) => {
                      (e.currentTarget as HTMLElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <span>💅</span>
                )}
                <span className="truncate">{tenant.name || 'BunnyCure'}</span>
              </span>
              <button
                type="button"
                onClick={handleCloseSidebar}
                className="rounded-lg p-1 text-bunny-text-muted hover:text-bunny-cocoa hover:bg-bunny-blush transition-colors"
                aria-label="Cerrar menú"
              >
                <FiX className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto overscroll-contain custom-scrollbar">
              <Sidebar onNavigate={handleCloseSidebar} />
            </div>
          </div>
        </div>
      )}

      {/* ── Layout Principal: Sidebar Desktop Fijo + Contenido Fluido con Scroll Independiente ── */}
      <div className="flex flex-row flex-1 w-full md:h-[calc(100vh-3.5rem)] md:h-[calc(100dvh-3.5rem)] md:overflow-hidden m-0 p-0">
        {/* Sidebar desktop fijo con scroll aislado */}
        <div className="hidden md:block shrink-0 h-full">
          <Sidebar />
        </div>

        {/* Main content con scroll independiente y contención de overscroll */}
        <main className="flex-1 min-w-0 w-full md:w-[calc(100%-250px)] h-full overflow-x-hidden md:overflow-y-auto md:overscroll-contain custom-scrollbar pb-4 md:pb-0">
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
