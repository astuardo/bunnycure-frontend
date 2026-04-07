/**
 * API de Configuración - endpoints para settings del sistema.
 * Reemplaza localStorage con persistencia en servidor.
 */

import apiClient from './client';
import { ApiResponse } from '../types/api.types';

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
}

export const settingsApi = {
  /**
   * Obtener todas las configuraciones del servidor
   */
  getAll: async (): Promise<SettingsData> => {
    const response = await apiClient.get<ApiResponse<Record<string, string>>>('/api/settings');
    
    // Convertir del formato plano del backend a nuestro formato tipado
    const flatSettings = response.data.data || {};
    
    return {
      // Business Info
      businessName: flatSettings['app.name'],
      businessEmail: flatSettings['app.email'],
      businessPhone: flatSettings['business.phone'],
      businessAddress: flatSettings['business.address'],

      // Working Hours
      mondayEnabled: flatSettings['hours.monday.enabled'] === 'true',
      mondayStart: flatSettings['hours.monday.start'],
      mondayEnd: flatSettings['hours.monday.end'],
      tuesdayEnabled: flatSettings['hours.tuesday.enabled'] === 'true',
      tuesdayStart: flatSettings['hours.tuesday.start'],
      tuesdayEnd: flatSettings['hours.tuesday.end'],
      wednesdayEnabled: flatSettings['hours.wednesday.enabled'] === 'true',
      wednesdayStart: flatSettings['hours.wednesday.start'],
      wednesdayEnd: flatSettings['hours.wednesday.end'],
      thursdayEnabled: flatSettings['hours.thursday.enabled'] === 'true',
      thursdayStart: flatSettings['hours.thursday.start'],
      thursdayEnd: flatSettings['hours.thursday.end'],
      fridayEnabled: flatSettings['hours.friday.enabled'] === 'true',
      fridayStart: flatSettings['hours.friday.start'],
      fridayEnd: flatSettings['hours.friday.end'],
      saturdayEnabled: flatSettings['hours.saturday.enabled'] === 'true',
      saturdayStart: flatSettings['hours.saturday.start'],
      saturdayEnd: flatSettings['hours.saturday.end'],
      sundayEnabled: flatSettings['hours.sunday.enabled'] === 'true',
      sundayStart: flatSettings['hours.sunday.start'],
      sundayEnd: flatSettings['hours.sunday.end'],

      // Appointment Settings
      appointmentDuration: flatSettings['appointment.default.duration'] 
        ? parseInt(flatSettings['appointment.default.duration']) 
        : 60,

      // Notifications
      emailNotificationsEnabled: flatSettings['notifications.email.enabled'] === 'true',
      whatsappNumber: flatSettings['whatsapp.number'],

      // Reminder Settings
      reminderStrategy: (flatSettings['reminder.strategy'] as SettingsData['reminderStrategy']) || 'TWO_HOURS',

      // WhatsApp Handoff
      whatsappHandoffEnabled: flatSettings['whatsapp.handoff.enabled'] === 'true',
      whatsappHumanNumber: flatSettings['whatsapp.human.number'],
      whatsappHumanDisplayName: flatSettings['whatsapp.human.display-name'],
      whatsappHandoffClientMessage: flatSettings['whatsapp.handoff.client-message'],
      whatsappHandoffAdminPrefill: flatSettings['whatsapp.handoff.admin-prefill'],
    };
  },

  /**
   * Guardar múltiples configuraciones
   */
  saveAll: async (settings: SettingsData): Promise<void> => {
    // Convertir de nuestro formato tipado al formato plano del backend
    const flatSettings: Record<string, string> = {};

    // Business Info
    if (settings.businessName) flatSettings['app.name'] = settings.businessName;
    if (settings.businessEmail) flatSettings['app.email'] = settings.businessEmail;
    if (settings.businessPhone) flatSettings['business.phone'] = settings.businessPhone;
    if (settings.businessAddress) flatSettings['business.address'] = settings.businessAddress;

    // Working Hours
    if (settings.mondayEnabled !== undefined) flatSettings['hours.monday.enabled'] = String(settings.mondayEnabled);
    if (settings.mondayStart) flatSettings['hours.monday.start'] = settings.mondayStart;
    if (settings.mondayEnd) flatSettings['hours.monday.end'] = settings.mondayEnd;
    
    if (settings.tuesdayEnabled !== undefined) flatSettings['hours.tuesday.enabled'] = String(settings.tuesdayEnabled);
    if (settings.tuesdayStart) flatSettings['hours.tuesday.start'] = settings.tuesdayStart;
    if (settings.tuesdayEnd) flatSettings['hours.tuesday.end'] = settings.tuesdayEnd;
    
    if (settings.wednesdayEnabled !== undefined) flatSettings['hours.wednesday.enabled'] = String(settings.wednesdayEnabled);
    if (settings.wednesdayStart) flatSettings['hours.wednesday.start'] = settings.wednesdayStart;
    if (settings.wednesdayEnd) flatSettings['hours.wednesday.end'] = settings.wednesdayEnd;
    
    if (settings.thursdayEnabled !== undefined) flatSettings['hours.thursday.enabled'] = String(settings.thursdayEnabled);
    if (settings.thursdayStart) flatSettings['hours.thursday.start'] = settings.thursdayStart;
    if (settings.thursdayEnd) flatSettings['hours.thursday.end'] = settings.thursdayEnd;
    
    if (settings.fridayEnabled !== undefined) flatSettings['hours.friday.enabled'] = String(settings.fridayEnabled);
    if (settings.fridayStart) flatSettings['hours.friday.start'] = settings.fridayStart;
    if (settings.fridayEnd) flatSettings['hours.friday.end'] = settings.fridayEnd;
    
    if (settings.saturdayEnabled !== undefined) flatSettings['hours.saturday.enabled'] = String(settings.saturdayEnabled);
    if (settings.saturdayStart) flatSettings['hours.saturday.start'] = settings.saturdayStart;
    if (settings.saturdayEnd) flatSettings['hours.saturday.end'] = settings.saturdayEnd;
    
    if (settings.sundayEnabled !== undefined) flatSettings['hours.sunday.enabled'] = String(settings.sundayEnabled);
    if (settings.sundayStart) flatSettings['hours.sunday.start'] = settings.sundayStart;
    if (settings.sundayEnd) flatSettings['hours.sunday.end'] = settings.sundayEnd;

    // Appointment Settings
    if (settings.appointmentDuration) flatSettings['appointment.default.duration'] = String(settings.appointmentDuration);

    // Notifications
    if (settings.emailNotificationsEnabled !== undefined) flatSettings['notifications.email.enabled'] = String(settings.emailNotificationsEnabled);
    if (settings.whatsappNumber) flatSettings['whatsapp.number'] = settings.whatsappNumber;

    // Reminder Settings
    if (settings.reminderStrategy) flatSettings['reminder.strategy'] = settings.reminderStrategy;

    // WhatsApp Handoff
    if (settings.whatsappHandoffEnabled !== undefined) flatSettings['whatsapp.handoff.enabled'] = String(settings.whatsappHandoffEnabled);
    if (settings.whatsappHumanNumber) flatSettings['whatsapp.human.number'] = settings.whatsappHumanNumber;
    if (settings.whatsappHumanDisplayName) flatSettings['whatsapp.human.display-name'] = settings.whatsappHumanDisplayName;
    if (settings.whatsappHandoffClientMessage) flatSettings['whatsapp.handoff.client-message'] = settings.whatsappHandoffClientMessage;
    if (settings.whatsappHandoffAdminPrefill) flatSettings['whatsapp.handoff.admin-prefill'] = settings.whatsappHandoffAdminPrefill;

    await apiClient.post<ApiResponse<void>>('/api/settings', flatSettings);
  },

  /**
   * Obtener una configuración específica por clave
   */
  get: async (key: string): Promise<string | null> => {
    try {
      const response = await apiClient.get<ApiResponse<string>>(`/api/settings/${key}`);
      return response.data.data || null;
    } catch (error) {
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
