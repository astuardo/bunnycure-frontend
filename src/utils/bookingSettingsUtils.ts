/**
 * Utilidades para la configuración y disponibilidad del portal público de agendamiento (/reservar).
 */

import { appSettingsApi } from '../api/appSettings.api';

export const PUBLIC_BOOKING_STORAGE_KEY = 'bunnycure_public_booking_enabled_v1';
export const OFFICIAL_WHATSAPP_PHONE = '+56988873031';
export const OFFICIAL_WHATSAPP_DISPLAY = '+56 9 8887 3031';

/**
 * Lee si el agendamiento público está habilitado (por defecto true)
 */
export const getPublicBookingEnabled = (): boolean => {
  try {
    const raw = localStorage.getItem(PUBLIC_BOOKING_STORAGE_KEY);
    if (raw === null) return true;
    return raw === 'true';
  } catch {
    return true;
  }
};

/**
 * Guarda el estado del agendamiento público en storage local y opcionalmente en backend
 */
export const setPublicBookingEnabled = async (enabled: boolean): Promise<void> => {
  try {
    localStorage.setItem(PUBLIC_BOOKING_STORAGE_KEY, String(enabled));
    // Intentar sincronizar con backend
    await appSettingsApi.bulkUpdate({
      'booking.enabled': String(enabled),
    }).catch(() => {
      // Si el backend no tiene ese endpoint específico, se mantiene el estado local
    });
  } catch (err) {
    console.warn('Error al guardar estado de agendamiento público:', err);
  }
};
