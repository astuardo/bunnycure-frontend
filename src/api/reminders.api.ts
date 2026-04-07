/**
 * API de Recordatorios - endpoints para gestión de reminders.
 */

import apiClient from './client';

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
   * Obtener estadísticas de recordatorios
   */
  getStats: async (): Promise<ReminderStats> => {
    const response = await apiClient.get<ReminderStats>('/admin/reminders/stats');
    return response.data;
  },

  /**
   * Enviar recordatorios de hoy (envío masivo)
   */
  sendTodayReminders: async (): Promise<void> => {
    await apiClient.post('/admin/reminders/send-today');
  },

  /**
   * Enviar recordatorio para una cita específica
   */
  sendReminderForAppointment: async (appointmentId: number): Promise<SendReminderResponse> => {
    const response = await apiClient.post<SendReminderResponse>(
      `/admin/reminders/send/${appointmentId}`
    );
    return response.data;
  },
};
