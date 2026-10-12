import { useState, useEffect } from 'react';
import { Button } from './ui/Button';
import { FiX } from 'react-icons/fi';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

/**
 * Componente que muestra una tarjeta flotante para instalar la PWA (Migrado a Tailwind CSS)
 * Solo aparece cuando el navegador soporta instalación y no está instalada
 */
export function InstallPWA() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showToast, setShowToast] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      // Prevenir que el navegador muestre su propio prompt
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowToast(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    // Mostrar el prompt de instalación
    deferredPrompt.prompt();

    // Esperar la respuesta del usuario
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`Usuario ${outcome === 'accepted' ? 'aceptó' : 'rechazó'} la instalación`);

    // Limpiar el prompt usado
    setDeferredPrompt(null);
    setShowToast(false);
  };

  const handleDismiss = () => {
    setShowToast(false);
    // Volver a mostrar el toast en 7 días
    const nextShowDate = new Date();
    nextShowDate.setDate(nextShowDate.getDate() + 7);
    localStorage.setItem('pwa-install-dismissed', nextShowDate.toISOString());
  };

  useEffect(() => {
    // Verificar si el usuario ya descartó el toast recientemente
    const dismissedDate = localStorage.getItem('pwa-install-dismissed');
    if (dismissedDate && new Date(dismissedDate) > new Date()) {
      setShowToast(false);
    }
  }, []);

  if (!deferredPrompt || !showToast) return null;

  return (
    <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-[9999] max-w-sm w-[calc(100vw-2rem)]">
      <div className="bg-bunny-secondary text-white rounded-2xl shadow-bunny-lg p-4 border border-bunny-secondary/40">
        <div className="flex items-start justify-between gap-2 mb-2">
          <strong className="text-sm font-bold flex items-center gap-1.5">
            <span>📱</span> Instalar BunnyCure
          </strong>
          <button
            onClick={handleDismiss}
            className="text-white/70 hover:text-white p-1 rounded-lg transition-colors focus:outline-none"
            aria-label="Cerrar aviso"
          >
            <FiX className="w-4 h-4" />
          </button>
        </div>
        <p className="text-xs text-white/90 mb-3 leading-relaxed">
          Instala BunnyCure en tu pantalla de inicio para acceso inmediato y funcionamiento offline.
        </p>
        <div className="flex gap-2">
          <Button
            variant="primary"
            size="sm"
            onClick={handleInstall}
            className="flex-1 bg-white text-bunny-secondary hover:bg-white/90 font-semibold"
          >
            Instalar ahora
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDismiss}
            className="text-white/80 hover:bg-white/10 hover:text-white"
          >
            Más tarde
          </Button>
        </div>
      </div>
    </div>
  );
}
