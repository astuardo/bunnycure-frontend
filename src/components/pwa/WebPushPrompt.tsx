import { useState, useEffect } from 'react';
import { Button } from '../ui/Button';
import { FiBell, FiX } from 'react-icons/fi';
import { useNotificationPermission } from '../../hooks/useNotificationPermission';
import { toast } from 'react-toastify';

const DISMISS_KEY = 'webpush_prompt_dismissed_until';

/**
 * Prompt flotante no intrusivo para activar notificaciones Push en dispositivos móviles / escritorio
 */
export function WebPushPrompt() {
  const { isSupported, isSubscribed, permission, subscribe, isLoading } = useNotificationPermission();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!isSupported) {
      setIsVisible(false);
      return;
    }

    if (isSubscribed || permission === 'denied') {
      setIsVisible(false);
      return;
    }

    // Comprobar si fue descartado previamente
    const dismissedUntil = localStorage.getItem(DISMISS_KEY);
    if (dismissedUntil && new Date(dismissedUntil) > new Date()) {
      setIsVisible(false);
      return;
    }

    // Esperar unos segundos tras cargar la app para no abrumar al usuario
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 3500);

    return () => clearTimeout(timer);
  }, [isSupported, isSubscribed, permission]);

  const handleSubscribe = async () => {
    try {
      await subscribe();
      toast.success('🔔 ¡Notificaciones activadas en este dispositivo!');
      setIsVisible(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'No se pudo activar las notificaciones';
      toast.error(msg);
      setIsVisible(false);
    }
  };

  const handleDismiss = () => {
    setIsVisible(false);
    // No volver a preguntar durante 7 días
    const nextShow = new Date();
    nextShow.setDate(nextShow.getDate() + 7);
    localStorage.setItem(DISMISS_KEY, nextShow.toISOString());
  };

  if (!isVisible) {
    return null;
  }

  return (
    <aside
      role="region"
      aria-label="Aviso de activación de notificaciones push"
      className="fixed bottom-[calc(1rem_+_var(--bottom-nav-h,0px)_+_env(safe-area-inset-bottom,0px))] sm:bottom-6 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-40 bg-bunny-card/95 backdrop-blur-md border border-bunny-border/80 shadow-2xl rounded-2xl p-4 transition-all duration-300 animate-slide-up"
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-pink-100 dark:bg-pink-950/60 text-pink-600 dark:text-pink-400 flex items-center justify-center shrink-0">
          <FiBell className="w-5 h-5 animate-bounce-slow" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h4 className="text-sm font-semibold text-bunny-text truncate">
              ¿Activar alertas de citas?
            </h4>
            <button
              onClick={handleDismiss}
              aria-label="Cerrar aviso de notificaciones"
              className="text-bunny-text-muted hover:text-bunny-text transition-colors p-1"
            >
              <FiX className="w-4 h-4" />
            </button>
          </div>
          <p className="text-xs text-bunny-text-muted mt-1 leading-relaxed">
            Recibe recordatorios automáticos de tus citas en tu celular aun cuando no tengas la app abierta.
          </p>

          <div className="flex items-center gap-2 mt-3">
            <Button
              size="sm"
              variant="primary"
              onClick={handleSubscribe}
              disabled={isLoading}
              className="text-xs py-1.5 px-3 bg-pink-500 hover:bg-pink-600 text-white"
            >
              {isLoading ? 'Activando...' : 'Activar Alertas'}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleDismiss}
              className="text-xs py-1.5 px-3 text-bunny-text-muted hover:text-bunny-text"
            >
              Ahora no
            </Button>
          </div>
        </div>
      </div>
    </aside>
  );
}
