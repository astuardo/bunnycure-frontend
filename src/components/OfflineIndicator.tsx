import { Alert } from 'react-bootstrap'
import { useOnlineStatus } from '../utils/pwa'

/**
 * Indicador de estado offline
 * Muestra un banner cuando la app pierde conexión
 */
export function OfflineIndicator() {
  const isOnline = useOnlineStatus()

  if (isOnline) {
    return null
  }

  return (
    <Alert 
      variant="warning" 
      className="mb-0 rounded-0 text-center py-2"
      style={{ position: 'sticky', top: 0, zIndex: 1050 }}
    >
      <small>
        📡 <strong>Sin conexión</strong> - Estás trabajando en modo offline
      </small>
    </Alert>
  )
}
