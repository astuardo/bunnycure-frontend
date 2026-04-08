import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import './styles/mobile.css';

// Registrar Service Worker para notificaciones PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then((registration) => {
        console.log('✅ Service Worker registrado correctamente:', registration);
        
        // Configurar listener para mensajes del Service Worker
        navigator.serviceWorker.addEventListener('message', (event) => {
          if (event.data && event.data.type === 'REQUEST_AUTH_TOKEN') {
            // Enviar token al Service Worker (jwt_token, NO 'token')
            const token = localStorage.getItem('jwt_token');
            if (token && registration.active) {
              registration.active.postMessage({
                type: 'AUTH_TOKEN_RESPONSE',
                token: token,
              });
              console.log('[App] ✅ Token JWT enviado al Service Worker');
            } else {
              console.warn('[App] ⚠️ No hay token JWT disponible');
            }
          }
        });
        
        // NUEVO: Trigger para chequeo de notificaciones
        const triggerNotificationCheck = () => {
          if (registration.active) {
            registration.active.postMessage({ type: 'CHECK_APPOINTMENTS_NOW' });
            console.log('[App] 🔔 Solicitando chequeo de citas al Service Worker');
          }
        };
        
        // Chequear al cargar la app
        setTimeout(triggerNotificationCheck, 2000);
        
        // Chequear cada 5 minutos mientras la app está abierta
        setInterval(triggerNotificationCheck, 5 * 60 * 1000);
        
        // Chequear cuando la app vuelve a estar visible
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible') {
            console.log('[App] App visible, triggering notification check');
            setTimeout(triggerNotificationCheck, 1000);
          }
        });
      })
      .catch((error) => {
        console.error('❌ Error al registrar Service Worker:', error);
      });
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
