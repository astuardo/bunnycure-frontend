import { useState, useEffect } from 'react'
import { Button, Toast, ToastContainer } from 'react-bootstrap'

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

/**
 * Componente que muestra un botón/toast para instalar la PWA
 * Solo aparece cuando el navegador soporta instalación y no está instalada
 */
export function InstallPWA() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showToast, setShowToast] = useState(false)

  useEffect(() => {
    const handler = (e: Event) => {
      // Prevenir que el navegador muestre su propio prompt
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setShowToast(true)
    }

    window.addEventListener('beforeinstallprompt', handler)

    return () => {
      window.removeEventListener('beforeinstallprompt', handler)
    }
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) return

    // Mostrar el prompt de instalación
    deferredPrompt.prompt()

    // Esperar la respuesta del usuario
    const { outcome } = await deferredPrompt.userChoice
    
    console.log(`Usuario ${outcome === 'accepted' ? 'aceptó' : 'rechazó'} la instalación`)

    // Limpiar el prompt usado
    setDeferredPrompt(null)
    setShowToast(false)
  }

  const handleDismiss = () => {
    setShowToast(false)
    // Volver a mostrar el toast en 7 días
    const nextShowDate = new Date()
    nextShowDate.setDate(nextShowDate.getDate() + 7)
    localStorage.setItem('pwa-install-dismissed', nextShowDate.toISOString())
  }

  useEffect(() => {
    // Verificar si el usuario ya descartó el toast recientemente
    const dismissedDate = localStorage.getItem('pwa-install-dismissed')
    if (dismissedDate && new Date(dismissedDate) > new Date()) {
      setShowToast(false)
    }
  }, [])

  if (!deferredPrompt) return null

  return (
    <ToastContainer position="bottom-end" className="p-3">
      <Toast 
        show={showToast} 
        onClose={handleDismiss}
        bg="primary"
        autohide
        delay={10000}
      >
        <Toast.Header>
          <strong className="me-auto">📱 Instalar BunnyCure</strong>
        </Toast.Header>
        <Toast.Body className="text-white">
          <p className="mb-2">
            Instala BunnyCure en tu dispositivo para acceso rápido y funcionalidad offline
          </p>
          <div className="d-flex gap-2">
            <Button 
              variant="light" 
              size="sm" 
              onClick={handleInstall}
              className="flex-grow-1"
            >
              Instalar ahora
            </Button>
            <Button 
              variant="outline-light" 
              size="sm" 
              onClick={handleDismiss}
            >
              Más tarde
            </Button>
          </div>
        </Toast.Body>
      </Toast>
    </ToastContainer>
  )
}
