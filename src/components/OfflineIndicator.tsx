import { useOnlineStatus } from '../utils/pwa';

/**
 * Indicador de estado offline (Migrado a Tailwind CSS)
 * Muestra un banner sticky superior cuando la app pierde conexión
 */
export function OfflineIndicator() {
  const isOnline = useOnlineStatus();

  if (isOnline) {
    return null;
  }

  return (
    <div
      role="alert"
      className="sticky top-0 z-[1050] bg-amber-600 text-white text-center py-2 px-4 shadow-md text-xs sm:text-sm font-medium flex items-center justify-center gap-2 tracking-wide"
    >
      <span className="text-base">📡</span>
      <span>
        <strong>Sin conexión</strong> — Estás trabajando en modo offline. Los datos se sincronizarán al reconectar.
      </span>
    </div>
  );
}
