import { Alert, Button } from 'react-bootstrap'
import { usePWA } from '../utils/pwa'

/**
 * Componente que muestra un banner cuando hay una actualización disponible
 * o cuando la app está lista para funcionar offline
 */
export function PWAUpdatePrompt() {
  const { needRefresh, offlineReady, update, close } = usePWA()

  if (!needRefresh && !offlineReady) {
    return null
  }

  return (
    <div 
      style={{
        position: 'fixed',
        bottom: 0,
        right: 0,
        left: 0,
        zIndex: 9999,
        padding: '1rem'
      }}
    >
      {needRefresh && (
        <Alert variant="info" className="d-flex justify-content-between align-items-center mb-0">
          <div>
            <strong>🎉 Nueva versión disponible</strong>
            <p className="mb-0 small">Actualiza para obtener las últimas funcionalidades</p>
          </div>
          <div className="d-flex gap-2">
            <Button variant="primary" size="sm" onClick={update}>
              Actualizar
            </Button>
            <Button variant="outline-secondary" size="sm" onClick={close}>
              Más tarde
            </Button>
          </div>
        </Alert>
      )}

      {offlineReady && !needRefresh && (
        <Alert variant="success" className="d-flex justify-content-between align-items-center mb-0">
          <div>
            <strong>✅ App lista para funcionar offline</strong>
            <p className="mb-0 small">Ahora puedes usar BunnyCure sin conexión</p>
          </div>
          <Button variant="outline-success" size="sm" onClick={close}>
            Entendido
          </Button>
        </Alert>
      )}
    </div>
  )
}
