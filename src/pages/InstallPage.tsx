/**
 * Página dedicada para instalación de PWA.
 * URL amigable para compartir: /install
 */

import { Container, Card, Button, Row, Col } from 'react-bootstrap';
import { useState, useEffect } from 'react';

export default function InstallPage() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);

  useEffect(() => {
    // Detectar plataforma
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIOSDevice = /iphone|ipad|ipod/.test(userAgent);
    const isAndroidDevice = /android/.test(userAgent);
    
    setIsIOS(isIOSDevice);
    setIsAndroid(isAndroidDevice);

    // Verificar si ya está instalada
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    // Capturar evento de instalación (solo funciona en Chrome/Edge Android)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      return;
    }

    // Mostrar prompt de instalación
    deferredPrompt.prompt();

    // Esperar respuesta del usuario
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User response: ${outcome}`);

    // Limpiar prompt
    setDeferredPrompt(null);

    if (outcome === 'accepted') {
      setIsInstalled(true);
    }
  };

  return (
    <Container className="py-5">
      <Row className="justify-content-center">
        <Col md={8} lg={6}>
          <Card className="shadow-sm">
            <Card.Body className="p-4 p-md-5">
              <div className="text-center mb-4">
                <div 
                  className="mb-3" 
                  style={{ 
                    fontSize: '4rem',
                    background: 'linear-gradient(135deg, #ff6b9d 0%, #c44569 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent'
                  }}
                >
                  🐰
                </div>
                <h2 className="fw-bold mb-2">BunnyCure</h2>
                <p className="text-muted">Gestión de Centro Estético</p>
              </div>

              {isInstalled ? (
                <div className="alert alert-success text-center">
                  <i className="bi bi-check-circle fs-1 d-block mb-2"></i>
                  <h5>¡App ya instalada!</h5>
                  <p className="mb-0">Puedes acceder desde tu pantalla de inicio</p>
                  <Button 
                    variant="primary" 
                    className="mt-3"
                    onClick={() => window.location.href = '/dashboard'}
                  >
                    Ir al Dashboard
                  </Button>
                </div>
              ) : (
                <>
                  <h5 className="mb-3">Instalar como aplicación</h5>
                  
                  {/* Android Chrome/Edge */}
                  {deferredPrompt && (
                    <div className="mb-4">
                      <Button 
                        variant="primary" 
                        size="lg" 
                        className="w-100"
                        onClick={handleInstallClick}
                      >
                        <i className="bi bi-download me-2"></i>
                        Instalar App
                      </Button>
                      <small className="text-muted d-block mt-2 text-center">
                        Funciona sin conexión
                      </small>
                    </div>
                  )}

                  {/* iOS Safari */}
                  {isIOS && (
                    <div className="alert alert-info">
                      <h6 className="fw-bold mb-2">
                        <i className="bi bi-apple me-2"></i>
                        Instrucciones para iOS
                      </h6>
                      <ol className="mb-0 ps-3">
                        <li>Toca el ícono de <strong>Compartir</strong> 
                          <span className="ms-1">
                            <svg width="16" height="16" fill="currentColor">
                              <rect x="7" y="2" width="2" height="8"/>
                              <path d="M8 2 L5 5 L6.5 6.5 L8 5 L9.5 6.5 L11 5 Z"/>
                              <rect x="3" y="8" width="10" height="6" rx="1"/>
                            </svg>
                          </span>
                        </li>
                        <li>Selecciona <strong>"Añadir a pantalla de inicio"</strong></li>
                        <li>Toca <strong>"Añadir"</strong></li>
                      </ol>
                    </div>
                  )}

                  {/* Android otros navegadores */}
                  {isAndroid && !deferredPrompt && (
                    <div className="alert alert-info">
                      <h6 className="fw-bold mb-2">
                        <i className="bi bi-android2 me-2"></i>
                        Instrucciones para Android
                      </h6>
                      <p className="mb-2">Para instalar esta app:</p>
                      <ol className="mb-0 ps-3">
                        <li>Abre el menú del navegador (⋮)</li>
                        <li>Selecciona <strong>"Agregar a pantalla de inicio"</strong></li>
                        <li>Toca <strong>"Agregar"</strong></li>
                      </ol>
                    </div>
                  )}

                  {/* Desktop */}
                  {!isIOS && !isAndroid && (
                    <div className="alert alert-secondary">
                      <h6 className="fw-bold mb-2">
                        <i className="bi bi-laptop me-2"></i>
                        Instalación en Escritorio
                      </h6>
                      <p className="mb-2">
                        Busca el ícono de instalación en la barra de direcciones 
                        de Chrome/Edge o en el menú del navegador.
                      </p>
                    </div>
                  )}

                  <hr className="my-4" />

                  <h6 className="mb-3">Características</h6>
                  <ul className="list-unstyled">
                    <li className="mb-2">
                      <i className="bi bi-check-circle-fill text-success me-2"></i>
                      Funciona sin conexión
                    </li>
                    <li className="mb-2">
                      <i className="bi bi-check-circle-fill text-success me-2"></i>
                      Acceso rápido desde inicio
                    </li>
                    <li className="mb-2">
                      <i className="bi bi-check-circle-fill text-success me-2"></i>
                      Actualizaciones automáticas
                    </li>
                    <li className="mb-2">
                      <i className="bi bi-check-circle-fill text-success me-2"></i>
                      Experiencia de app nativa
                    </li>
                  </ul>

                  <div className="text-center mt-4">
                    <Button 
                      variant="outline-primary"
                      onClick={() => window.location.href = '/login'}
                    >
                      Continuar en navegador
                    </Button>
                  </div>
                </>
              )}
            </Card.Body>
          </Card>

          <div className="text-center mt-3">
            <small className="text-muted">
              <a href="/" className="text-decoration-none">
                Volver al inicio
              </a>
            </small>
          </div>
        </Col>
      </Row>
    </Container>
  );
}
