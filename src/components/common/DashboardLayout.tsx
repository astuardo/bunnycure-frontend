import { useState, useEffect, ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { FiChevronLeft, FiX } from 'react-icons/fi';
import { useEdgeSwipe } from '../../hooks/useEdgeSwipe';
import { usePageTitle } from '../../hooks/usePageTitle';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import { BottomTabBar } from './BottomTabBar';
import { SpotlightSearchModal } from './SpotlightSearchModal';
import { CashClosingModal } from '../finances/CashClosingModal';
import { CamiLoveModal } from './CamiLoveModal';
import { useTenant } from '../../context/TenantContext';
import SubscriptionBanner from '../billing/SubscriptionBanner';

// Título de la pestaña del navegador por pantalla ("Citas · BunnyCure Studio"); la ruta más larga gana
const SCREEN_TITLES: [string, string][] = [
  ['/giftcards/generar', 'Generar GiftCard'],
  ['/settings/loyalty', 'Fidelización'],
  ['/customers/', 'Ficha de clienta'],
  ['/dashboard', 'Inicio'],
  ['/appointments', 'Citas'],
  ['/booking-requests', 'Solicitudes de reserva'],
  ['/calendar', 'Calendario'],
  ['/customers', 'Clientas'],
  ['/services', 'Servicios'],
  ['/products', 'Inventario'],
  ['/analytics', 'Analíticas'],
  ['/commissions', 'Comisiones'],
  ['/giftcards', 'GiftCards'],
  ['/invoices', 'Boletas SII'],
  ['/marketing', 'Marketing'],
  ['/reminders', 'Recordatorios'],
  ['/settings', 'Configuración'],
  ['/users', 'Equipo'],
  ['/suscripcion', 'Mi suscripción'],
  ['/admin/tenants', 'Salones'],
];

interface DashboardLayoutProps {
  children: ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const { tenant } = useTenant();
  const [showSidebar, setShowSidebar] = useState(false);
  const [showSpotlight, setShowSpotlight] = useState(false);
  const [showCashClosing, setShowCashClosing] = useState(false);
  const [showCamiLove, setShowCamiLove] = useState(false);

  const [closingSidebar, setClosingSidebar] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  usePageTitle(SCREEN_TITLES.find(([prefix]) => location.pathname.startsWith(prefix))?.[1] ?? 'Panel');

  // La animación de entrada corre una sola vez por apertura (no al soltar un arrastre a medias)
  const [drawerEntered, setDrawerEntered] = useState(false);
  const handleOpenSidebar = () => {
    setDrawerEntered(false);
    setShowSidebar(true);
  };
  // Cierre con salida animada: el panel se desliza fuera antes de desmontarse
  const handleCloseSidebar = () => {
    if (!showSidebar || closingSidebar) return;
    setClosingSidebar(true);
    window.setTimeout(() => {
      setShowSidebar(false);
      setClosingSidebar(false);
    }, 220);
  };
  const handleToggleSidebar = () => (showSidebar ? handleCloseSidebar() : handleOpenSidebar());

  // Gestos solo en pantallas táctiles angostas (donde existe el menú lateral móvil)
  const [touchLayout, setTouchLayout] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(pointer: coarse) and (max-width: 767px)').matches
  );
  useEffect(() => {
    const mq = window.matchMedia('(pointer: coarse) and (max-width: 767px)');
    const update = () => setTouchLayout(mq.matches);
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);
  const drawerWidth = typeof window !== 'undefined' ? Math.min(288, window.innerWidth * 0.85) : 288;
  // "Volver" solo si hay una pantalla anterior dentro de la app (React Router guarda su índice en
  // history.state.idx). Una pantalla de detalle abierta directo por enlace vuelve a su listado.
  const historyIndex = (window.history.state as { idx?: number } | null)?.idx ?? 0;
  const parentPath = /^\/customers\/[^/]+$/.test(location.pathname)
    ? '/customers'
    : location.pathname.startsWith('/giftcards/generar')
      ? '/giftcards'
      : null;
  const goBack = () => (historyIndex > 0 ? navigate(-1) : parentPath && navigate(parentPath));
  const drag = useEdgeSwipe({
    enabled: touchLayout,
    drawerOpen: showSidebar && !closingSidebar,
    drawerWidth,
    canGoBack: historyIndex > 0 || parentPath !== null,
    onClose: handleCloseSidebar,
    onBack: goBack,
  });
  const dragOffset = drag?.kind === 'close' ? drag.offset : null;
  const drawerVisible = showSidebar;

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
    // overflow-x-clip (no hidden): hidden convierte al contenedor en uno de scroll y la barra
    // superior "sticky" dejaba de quedar fija al bajar en el celular
    <div className="min-h-screen min-h-[100dvh] md:h-screen md:h-[100dvh] md:overflow-hidden flex flex-col w-full max-w-full m-0 p-0 overflow-x-clip bg-bunny-bg text-bunny-text">
      <Navbar
        onOpenSpotlight={() => setShowSpotlight(true)}
        onOpenCamiLoveModal={() => setShowCamiLove(true)}
        onToggleSidebar={handleToggleSidebar}
        isSidebarOpen={showSidebar}
      />

      {/* ── Drawer móvil de navegación (Tailwind) ── */}
      {drawerVisible && (
        <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true" aria-label="Menú">
          {/* Overlay backdrop: su opacidad acompaña al panel mientras se arrastra */}
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity duration-200 motion-reduce:transition-none"
            style={{ opacity: dragOffset !== null ? dragOffset / drawerWidth : closingSidebar ? 0 : 1 }}
            onClick={handleCloseSidebar}
          />

          {/* Panel lateral: sigue al dedo; al soltar termina con una curva de desaceleración */}
          <div
            className={`fixed inset-y-0 left-0 w-72 max-w-[85vw] pb-[env(safe-area-inset-bottom,0px)] bg-white border-r border-bunny-border shadow-bunny-lg flex flex-col z-10 touch-pan-y ${
              dragOffset !== null ? '' : 'transition-transform duration-200 ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:transition-none'
            } ${!drawerEntered ? 'animate-drawer-in' : ''}`}
            onAnimationEnd={() => setDrawerEntered(true)}
            style={{
              transform:
                dragOffset !== null
                  ? `translateX(${dragOffset - drawerWidth}px)`
                  : closingSidebar
                    ? 'translateX(-100%)'
                    : 'translateX(0)',
            }}
          >
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

      {drag?.kind === 'back' && (
        <div
          aria-hidden="true"
          className={`fixed left-2 top-1/2 z-50 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full shadow-bunny-lg md:hidden ${
            drag.progress >= 1 ? 'bg-bunny-primary text-white' : 'bg-white text-bunny-primary'
          }`}
          style={{ transform: `translate(${drag.progress * 24 - 24}px, -50%)`, opacity: Math.min(1, drag.progress * 1.5) }}
        >
          <FiChevronLeft className="h-6 w-6" />
        </div>
      )}

      {/* ── Layout Principal: Sidebar Desktop Fijo + Contenido Fluido con Scroll Independiente ── */}
      <div className="flex flex-row flex-1 w-full md:h-[calc(100vh-3.5rem)] md:h-[calc(100dvh-3.5rem)] md:overflow-hidden m-0 p-0">
        {/* Sidebar desktop fijo con scroll aislado */}
        <div className="hidden md:block shrink-0 h-full">
          <Sidebar />
        </div>

        {/* Main content con scroll independiente y contención de overscroll */}
        <main className="flex-1 min-w-0 w-full md:w-[calc(100%-250px)] h-full overflow-x-hidden md:overflow-y-auto md:overscroll-contain custom-scrollbar pb-[calc(5rem_+_env(safe-area-inset-bottom,0px))] md:pb-0">
          <SubscriptionBanner />
          {children}
        </main>
      </div>

      {/* Pestañas inferiores (solo celular) */}
      <BottomTabBar onOpenMenu={() => handleOpenSidebar()} menuOpen={showSidebar && !closingSidebar} />

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
