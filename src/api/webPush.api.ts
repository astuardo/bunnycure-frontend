import apiClient from './client';
import { ApiResponse } from '../types/api.types';

export const WEB_PUSH_SYNC_KEY = 'webpush_subscription_synced_endpoint';

export interface WebPushSubscriptionRequest {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export interface WebPushSubscriptionResponse {
  id: number;
  endpoint: string;
  active: boolean;
}

export interface WebPushStatus {
  isSupported: boolean;
  permission: NotificationPermission | 'unsupported';
  isSubscribed: boolean;
  endpoint: string | null;
}

/**
 * Convierte clave VAPID pública en base64 url-safe a Uint8Array
 */
export const urlBase64ToUint8Array = (base64String: string): Uint8Array<ArrayBuffer> => {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const buffer = new ArrayBuffer(rawData.length);
  const outputArray = new Uint8Array(buffer);
  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
};

let cachedPublicKey: string | null = null;

/**
 * Obtiene la clave pública VAPID:
 * 1. Prioriza VITE_WEB_PUSH_PUBLIC_KEY si está definida.
 * 2. Si no, la consulta al backend GET /api/push-subscriptions/public-key.
 */
export const getWebPushPublicKey = async (): Promise<string | null> => {
  if (cachedPublicKey) {
    return cachedPublicKey;
  }

  const envKey = import.meta.env.VITE_WEB_PUSH_PUBLIC_KEY?.trim();
  if (envKey) {
    cachedPublicKey = envKey;
    return envKey;
  }

  try {
    const response = await apiClient.get<ApiResponse<{ publicKey: string }>>('/api/push-subscriptions/public-key');
    const key = response.data?.data?.publicKey?.trim();
    if (key) {
      cachedPublicKey = key;
      return key;
    }
  } catch (error) {
    console.error('[WebPush] Error al obtener clave pública VAPID desde el backend:', error);
  }

  return null;
};

/**
 * Chequea soporte y estado de suscripción en el navegador
 */
export const getWebPushStatus = async (): Promise<WebPushStatus> => {
  const isSupported =
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window;

  if (!isSupported) {
    return {
      isSupported: false,
      permission: 'unsupported',
      isSubscribed: false,
      endpoint: null,
    };
  }

  const permission = Notification.permission;
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    return {
      isSupported: true,
      permission,
      isSubscribed: !!sub,
      endpoint: sub ? sub.endpoint : null,
    };
  } catch {
    return {
      isSupported: true,
      permission,
      isSubscribed: false,
      endpoint: null,
    };
  }
};

/**
 * Suscribe este dispositivo a notificaciones Web Push y registra en backend
 */
export const subscribeDeviceToPush = async (
  customPublicKey?: string
): Promise<{ success: boolean; message: string }> => {
  const status = await getWebPushStatus();
  if (!status.isSupported) {
    throw new Error('Tu navegador o dispositivo no soporta notificaciones Web Push.');
  }

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    throw new Error('Permisos de notificación no concedidos.');
  }

  const publicKey = customPublicKey || (await getWebPushPublicKey());
  if (!publicKey) {
    throw new Error('No se pudo obtener la clave pública VAPID para suscribir el dispositivo.');
  }

  const registration = await navigator.serviceWorker.ready;
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
    throw new Error('Error al generar las credenciales de cifrado de la suscripción.');
  }

  await apiClient.post<ApiResponse<WebPushSubscriptionResponse>>('/api/push-subscriptions', {
    endpoint,
    keys: { p256dh, auth },
  });

  localStorage.setItem(WEB_PUSH_SYNC_KEY, endpoint);
  console.log('[WebPush] ✅ Dispositivo suscrito y registrado en el backend exitosamente');
  return { success: true, message: 'Dispositivo suscrito exitosamente a notificaciones push.' };
};

/**
 * Desactiva la suscripción Web Push en el servidor y en el navegador
 */
export const unsubscribeDeviceFromPush = async (): Promise<{ success: boolean }> => {
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (subscription) {
      try {
        await apiClient.post('/api/push-subscriptions/unsubscribe', {
          endpoint: subscription.endpoint,
        });
      } catch (err) {
        console.warn('[WebPush] Servidor no pudo recibir baja, procediendo localmente:', err);
      }
      await subscription.unsubscribe();
    }
    localStorage.removeItem(WEB_PUSH_SYNC_KEY);
    return { success: true };
  } catch (error) {
    console.error('[WebPush] Error cancelando suscripción:', error);
    throw error;
  }
};

/**
 * Envía una notificación push de prueba real desde el backend
 */
export const sendTestPushNotification = async (): Promise<{ success: boolean }> => {
  const status = await getWebPushStatus();
  const endpoint = status.endpoint;

  const response = await apiClient.post<ApiResponse<{ success: boolean }>>(
    '/api/push-subscriptions/test',
    endpoint ? { endpoint } : {}
  );

  return { success: response.data?.data?.success ?? true };
};
