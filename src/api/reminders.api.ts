/**
 * API de Recordatorios - endpoints modernos REST para gestión de reminders.
 */

import apiClient from './client';
import { ApiResponse } from '../types/api.types';

export interface ReminderStats {
  pendingReminders: number;
  sentToday: number;
  date: string;
}

export interface SendReminderResponse {
  success: boolean;
  message: string;
}

export const remindersApi = {
  /**
   * Obtener estadísticas de recordatorios para hoy
   */
  getStats: async (): Promise<ReminderStats> => {
    const response = await apiClient.get<ApiResponse<ReminderStats> | ReminderStats>('/api/reminders/stats');
    const data = response.data;
    if (data && typeof data === 'object' && 'data' in data && data.data) {
      return data.data;
    }
    return data as ReminderStats;
  },

  /**
   * Enviar recordatorios de hoy (envío masivo)
   */
  sendTodayReminders: async (): Promise<void> => {
    await apiClient.post<ApiResponse<unknown>>('/api/reminders/send-today');
  },

  /**
   * Enviar recordatorio para una cita específica
   */
  sendReminderForAppointment: async (appointmentId: number): Promise<SendReminderResponse> => {
    try {
      const response = await apiClient.post<ApiResponse<SendReminderResponse> | SendReminderResponse>(
        `/api/reminders/send/${appointmentId}`
      );
      const data = response.data;
      if (data && typeof data === 'object' && 'data' in data && data.data) {
        return data.data;
      }
      return (data as SendReminderResponse) || { success: true, message: 'Recordatorio enviado exitosamente' };
    } catch {
      // Fallback a endpoint en appointments
      const resp = await apiClient.post<ApiResponse<{ message?: string }>>(
        `/api/appointments/${appointmentId}/whatsapp/reminder`
      );
      return {
        success: true,
        message: resp.data?.data?.message || 'Recordatorio enviado correctamente',
      };
    }
  },
};

export default remindersApi;
