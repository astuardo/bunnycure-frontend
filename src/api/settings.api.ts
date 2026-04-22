/**
 * API de Configuración - endpoints para settings del sistema.
 * Reemplaza localStorage con persistencia en servidor.
 */

import apiClient from './client';
import { ApiResponse } from '../types/api.types';

export interface SettingsData {
  businessName?: string;
  businessEmail?: string;
  businessPhone?: string;
  businessAddress?: string;
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
  appointmentDuration?: number;
  emailNotificationsEnabled?: boolean;
  whatsappNumber?: string;
  reminderStrategy?: 'TWO_HOURS' | 'MORNING' | 'DAY_BEFORE' | 'BOTH';
  whatsappHandoffEnabled?: boolean;
  whatsappHumanNumber?: string;
  whatsappHumanDisplayName?: string;
  whatsappHandoffClientMessage?: string;
  whatsappHandoffAdminPrefill?: string;
  holidays?: string;
  scheduleBlocks?: string;
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

const readBoolean = (value?: string): boolean | undefined => {
  if (value === undefined) return undefined;
  return value === 'true';
};

const parseReminderStrategy = (value?: string): SettingsData['reminderStrategy'] => {
  if (!value) return 'TWO_HOURS';
  switch (value.toLowerCase()) {
    case '2hours':
    case 'two_hours':
    case 'two-hours':
      return 'TWO_HOURS';
    case 'morning':
      return 'MORNING';
    case 'day_before':
    case 'day-before':
      return 'DAY_BEFORE';
    case 'both':
      return 'BOTH';
    default:
      return 'TWO_HOURS';
  }
};

const serializeReminderStrategy = (value?: SettingsData['reminderStrategy']): string => {
  switch (value) {
    case 'MORNING':
      return 'morning';
    case 'DAY_BEFORE':
      return 'day_before';
    case 'BOTH':
      return 'both';
    case 'TWO_HOURS':
    default:
      return '2hours';
  }
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const isFlatSettingsMap = (value: unknown): value is Record<string, string> => {
  if (!isRecord(value)) return false;
  return Object.values(value).every((v) => typeof v === 'string');
};

export const settingsApi = {
  /**
   * Obtener todas las configuraciones del servidor
   */
  getAll: async (): Promise<SettingsData> => {
    const response = await apiClient.get<ApiResponse<unknown>>('/api/settings');
    const payload = response.data.data;
    const flatSettings: Record<string, string> = isFlatSettingsMap(payload) ? payload : {};

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
   * Guardar múltiples configuraciones
   */
  saveAll: async (settings: SettingsData): Promise<void> => {
    // Convertir de nuestro formato tipado al formato plano del backend
    const flatSettings: Record<string, string> = {};

    // Business Info
    if (settings.businessName !== undefined) flatSettings['app.name'] = settings.businessName;
    if (settings.businessEmail !== undefined) flatSettings['app.email'] = settings.businessEmail;
    if (settings.businessPhone !== undefined) flatSettings['app.phone.display'] = settings.businessPhone;

    // Notifications
    if (settings.emailNotificationsEnabled !== undefined) flatSettings['mail.enabled'] = String(settings.emailNotificationsEnabled);
    if (settings.whatsappNumber !== undefined) flatSettings['whatsapp.number'] = settings.whatsappNumber;

    // Reminder Settings
    if (settings.reminderStrategy !== undefined) flatSettings['reminder.strategy'] = serializeReminderStrategy(settings.reminderStrategy);

    // WhatsApp Handoff
    if (settings.whatsappHandoffEnabled !== undefined) flatSettings['whatsapp.handoff.enabled'] = String(settings.whatsappHandoffEnabled);
    if (settings.whatsappHumanNumber !== undefined) flatSettings['whatsapp.human.number'] = settings.whatsappHumanNumber;
    if (settings.whatsappHumanDisplayName !== undefined) flatSettings['whatsapp.human.display-name'] = settings.whatsappHumanDisplayName;
    if (settings.whatsappHandoffClientMessage !== undefined) flatSettings['whatsapp.handoff.client-message'] = settings.whatsappHandoffClientMessage;
    if (settings.whatsappHandoffAdminPrefill !== undefined) flatSettings['whatsapp.handoff.admin-prefill'] = settings.whatsappHandoffAdminPrefill;

    await apiClient.put<ApiResponse<void>>('/api/settings/bulk', { settings: flatSettings });
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
   * Actualizar una configuración específica
   */
  update: async (key: string, value: string): Promise<void> => {
    await apiClient.patch<ApiResponse<void>>(`/api/settings/${key}`, { value });
  },
};
