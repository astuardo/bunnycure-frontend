/**
 * API de Configuración del Negocio
 * Permite obtener y guardar configuraciones en el backend
 */

import apiClient from './client';
import { ApiResponse } from '../types/api.types';
import {
  ScheduleUnavailability,
  UnavailabilityColorConfig,
  UnavailabilityNotificationConfig,
  DEFAULT_UNAVAILABILITY_COLORS,
  DEFAULT_UNAVAILABILITY_NOTIFICATIONS,
} from '../types/unavailability.types';

export const UNAVAILABILITIES_STORAGE_KEY = 'bunnycure_schedule_unavailabilities_v1';
export const UNAVAILABILITY_COLORS_STORAGE_KEY = 'bunnycure_schedule_unavailability_colors_v1';
export const UNAVAILABILITY_NOTIFICATIONS_STORAGE_KEY = 'bunnycure_schedule_unavailability_notifications_v1';

export interface SettingsData {
  // Business Info
  businessName?: string;
  businessEmail?: string;
  businessPhone?: string;
  businessAddress?: string;

  // Working Hours
  mondayEnabled?: boolean;
  mondayStart?: string;
  mondayEnd?: string;
  tuesdayEnabled?: boolean;
  tuesdayStart?: string;
  tuesdayEnd?: string;
  wednesdayEnabled?: boolean;
  wednesdayStart?: string;
  wednesdayEnd?: string;
  thursdayEnabled?: boolean;
  thursdayStart?: string;
  thursdayEnd?: string;
  fridayEnabled?: boolean;
  fridayStart?: string;
  fridayEnd?: string;
  saturdayEnabled?: boolean;
  saturdayStart?: string;
  saturdayEnd?: string;
  sundayEnabled?: boolean;
  sundayStart?: string;
  sundayEnd?: string;

  // Appointment Settings
  appointmentDuration?: number;

  // Notifications
  emailNotificationsEnabled?: boolean;
  whatsappNumber?: string;

  // Reminder Settings
  reminderStrategy?: 'TWO_HOURS' | 'MORNING' | 'DAY_BEFORE' | 'BOTH';

  // WhatsApp Handoff
  whatsappHandoffEnabled?: boolean;
  whatsappHumanNumber?: string;
  whatsappHumanDisplayName?: string;
  whatsappHandoffClientMessage?: string;
  whatsappHandoffAdminPrefill?: string;

  // Legacy & Calendar Blocks
  holidays?: string;
  scheduleBlocks?: string;
  unavailabilities?: ScheduleUnavailability[];
  unavailabilityColors?: UnavailabilityColorConfig;
  unavailabilityNotifications?: UnavailabilityNotificationConfig;

  // Calendar Display Slots
  calendarMorningStart?: string;
  calendarMorningEnd?: string;
  calendarMorningColor?: string;
  calendarAfternoonStart?: string;
  calendarAfternoonEnd?: string;
  calendarAfternoonColor?: string;
  calendarNightStart?: string;
  calendarNightEnd?: string;
  calendarNightColor?: string;
}

const readBoolean = (value: unknown): boolean | undefined => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const lower = value.trim().toLowerCase();
    if (lower === 'true' || lower === '1') return true;
    if (lower === 'false' || lower === '0') return false;
  }
  return undefined;
};

const parseReminderStrategy = (value: unknown): SettingsData['reminderStrategy'] => {
  if (typeof value !== 'string') return undefined;
  const normalized = value.trim().toUpperCase();
  if (normalized === '2HOURS' || normalized === 'TWO_HOURS') return 'TWO_HOURS';
  if (normalized === 'MORNING') return 'MORNING';
  if (normalized === 'DAY_BEFORE') return 'DAY_BEFORE';
  if (normalized === 'BOTH') return 'BOTH';
  return undefined;
};

const serializeReminderStrategy = (value: SettingsData['reminderStrategy']): string | undefined => {
  if (!value) return undefined;
  if (value === 'TWO_HOURS') return '2hours';
  if (value === 'MORNING') return 'morning';
  if (value === 'DAY_BEFORE') return 'day_before';
  if (value === 'BOTH') return 'both';
  return undefined;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const isFlatSettingsMap = (value: unknown): value is Record<string, string> => {
  if (!isRecord(value)) return false;
  return Object.values(value).every((v) => typeof v === 'string');
};

export const loadCachedUnavailabilities = (): ScheduleUnavailability[] => {
  try {
    const raw = localStorage.getItem(UNAVAILABILITIES_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.error('Error loading cached unavailabilities:', e);
  }
  return [];
};

export const loadCachedUnavailabilityColors = (): UnavailabilityColorConfig => {
  try {
    const raw = localStorage.getItem(UNAVAILABILITY_COLORS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.fullDayColor === 'string') return parsed;
    }
  } catch {}
  return DEFAULT_UNAVAILABILITY_COLORS;
};

export const loadCachedUnavailabilityNotifications = (): UnavailabilityNotificationConfig => {
  try {
    const raw = localStorage.getItem(UNAVAILABILITY_NOTIFICATIONS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.enabled === 'boolean') return parsed;
    }
  } catch {}
  return DEFAULT_UNAVAILABILITY_NOTIFICATIONS;
};

export const settingsApi = {
  /**
   * Obtener todas las configuraciones del servidor con soporte de fallback
   */
  getAll: async (): Promise<SettingsData> => {
    let payload: unknown = null;
    try {
      const response = await apiClient.get<ApiResponse<unknown>>('/api/settings');
      payload = response.data.data;
    } catch (e) {
      console.warn('Error fetching /api/settings, using local fallback:', e);
    }

    const flatSettings: Record<string, string> = isFlatSettingsMap(payload) ? payload : {};

    // 1. Extraer o parsear unavailabilities desde servidor o cache
    let parsedUnavailabilities: ScheduleUnavailability[] = [];
    try {
      const rawServer = isRecord(payload) 
        ? (payload['schedule.unavailabilities'] ?? payload['scheduleUnavailabilities'] ?? payload['unavailabilities'])
        : flatSettings['schedule.unavailabilities'];

      if (typeof rawServer === 'string') {
        parsedUnavailabilities = JSON.parse(rawServer) as ScheduleUnavailability[];
      } else if (Array.isArray(rawServer)) {
        parsedUnavailabilities = rawServer as ScheduleUnavailability[];
      }

      // Backward compatibility: migrar antiguos holidays o scheduleBlocks si no hay unavailabilities
      if (parsedUnavailabilities.length === 0 && isRecord(payload)) {
        const rawHolidays = flatSettings['business.holidays'] || (payload['business.holidays'] as string);
        const rawBlocks = flatSettings['business.schedule_blocks'] || (payload['business.schedule_blocks'] as string);

        if (rawHolidays) {
          const hList = typeof rawHolidays === 'string' ? JSON.parse(rawHolidays) : rawHolidays;
          if (Array.isArray(hList)) {
            hList.forEach((h: string, idx: number) => {
              parsedUnavailabilities.push({
                id: `legacy-h-${idx}-${h}`,
                type: 'FULL_DAY',
                startDate: h,
                endDate: h,
                reason: 'Feriado / Día Cerrado',
                createdAt: new Date().toISOString(),
              });
            });
          }
        }

        if (rawBlocks) {
          const bList = typeof rawBlocks === 'string' ? JSON.parse(rawBlocks) : rawBlocks;
          if (Array.isArray(bList)) {
            bList.forEach((b: { id?: string; date: string; startTime: string; endTime: string; reason?: string }) => {
              parsedUnavailabilities.push({
                id: b.id || `legacy-b-${Date.now()}`,
                type: 'TIME_SLOT',
                startDate: b.date,
                endDate: b.date,
                startTime: b.startTime,
                endTime: b.endTime,
                reason: b.reason || 'Bloqueo de horario',
                createdAt: new Date().toISOString(),
              });
            });
          }
        }
      }
    } catch (e) {
      console.warn('Error parsing server unavailabilities:', e);
    }

    // Si el servidor devolvió unavailabilities, actualizar caché local
    if (parsedUnavailabilities.length > 0) {
      try {
        localStorage.setItem(UNAVAILABILITIES_STORAGE_KEY, JSON.stringify(parsedUnavailabilities));
      } catch {}
    } else {
      // Si el servidor no trajo registros, usar caché local para que no se borren
      parsedUnavailabilities = loadCachedUnavailabilities();
    }

    // 2. Extraer o parsear Colores de Bloqueos
    let parsedColors = DEFAULT_UNAVAILABILITY_COLORS;
    try {
      const rawColors = isRecord(payload)
        ? (payload['schedule.unavailability.colors'] ?? payload['unavailabilityColors'])
        : flatSettings['schedule.unavailability.colors'];

      if (typeof rawColors === 'string') {
        parsedColors = JSON.parse(rawColors) as UnavailabilityColorConfig;
      } else if (rawColors && typeof rawColors === 'object') {
        parsedColors = rawColors as UnavailabilityColorConfig;
      } else {
        parsedColors = loadCachedUnavailabilityColors();
      }
    } catch {
      parsedColors = loadCachedUnavailabilityColors();
    }

    // 3. Extraer o parsear Notificaciones de Bloqueos
    let parsedNotifs = DEFAULT_UNAVAILABILITY_NOTIFICATIONS;
    try {
      const rawNotifs = isRecord(payload)
        ? (payload['schedule.unavailability.notifications'] ?? payload['unavailabilityNotifications'])
        : flatSettings['schedule.unavailability.notifications'];

      if (typeof rawNotifs === 'string') {
        parsedNotifs = JSON.parse(rawNotifs) as UnavailabilityNotificationConfig;
      } else if (rawNotifs && typeof rawNotifs === 'object') {
        parsedNotifs = rawNotifs as UnavailabilityNotificationConfig;
      } else {
        parsedNotifs = loadCachedUnavailabilityNotifications();
      }
    } catch {
      parsedNotifs = loadCachedUnavailabilityNotifications();
    }

    // Si payload es una estructura compleja como AppSettingsDto
    if (!isFlatSettingsMap(payload) && isRecord(payload)) {
      const branding = isRecord(payload.branding) ? payload.branding : {};
      const whatsapp = isRecord(payload.whatsapp) ? payload.whatsapp : {};
      const reminders = isRecord(payload.reminders) ? payload.reminders : {};
      const notificationTemplates = isRecord(payload.notificationTemplates) ? payload.notificationTemplates : {};

      return {
        businessName: typeof branding.name === 'string' ? branding.name : undefined,
        businessEmail: typeof branding.email === 'string' ? branding.email : undefined,
        businessPhone: typeof branding.phoneDisplay === 'string' ? branding.phoneDisplay : undefined,
        businessAddress: undefined,
        appointmentDuration: 60,
        emailNotificationsEnabled: typeof notificationTemplates.emailEnabled === 'boolean' ? notificationTemplates.emailEnabled : undefined,
        whatsappNumber: typeof whatsapp.number === 'string' ? whatsapp.number : undefined,
        reminderStrategy: typeof reminders.strategy === 'string' ? parseReminderStrategy(reminders.strategy) : undefined,
        whatsappHandoffEnabled: typeof whatsapp.handoffEnabled === 'boolean' ? whatsapp.handoffEnabled : undefined,
        whatsappHumanNumber: typeof whatsapp.humanNumber === 'string' ? whatsapp.humanNumber : undefined,
        whatsappHumanDisplayName: typeof whatsapp.humanDisplayName === 'string' ? whatsapp.humanDisplayName : undefined,
        whatsappHandoffClientMessage: typeof whatsapp.handoffClientMessage === 'string' ? whatsapp.handoffClientMessage : undefined,
        whatsappHandoffAdminPrefill: typeof whatsapp.handoffAdminPrefill === 'string' ? whatsapp.handoffAdminPrefill : undefined,
        unavailabilities: parsedUnavailabilities,
        unavailabilityColors: parsedColors,
        unavailabilityNotifications: parsedNotifs,
      };
    }
    
    return {
      // Business Info
      businessName: flatSettings['app.name'] ?? flatSettings['business.name'],
      businessEmail: flatSettings['app.email'] ?? flatSettings['business.email'],
      businessPhone: flatSettings['app.phone.display'] ?? flatSettings['business.phone'] ?? flatSettings['app.phone'],
      businessAddress: flatSettings['business.address'] ?? flatSettings['app.address'],

      // Working Hours
      mondayEnabled: readBoolean(flatSettings['hours.monday.enabled']),
      mondayStart: flatSettings['hours.monday.start'],
      mondayEnd: flatSettings['hours.monday.end'],
      tuesdayEnabled: readBoolean(flatSettings['hours.tuesday.enabled']),
      tuesdayStart: flatSettings['hours.tuesday.start'],
      tuesdayEnd: flatSettings['hours.tuesday.end'],
      wednesdayEnabled: readBoolean(flatSettings['hours.wednesday.enabled']),
      wednesdayStart: flatSettings['hours.wednesday.start'],
      wednesdayEnd: flatSettings['hours.wednesday.end'],
      thursdayEnabled: readBoolean(flatSettings['hours.thursday.enabled']),
      thursdayStart: flatSettings['hours.thursday.start'],
      thursdayEnd: flatSettings['hours.thursday.end'],
      fridayEnabled: readBoolean(flatSettings['hours.friday.enabled']),
      fridayStart: flatSettings['hours.friday.start'],
      fridayEnd: flatSettings['hours.friday.end'],
      saturdayEnabled: readBoolean(flatSettings['hours.saturday.enabled']),
      saturdayStart: flatSettings['hours.saturday.start'],
      saturdayEnd: flatSettings['hours.saturday.end'],
      sundayEnabled: readBoolean(flatSettings['hours.sunday.enabled']),
      sundayStart: flatSettings['hours.sunday.start'],
      sundayEnd: flatSettings['hours.sunday.end'],

      // Appointment Settings
      appointmentDuration: flatSettings['appointment.default.duration'] 
        ? parseInt(flatSettings['appointment.default.duration']) 
        : 60,

      // Notifications
      emailNotificationsEnabled: readBoolean(flatSettings['mail.enabled']) ?? readBoolean(flatSettings['notifications.email.enabled']),
      whatsappNumber: flatSettings['whatsapp.number'],

      // Reminder Settings
      reminderStrategy: parseReminderStrategy(flatSettings['reminder.strategy']),

      // WhatsApp Handoff
      whatsappHandoffEnabled: readBoolean(flatSettings['whatsapp.handoff.enabled']),
      whatsappHumanNumber: flatSettings['whatsapp.human.number'],
      whatsappHumanDisplayName: flatSettings['whatsapp.human.display-name'],
      whatsappHandoffClientMessage: flatSettings['whatsapp.handoff.client-message'],
      whatsappHandoffAdminPrefill: flatSettings['whatsapp.handoff.admin-prefill'],
      holidays: flatSettings['business.holidays'],
      scheduleBlocks: flatSettings['business.schedule_blocks'],
      unavailabilities: parsedUnavailabilities,
      unavailabilityColors: parsedColors,
      unavailabilityNotifications: parsedNotifs,
      calendarMorningStart: flatSettings['calendar.slot.morning.start'],
      calendarMorningEnd: flatSettings['calendar.slot.morning.end'],
      calendarMorningColor: flatSettings['calendar.slot.morning.color'],
      calendarAfternoonStart: flatSettings['calendar.slot.afternoon.start'],
      calendarAfternoonEnd: flatSettings['calendar.slot.afternoon.end'],
      calendarAfternoonColor: flatSettings['calendar.slot.afternoon.color'],
      calendarNightStart: flatSettings['calendar.slot.night.start'],
      calendarNightEnd: flatSettings['calendar.slot.night.end'],
      calendarNightColor: flatSettings['calendar.slot.night.color'],
    };
  },

  /**
   * Guardar múltiples configuraciones con persistencia segura
   */
  saveAll: async (settings: SettingsData): Promise<void> => {
    // 1. Guardar inmediatamente en localStorage como respaldo local síncrono
    if (settings.unavailabilities !== undefined) {
      try {
        localStorage.setItem(UNAVAILABILITIES_STORAGE_KEY, JSON.stringify(settings.unavailabilities));
      } catch (err) {
        console.error('Error saving unavailabilities to localStorage:', err);
      }
    }
    if (settings.unavailabilityColors !== undefined) {
      try {
        localStorage.setItem(UNAVAILABILITY_COLORS_STORAGE_KEY, JSON.stringify(settings.unavailabilityColors));
      } catch {}
    }
    if (settings.unavailabilityNotifications !== undefined) {
      try {
        localStorage.setItem(UNAVAILABILITY_NOTIFICATIONS_STORAGE_KEY, JSON.stringify(settings.unavailabilityNotifications));
      } catch {}
    }

    // 2. Convertir al formato plano para el endpoint bulk
    const flatSettings: Record<string, string> = {};

    // Business Info
    if (settings.businessName !== undefined) flatSettings['app.name'] = settings.businessName;
    if (settings.businessEmail !== undefined) flatSettings['app.email'] = settings.businessEmail;
    if (settings.businessPhone !== undefined) flatSettings['app.phone.display'] = settings.businessPhone;

    // Notifications
    if (settings.emailNotificationsEnabled !== undefined) flatSettings['mail.enabled'] = String(settings.emailNotificationsEnabled);
    if (settings.whatsappNumber !== undefined) flatSettings['whatsapp.number'] = settings.whatsappNumber;

    // Reminder Settings
    if (settings.reminderStrategy !== undefined) {
      const s = serializeReminderStrategy(settings.reminderStrategy);
      if (s) flatSettings['reminder.strategy'] = s;
    }

    // WhatsApp Handoff
    if (settings.whatsappHandoffEnabled !== undefined) flatSettings['whatsapp.handoff.enabled'] = String(settings.whatsappHandoffEnabled);
    if (settings.whatsappHumanNumber !== undefined) flatSettings['whatsapp.human.number'] = settings.whatsappHumanNumber;
    if (settings.whatsappHumanDisplayName !== undefined) flatSettings['whatsapp.human.display-name'] = settings.whatsappHumanDisplayName;
    if (settings.whatsappHandoffClientMessage !== undefined) flatSettings['whatsapp.handoff.client-message'] = settings.whatsappHandoffClientMessage;
    if (settings.whatsappHandoffAdminPrefill !== undefined) flatSettings['whatsapp.handoff.admin-prefill'] = settings.whatsappHandoffAdminPrefill;

    // Unavailabilities, Colors and Notifications
    if (settings.unavailabilities !== undefined) {
      const jsonStr = JSON.stringify(settings.unavailabilities);
      flatSettings['schedule.unavailabilities'] = jsonStr;
    }
    if (settings.unavailabilityColors !== undefined) {
      flatSettings['schedule.unavailability.colors'] = JSON.stringify(settings.unavailabilityColors);
    }
    if (settings.unavailabilityNotifications !== undefined) {
      flatSettings['schedule.unavailability.notifications'] = JSON.stringify(settings.unavailabilityNotifications);
    }

    // Guardar en backend vía bulk y key específica
    try {
      await apiClient.put<ApiResponse<void>>('/api/settings/bulk', { settings: flatSettings });
    } catch (bulkErr) {
      console.warn('Bulk settings save returned error, attempting fallback updates:', bulkErr);
    }

    // Si se enviaron unavailabilities, asegurar persistencia individual
    if (settings.unavailabilities !== undefined) {
      const jsonStr = JSON.stringify(settings.unavailabilities);
      try {
        await apiClient.put<ApiResponse<void>>('/api/settings/schedule.unavailabilities', { value: jsonStr })
          .catch(() => apiClient.patch<ApiResponse<void>>('/api/settings/schedule.unavailabilities', { value: jsonStr }))
          .catch(() => null);
      } catch {}
    }
  },

  /**
   * Actualizar una configuración específica
   */
  update: async (key: string, value: string): Promise<void> => {
    await apiClient.put<ApiResponse<void>>(`/api/settings/${key}`, { value });
  },

  /**
   * Obtener una configuración específica por clave
   */
  get: async (key: string): Promise<string | null> => {
    try {
      const response = await apiClient.get<ApiResponse<string>>(`/api/settings/${key}`);
      return response.data.data || null;
    } catch {
      console.warn(`Setting ${key} not found`);
      return null;
    }
  },

  /**
   * Guardar una configuración específica
   */
  save: async (key: string, value: string): Promise<void> => {
    await apiClient.patch<ApiResponse<void>>(`/api/settings/${key}`, { value });
  },
};
