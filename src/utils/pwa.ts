import * as React from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'

/**
 * Hook para registrar el Service Worker y manejar actualizaciones
 * Se ejecuta automáticamente cuando hay una nueva versión disponible
 */
export function usePWA() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    offlineReady: [offlineReady, setOfflineReady],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(registration: ServiceWorkerRegistration | undefined) {
      console.log('✅ Service Worker registrado:', registration)
    },
    onRegisterError(error: Error) {
      console.error('❌ Error al registrar Service Worker:', error)
    },
  })

  const close = () => {
    setOfflineReady(false)
    setNeedRefresh(false)
  }

  const update = () => {
    updateServiceWorker(true)
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
