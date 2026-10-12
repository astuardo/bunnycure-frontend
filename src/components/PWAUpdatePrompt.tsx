import { Button } from './ui/Button';
import { usePWA } from '../utils/pwa';

/**
 * Componente que muestra un banner flotante cuando hay una actualización disponible
 * o cuando la app está lista para funcionar offline (Migrado a Tailwind CSS)
 */
export function PWAUpdatePrompt() {
  const { needRefresh, offlineReady, update, close } = usePWA();

  if (!needRefresh && !offlineReady) {
    return null;
  }

  return (
    <aside
      aria-label="Notificación de actualización de la aplicación"
      className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:bottom-6 sm:max-w-md z-[9999]"
    >
      {needRefresh && (
        <div className="bg-white border border-bunny-border rounded-2xl shadow-bunny-lg p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex-1">
            <h6 className="font-bold text-sm text-bunny-text flex items-center gap-1.5">
              <span>🎉</span> Nueva versión disponible
            </h6>
            <p className="text-xs text-bunny-text-muted mt-0.5">
              Actualiza para obtener las últimas funcionalidades y mejoras.
            </p>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
            <Button variant="primary" size="sm" onClick={update} className="flex-1 sm:flex-initial">
              Actualizar
            </Button>
            <Button variant="outline" size="sm" onClick={close} className="flex-1 sm:flex-initial">
              Más tarde
            </Button>
          </div>
        </div>
      )}

      {offlineReady && !needRefresh && (
        <div className="bg-white border border-emerald-200 rounded-2xl shadow-bunny-lg p-4 flex items-center justify-between gap-3">
          <div>
            <h6 className="font-bold text-sm text-emerald-900 flex items-center gap-1.5">
              <span>✅</span> Lista para funcionar offline
            </h6>
            <p className="text-xs text-emerald-700 mt-0.5">
              Ahora puedes usar BunnyCure sin conexión a internet.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={close}
            className="shrink-0 border-emerald-300 text-emerald-800 hover:bg-emerald-50"
          >
            Entendido
          </Button>
        </div>
      )}
    </aside>
  );
}
