/**
 * Hook para gestionar permisos de notificaciones PWA y suscripción Web Push nativa
 * Maneja solicitud de permisos, estado de suscripción en servidor y pruebas
 */

import { useState, useEffect, useCallback } from 'react';
import {
  getWebPushStatus,
  subscribeDeviceToPush,
  unsubscribeDeviceFromPush,
  sendTestPushNotification,
} from '../api/webPush.api';

export type NotificationPermissionState = 'default' | 'granted' | 'denied' | 'unsupported';

export interface UseNotificationPermissionReturn {
  permission: NotificationPermissionState;
  isSupported: boolean;
  isSubscribed: boolean;
  isLoading: boolean;
  requestPermission: () => Promise<NotificationPermission>;
  subscribe: () => Promise<boolean>;
  unsubscribe: () => Promise<boolean>;
  sendTestNotification: (title: string, body: string) => void;
  sendServerTestPush: () => Promise<boolean>;
  refreshStatus: () => Promise<void>;
}

export const useNotificationPermission = (): UseNotificationPermissionReturn => {
  const [permission, setPermission] = useState<NotificationPermissionState>('default');
  const [isSubscribed, setIsSubscribed] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const isSupported =
    typeof window !== 'undefined' && 'Notification' in window && 'serviceWorker' in navigator;

  const refreshStatus = useCallback(async () => {
    if (!isSupported) {
      setPermission('unsupported');
      setIsSubscribed(false);
      return;
    }

    try {
      const status = await getWebPushStatus();
      setPermission(status.permission as NotificationPermissionState);
      setIsSubscribed(status.isSubscribed);
    } catch {
      setPermission(Notification.permission as NotificationPermissionState);
    }
  }, [isSupported]);

  useEffect(() => {
    refreshStatus();
  }, [refreshStatus]);

  const requestPermission = async (): Promise<NotificationPermission> => {
    if (!isSupported) {
      throw new Error('Notificaciones no soportadas en este dispositivo');
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result as NotificationPermissionState);
      if (result === 'granted') {
        // Al conceder permiso, intentamos suscribir de inmediato
        try {
          await subscribeDeviceToPush();
          setIsSubscribed(true);
        } catch (e) {
          console.warn('[WebPush] Permiso concedido pero pendiente registro de suscripción:', e);
        }
      }
      return result;
    } catch (error) {
      console.error('Error al solicitar permisos de notificación:', error);
      throw error;
    }
  };

  const subscribe = async (): Promise<boolean> => {
    setIsLoading(true);
    try {
      const res = await subscribeDeviceToPush();
      setPermission('granted');
      setIsSubscribed(true);
      return res.success;
    } catch (error) {
      console.error('[WebPush] Error al suscribir dispositivo:', error);
      throw error;
    } finally {
      setIsLoading(false);
      await refreshStatus();
    }
  };

  const unsubscribe = async (): Promise<boolean> => {
    setIsLoading(true);
    try {
      const res = await unsubscribeDeviceFromPush();
      setIsSubscribed(false);
      return res.success;
    } catch (error) {
      console.error('[WebPush] Error al desuscribir dispositivo:', error);
      throw error;
    } finally {
      setIsLoading(false);
      await refreshStatus();
    }
  };

  const sendServerTestPush = async (): Promise<boolean> => {
    try {
      const res = await sendTestPushNotification();
      return res.success;
    } catch (error) {
      console.error('[WebPush] Error enviando push de prueba desde servidor:', error);
      return false;
    }
  };

  const sendTestNotification = (title: string, body: string) => {
    if (!isSupported) {
      console.warn('Notificaciones no soportadas');
      return;
    }

    if (Notification.permission !== 'granted') {
      console.warn('Permisos de notificación no concedidos');
      return;
    }

    // Intentar usar service worker primero
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.ready
        .then((registration) => {
          registration.showNotification(title, {
            body,
            icon: '/icon-192.png',
            badge: '/icon-192.png',
            tag: 'test-notification',
            requireInteraction: false,
            data: {
              dateOfArrival: Date.now(),
              primaryKey: 'test',
              url: '/calendar',
            },
          });
        })
        .catch((error) => {
          console.error('Error al mostrar notificación vía SW:', error);
          showBasicNotification(title, body);
        });
    } else {
      showBasicNotification(title, body);
    }
  };

  const showBasicNotification = (title: string, body: string) => {
    try {
      new Notification(title, {
        body,
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        tag: 'bunnycure-notification',
      });
    } catch (error) {
      console.error('Error al mostrar notificación básica:', error);
    }
  };

  return {
    permission,
    isSupported,
    isSubscribed,
    isLoading,
    requestPermission,
    subscribe,
    unsubscribe,
    sendTestNotification,
    sendServerTestPush,
    refreshStatus,
  };
};
