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
            // Enviar token al Service Worker
            const token = localStorage.getItem('token');
            if (token && registration.active) {
              registration.active.postMessage({
                type: 'AUTH_TOKEN_RESPONSE',
                token: token,
              });
            }
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
