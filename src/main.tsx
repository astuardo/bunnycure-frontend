import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import './styles/mobile.css';
import './styles/bunny-theme.css';
import apiClient from './api/client';
import { initializeGA } from './utils/analytics';

const WEB_PUSH_SYNC_KEY = 'webpush_subscription_synced_endpoint';

const urlBase64ToUint8Array = (base64String: string): Uint8Array<ArrayBuffer> => {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(new ArrayBuffer(rawData.length));
  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
};

const registerWebPushSubscription = async (registration: ServiceWorkerRegistration) => {
  if (!('PushManager' in window) || !('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;

  const publicKey = import.meta.env.VITE_WEB_PUSH_PUBLIC_KEY?.trim();
  if (!publicKey) {
    console.warn('[PWA-PUSH] Falta VITE_WEB_PUSH_PUBLIC_KEY');
    return;
  }

  try {
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

    const lastSyncedEndpoint = localStorage.getItem('webpush_subscription_synced_endpoint');
    if (lastSyncedEndpoint === endpoint) {
      return;
    }

    await apiClient.post('/api/push-subscriptions', {
      endpoint,
      keys: { p256dh, auth },
    });

    localStorage.setItem(WEB_PUSH_SYNC_KEY, endpoint);
    console.log('[PWA-PUSH] ✅ Suscripción web push registrada');
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
        console.log('✅ Service Worker registrado correctamente:', registration);

        registerWebPushSubscription(registration);

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
