import * as React from 'react'

/**
 * Hook para registrar el Service Worker y manejar actualizaciones
 * Se ejecuta automáticamente cuando hay una nueva versión disponible
 */
export function usePWA() {
  const [needRefresh, setNeedRefresh] = React.useState(false)
  const [offlineReady, setOfflineReady] = React.useState(false)

  const close = () => {
    setOfflineReady(false)
    setNeedRefresh(false)
  }

  const update = () => {
    window.location.reload()
  }

  return {
    needRefresh,
    offlineReady,
    update,
    close,
  }
}

/**
 * Detecta si la app está en modo offline
 */
export function useOnlineStatus() {
  const [isOnline, setIsOnline] = React.useState(navigator.onLine)

  React.useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  return isOnline
}
