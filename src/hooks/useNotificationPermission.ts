/**
 * Hook para gestionar permisos de notificaciones PWA
 * Maneja solicitud de permisos y estado de notificaciones
 */

import { useState, useEffect } from 'react';

type NotificationPermissionState = 'default' | 'granted' | 'denied' | 'unsupported';

interface UseNotificationPermissionReturn {
  permission: NotificationPermissionState;
  isSupported: boolean;
  requestPermission: () => Promise<NotificationPermission>;
  sendTestNotification: (title: string, body: string) => void;
}

export const useNotificationPermission = (): UseNotificationPermissionReturn => {
  const [permission, setPermission] = useState<NotificationPermissionState>('default');
  const isSupported = 'Notification' in window && 'serviceWorker' in navigator;

  useEffect(() => {
    if (isSupported) {
      setPermission(Notification.permission as NotificationPermissionState);
    } else {
      setPermission('unsupported');
    }
  }, [isSupported]);

  const requestPermission = async (): Promise<NotificationPermission> => {
    if (!isSupported) {
      throw new Error('Notificaciones no soportadas en este navegador');
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      return result;
    } catch (error) {
      console.error('Error al solicitar permisos de notificación:', error);
      throw error;
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
      navigator.serviceWorker.ready.then((registration) => {
        registration.showNotification(title, {
          body,
          icon: '/icon-192.png',
          badge: '/icon-192.png',
          tag: 'test-notification',
          requireInteraction: false,
          data: {
            dateOfArrival: Date.now(),
            primaryKey: 'test'
          }
        });
      }).catch((error) => {
        console.error('Error al mostrar notificación vía SW:', error);
        // Fallback a notificación básica
        showBasicNotification(title, body);
      });
    } else {
      // Fallback a notificación básica
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
    requestPermission,
    sendTestNotification,
  };
};
