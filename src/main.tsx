import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import * as Sentry from '@sentry/react'
import './index.css'
import App from './App.tsx'
import './styles/mobile.css';
import './styles/bunny-theme.css';
import apiClient from './api/client';
import { initializeGA } from './utils/analytics';
import { getWebPushPublicKey, urlBase64ToUint8Array, WEB_PUSH_SYNC_KEY } from './api/webPush.api';

const sentryDsn = import.meta.env.VITE_SENTRY_DSN;
if (sentryDsn) {
  Sentry.init({
    dsn: sentryDsn,
    environment: import.meta.env.MODE || 'production',
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],
    tracesSampleRate: 0.1,
    tracePropagationTargets: ['localhost', 'api.bunnycure.cl', /^\/api/],
    replaysSessionSampleRate: 0.0,
    replaysOnErrorSampleRate: 1.0,
  });
}

const registerWebPushSubscription = async (registration: ServiceWorkerRegistration) => {
  if (!('PushManager' in window) || !('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;

  try {
    const publicKey = await getWebPushPublicKey();
    if (!publicKey) {
      console.warn('[PWA-PUSH] No hay clave pública VAPID disponible (backend/env)');
      return;
    }

    let subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });
    }

    const subscriptionJson = subscription.toJSON();
    const endpoint = subscriptionJson.endpoint;
    const p256dh = subscriptionJson.keys?.p256dh;
    const auth = subscriptionJson.keys?.auth;

    if (!endpoint || !p256dh || !auth) {
      console.warn('[PWA-PUSH] Suscripción inválida: faltan keys');
      return;
    }

    const lastSyncedEndpoint = localStorage.getItem(WEB_PUSH_SYNC_KEY);
    if (lastSyncedEndpoint === endpoint) {
      return;
    }

    await apiClient.post('/api/push-subscriptions', {
      endpoint,
      keys: { p256dh, auth },
    });

    localStorage.setItem(WEB_PUSH_SYNC_KEY, endpoint);
    console.log('[PWA-PUSH] ✅ Suscripción web push registrada exitosamente');
  } catch (error) {
    console.error('[PWA-PUSH] ❌ Error registrando suscripción push:', error);
  }
};

// Registrar Service Worker para notificaciones PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // Inicializar GA4
    initializeGA();
    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then((registration) => {
        if (!registration) return;
        console.log('✅ Service Worker registrado correctamente:', registration);

        registerWebPushSubscription(registration);

        // Trigger para chequeo de notificaciones
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
            registerWebPushSubscription(registration);
            setTimeout(triggerNotificationCheck, 1000);
          }
        });

        window.addEventListener('bunnycure-access-token-changed', () => {
          registerWebPushSubscription(registration);
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
