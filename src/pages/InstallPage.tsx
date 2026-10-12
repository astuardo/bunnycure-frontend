/**
 * Página dedicada para instalación de PWA (Migrada a Tailwind CSS)
 * URL amigable para compartir: /install
 */

import { useState, useEffect } from 'react';
import { Card, CardBody, Button, Alert } from '../components/ui';
import { FiDownload, FiCheckCircle, FiMonitor, FiArrowLeft } from 'react-icons/fi';
import { FaApple, FaAndroid } from 'react-icons/fa';
import { Link } from 'react-router-dom';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function InstallPage() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(() => {
    return typeof window !== 'undefined' && window.matchMedia('(display-mode: standalone)').matches;
  });
  const [isIOS] = useState(() => {
    if (typeof window === 'undefined') return false;
    const userAgent = window.navigator.userAgent.toLowerCase();
    return /iphone|ipad|ipod/.test(userAgent);
  });
  const [isAndroid] = useState(() => {
    if (typeof window === 'undefined') return false;
    const userAgent = window.navigator.userAgent.toLowerCase();
    return /android/.test(userAgent);
  });

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User response: ${outcome}`);
    setDeferredPrompt(null);

    if (outcome === 'accepted') {
      setIsInstalled(true);
    }
  };

  return (
    <div className="min-h-screen min-h-[100dvh] bg-bunny-primary-light flex items-center justify-center p-4 selection:bg-bunny-primary selection:text-white">
      <div className="w-full max-w-xl mx-auto py-6">
        <Card className="shadow-bunny-lg border-bunny-border">
          <CardBody className="p-6 sm:p-10">
            <div className="text-center mb-8">
              <div className="text-5xl mb-3 select-none">🐰</div>
              <h2 className="text-3xl font-extrabold text-bunny-text tracking-tight">BunnyCure</h2>
              <p className="text-sm font-medium text-bunny-text-muted mt-1">Gestión de Centro Estético & Citas</p>
            </div>

            {isInstalled ? (
              <div className="space-y-4">
                <Alert variant="success" className="text-center justify-center">
                  <div className="flex flex-col items-center p-2">
                    <FiCheckCircle className="w-12 h-12 text-emerald-600 mb-2" />
                    <h5 className="font-bold text-base mb-1">¡App ya instalada!</h5>
                    <p className="text-sm text-emerald-800 mb-0">
                      Puedes acceder directamente desde tu pantalla de inicio o escritorio.
                    </p>
                  </div>
                </Alert>
                <div className="pt-2">
                  <Button
                    variant="primary"
                    size="lg"
                    fullWidth
                    onClick={() => (window.location.href = '/dashboard')}
                  >
                    Ir al Dashboard
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <h5 className="text-base font-bold text-bunny-text">Instalar como aplicación nativa</h5>

                {/* Prompt nativo en Android Chrome / Edge */}
                {deferredPrompt && (
                  <div className="space-y-2">
                    <Button
                      variant="primary"
                      size="lg"
                      fullWidth
                      onClick={handleInstallClick}
                      leftIcon={<FiDownload className="w-5 h-5 mr-2" />}
                    >
                      Instalar Aplicación
                    </Button>
                    <p className="text-xs text-center text-bunny-text-muted">
                      Acceso rápido y funcionamiento garantizado sin conexión
                    </p>
                  </div>
                )}

                {/* Instrucciones para iOS Safari */}
                {isIOS && (
                  <div className="bg-blue-50/80 border border-blue-200 rounded-xl p-4 text-sm text-blue-900 space-y-2">
                    <h6 className="font-bold flex items-center gap-2 text-blue-950">
                      <FaApple className="w-4 h-4 text-blue-800" />
                      Instrucciones para iPhone / iPad (Safari)
                    </h6>
                    <ol className="list-decimal pl-5 space-y-1.5 text-xs text-blue-900 leading-relaxed">
                      <li>
                        Toca el botón <strong>Compartir</strong> (ícono de caja con flecha arriba) en la barra de Safari.
                      </li>
                      <li>
                        Desplázate hacia abajo y selecciona <strong>"Añadir a pantalla de inicio"</strong>.
                      </li>
                      <li>
                        Toca <strong>"Añadir"</strong> en la esquina superior derecha.
                      </li>
                    </ol>
                  </div>
                )}

                {/* Instrucciones para Android sin prompt */}
                {isAndroid && !deferredPrompt && (
                  <div className="bg-blue-50/80 border border-blue-200 rounded-xl p-4 text-sm text-blue-900 space-y-2">
                    <h6 className="font-bold flex items-center gap-2 text-blue-950">
                      <FaAndroid className="w-4 h-4 text-emerald-700" />
                      Instrucciones para Android
                    </h6>
                    <ol className="list-decimal pl-5 space-y-1.5 text-xs text-blue-900 leading-relaxed">
                      <li>Abre el menú de opciones del navegador (los tres puntos ⋮).</li>
                      <li>Selecciona <strong>"Agregar a pantalla de inicio"</strong> o <strong>"Instalar aplicación"</strong>.</li>
                      <li>Confirma tocando <strong>"Agregar"</strong>.</li>
                    </ol>
                  </div>
                )}

                {/* Instrucciones para Desktop */}
                {!isIOS && !isAndroid && (
                  <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm text-gray-800 space-y-2">
                    <h6 className="font-bold flex items-center gap-2 text-gray-900">
                      <FiMonitor className="w-4 h-4 text-gray-700" />
                      Instalación en Computador
                    </h6>
                    <p className="text-xs text-gray-700 leading-relaxed mb-0">
                      Haz clic en el ícono de instalación que aparece en la barra de direcciones de tu navegador (Chrome o Edge) o selecciona <em>Instalar BunnyCure</em> en el menú superior derecho.
                    </p>
                  </div>
                )}

                <div className="border-t border-bunny-border pt-4">
                  <h6 className="text-xs font-bold uppercase tracking-wider text-bunny-text-muted mb-3">
                    Beneficios de la instalación
                  </h6>
                  <ul className="space-y-2 text-xs font-medium text-bunny-text">
                    <li className="flex items-center gap-2">
                      <FiCheckCircle className="w-4 h-4 text-bunny-success shrink-0" />
                      Funciona sin conexión a internet (modo offline)
                    </li>
                    <li className="flex items-center gap-2">
                      <FiCheckCircle className="w-4 h-4 text-bunny-success shrink-0" />
                      Acceso directo de un toque desde tu pantalla de inicio
                    </li>
                    <li className="flex items-center gap-2">
                      <FiCheckCircle className="w-4 h-4 text-bunny-success shrink-0" />
                      Notificaciones instantáneas de nuevas citas
                    </li>
                    <li className="flex items-center gap-2">
                      <FiCheckCircle className="w-4 h-4 text-bunny-success shrink-0" />
                      Mayor velocidad y rendimiento de app nativa
                    </li>
                  </ul>
                </div>

                <div className="pt-2 text-center">
                  <Button
                    variant="outline"
                    size="md"
                    onClick={() => (window.location.href = '/login')}
                  >
                    Continuar en el navegador
                  </Button>
                </div>
              </div>
            )}
          </CardBody>
        </Card>

        <div className="text-center mt-4">
          <Link
            to="/login"
            className="text-xs font-medium text-bunny-text-muted hover:text-bunny-primary transition-colors inline-flex items-center gap-1.5"
          >
            <FiArrowLeft className="w-3.5 h-3.5" />
            Volver al inicio
          </Link>
        </div>
      </div>
    </div>
  );
}
