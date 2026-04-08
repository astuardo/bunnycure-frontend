/**
 * API de configuración NUEVA (estructura backend AppSettingsDto)
 * Usado por componentes nuevos como NotificationTemplatesSection
 */

import apiClient from './client';
import { ApiResponse } from '../types/api.types';

export interface BrandingSettings {
  name: string;
  slogan: string;
  email: string;
  logoUrl: string;
  primaryColor: string;
  secondaryColor: string;
  timezone: string;
  locale: string;
  currency: string;
  serviceTip: string;
}

export interface WhatsAppSettings {
  number: string;
  humanNumber: string;
  adminAlertNumber: string;
  humanDisplayName: string;
  handoffEnabled: boolean;
  handoffClientMessage: string;
  handoffAdminPrefill: string;
}

export interface BlockSettings {
  timeRange: string;
  enabled: boolean;
}

export interface BookingSettings {
  enabled: boolean;
  messageTemplate: string;
  morningBlock: BlockSettings;
  afternoonBlock: BlockSettings;
  nightBlock: BlockSettings;
}

export interface ReminderSettings {
  strategy: '2hours' | 'morning' | 'day_before' | 'both';
}

export interface FieldSettings {
  emailMode: 'REQUIRED' | 'OPTIONAL' | 'HIDDEN';
  genderMode: 'REQUIRED' | 'OPTIONAL' | 'HIDDEN';
  birthDateMode: 'REQUIRED' | 'OPTIONAL' | 'HIDDEN';
  emergencyPhoneMode: 'REQUIRED' | 'OPTIONAL' | 'HIDDEN';
  healthNotesMode: 'REQUIRED' | 'OPTIONAL' | 'HIDDEN';
  generalNotesMode: 'REQUIRED' | 'OPTIONAL' | 'HIDDEN';
}

export interface NotificationTemplateSettings {
  defaultTitle: string;
  defaultBody: string;
  twoHourTitle: string;
  twoHourBody: string;
}

export interface AppSettingsResponse {
  branding: BrandingSettings;
  whatsapp: WhatsAppSettings;
  booking: BookingSettings;
  reminders: ReminderSettings;
  fields: FieldSettings;
  notificationTemplates: NotificationTemplateSettings;
}

export const appSettingsApi = {
  /**
   * Obtener todas las configuraciones estructuradas
   */
  getAll: async (): Promise<AppSettingsResponse> => {
    const response = await apiClient.get<ApiResponse<AppSettingsResponse>>('/api/settings');
    return response.data.data!;
  },
  
  /**
   * Obtener solo templates de notificaciones
   */
  getNotificationTemplates: async (): Promise<NotificationTemplateSettings> => {
    const settings = await appSettingsApi.getAll();
    return settings.notificationTemplates;
  },

  /**
   * Actualizar múltiples configuraciones (bulk update)
   */
  bulkUpdate: async (settings: Record<string, string>): Promise<void> => {
    await apiClient.put<ApiResponse<void>>('/api/settings/bulk', { settings });
  },

  /**
   * Obtener una configuración específica por clave
   */
  get: async (key: string): Promise<string | null> => {
    try {
      const response = await apiClient.get<ApiResponse<{ key: string; value: string }>>(`/api/settings/${key}`);
      return response.data.data?.value || null;
    } catch (error) {
      console.warn(`Setting ${key} not found`);
      return null;
    }
  },

  /**
   * Actualizar una configuración específica
   */
  update: async (key: string, value: string): Promise<void> => {
    await apiClient.put<ApiResponse<void>>(`/api/settings/${key}`, { value });
  },
  
  /**
   * Resetear todas las configuraciones a valores por defecto
   */
  reset: async (): Promise<void> => {
    await apiClient.post<ApiResponse<void>>('/api/settings/reset');
  },
};
