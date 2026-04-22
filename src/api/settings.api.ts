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
        businessPhone: typeof whatsapp.number === 'string' ? whatsapp.number : undefined,
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
      businessPhone: flatSettings['business.phone'] ?? flatSettings['app.phone'],
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
      emailNotificationsEnabled: readBoolean(flatSettings['notifications.email.enabled']),
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
    if (settings.businessPhone !== undefined) flatSettings['business.phone'] = settings.businessPhone;
    if (settings.businessAddress !== undefined) flatSettings['business.address'] = settings.businessAddress;

    // Working Hours
    if (settings.mondayEnabled !== undefined) flatSettings['hours.monday.enabled'] = String(settings.mondayEnabled);
    if (settings.mondayStart !== undefined) flatSettings['hours.monday.start'] = settings.mondayStart;
    if (settings.mondayEnd !== undefined) flatSettings['hours.monday.end'] = settings.mondayEnd;
    
    if (settings.tuesdayEnabled !== undefined) flatSettings['hours.tuesday.enabled'] = String(settings.tuesdayEnabled);
    if (settings.tuesdayStart !== undefined) flatSettings['hours.tuesday.start'] = settings.tuesdayStart;
    if (settings.tuesdayEnd !== undefined) flatSettings['hours.tuesday.end'] = settings.tuesdayEnd;
    
    if (settings.wednesdayEnabled !== undefined) flatSettings['hours.wednesday.enabled'] = String(settings.wednesdayEnabled);
    if (settings.wednesdayStart !== undefined) flatSettings['hours.wednesday.start'] = settings.wednesdayStart;
    if (settings.wednesdayEnd !== undefined) flatSettings['hours.wednesday.end'] = settings.wednesdayEnd;
    
    if (settings.thursdayEnabled !== undefined) flatSettings['hours.thursday.enabled'] = String(settings.thursdayEnabled);
    if (settings.thursdayStart !== undefined) flatSettings['hours.thursday.start'] = settings.thursdayStart;
    if (settings.thursdayEnd !== undefined) flatSettings['hours.thursday.end'] = settings.thursdayEnd;
    
    if (settings.fridayEnabled !== undefined) flatSettings['hours.friday.enabled'] = String(settings.fridayEnabled);
    if (settings.fridayStart !== undefined) flatSettings['hours.friday.start'] = settings.fridayStart;
    if (settings.fridayEnd !== undefined) flatSettings['hours.friday.end'] = settings.fridayEnd;
    
    if (settings.saturdayEnabled !== undefined) flatSettings['hours.saturday.enabled'] = String(settings.saturdayEnabled);
    if (settings.saturdayStart !== undefined) flatSettings['hours.saturday.start'] = settings.saturdayStart;
    if (settings.saturdayEnd !== undefined) flatSettings['hours.saturday.end'] = settings.saturdayEnd;
    
    if (settings.sundayEnabled !== undefined) flatSettings['hours.sunday.enabled'] = String(settings.sundayEnabled);
    if (settings.sundayStart !== undefined) flatSettings['hours.sunday.start'] = settings.sundayStart;
    if (settings.sundayEnd !== undefined) flatSettings['hours.sunday.end'] = settings.sundayEnd;

    // Appointment Settings
    if (settings.appointmentDuration !== undefined) flatSettings['appointment.default.duration'] = String(settings.appointmentDuration);

    // Notifications
    if (settings.emailNotificationsEnabled !== undefined) flatSettings['notifications.email.enabled'] = String(settings.emailNotificationsEnabled);
    if (settings.whatsappNumber !== undefined) flatSettings['whatsapp.number'] = settings.whatsappNumber;

    // Reminder Settings
    if (settings.reminderStrategy !== undefined) flatSettings['reminder.strategy'] = serializeReminderStrategy(settings.reminderStrategy);

    // WhatsApp Handoff
    if (settings.whatsappHandoffEnabled !== undefined) flatSettings['whatsapp.handoff.enabled'] = String(settings.whatsappHandoffEnabled);
    if (settings.whatsappHumanNumber !== undefined) flatSettings['whatsapp.human.number'] = settings.whatsappHumanNumber;
    if (settings.whatsappHumanDisplayName !== undefined) flatSettings['whatsapp.human.display-name'] = settings.whatsappHumanDisplayName;
    if (settings.whatsappHandoffClientMessage !== undefined) flatSettings['whatsapp.handoff.client-message'] = settings.whatsappHandoffClientMessage;
    if (settings.whatsappHandoffAdminPrefill !== undefined) flatSettings['whatsapp.handoff.admin-prefill'] = settings.whatsappHandoffAdminPrefill;

    // Holidays and Schedule Blocks
    if (settings.holidays !== undefined) flatSettings['business.holidays'] = settings.holidays;
    if (settings.scheduleBlocks !== undefined) flatSettings['business.schedule_blocks'] = settings.scheduleBlocks;
    if (settings.calendarMorningStart !== undefined) flatSettings['calendar.slot.morning.start'] = settings.calendarMorningStart;
    if (settings.calendarMorningEnd !== undefined) flatSettings['calendar.slot.morning.end'] = settings.calendarMorningEnd;
    if (settings.calendarMorningColor !== undefined) flatSettings['calendar.slot.morning.color'] = settings.calendarMorningColor;
    if (settings.calendarAfternoonStart !== undefined) flatSettings['calendar.slot.afternoon.start'] = settings.calendarAfternoonStart;
    if (settings.calendarAfternoonEnd !== undefined) flatSettings['calendar.slot.afternoon.end'] = settings.calendarAfternoonEnd;
    if (settings.calendarAfternoonColor !== undefined) flatSettings['calendar.slot.afternoon.color'] = settings.calendarAfternoonColor;
    if (settings.calendarNightStart !== undefined) flatSettings['calendar.slot.night.start'] = settings.calendarNightStart;
    if (settings.calendarNightEnd !== undefined) flatSettings['calendar.slot.night.end'] = settings.calendarNightEnd;
    if (settings.calendarNightColor !== undefined) flatSettings['calendar.slot.night.color'] = settings.calendarNightColor;

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
