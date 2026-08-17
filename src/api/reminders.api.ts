/**
 * API de Recordatorios - endpoints resilientes para gestión de reminders.
 * Soporta rutas modernas `/api/reminders/*`, legacy `/admin/reminders/*` y `/api/appointments/:id/whatsapp/reminder`.
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
    try {
      const response = await apiClient.get<ReminderStats>('/api/reminders/stats');
      return response.data;
    } catch {
      const fallbackResponse = await apiClient.get<ReminderStats>('/admin/reminders/stats');
      return fallbackResponse.data;
    }
  },

  /**
   * Enviar recordatorios de hoy (envío masivo)
   */
  sendTodayReminders: async (): Promise<void> => {
    try {
      await apiClient.post('/api/reminders/send-today');
    } catch {
      await apiClient.post('/admin/reminders/send-today');
    }
  },

  /**
   * Enviar recordatorio para una cita específica
   */
  sendReminderForAppointment: async (appointmentId: number): Promise<SendReminderResponse> => {
    try {
      const response = await apiClient.post<SendReminderResponse>(
        `/api/reminders/send/${appointmentId}`
      );
      return response.data;
    } catch {
      try {
        const response = await apiClient.post<SendReminderResponse>(
          `/admin/reminders/send/${appointmentId}`
        );
        return response.data;
      } catch {
        // Fallback al endpoint REST de appointments
        await apiClient.post(`/api/appointments/${appointmentId}/whatsapp/reminder`);
        return { success: true, message: 'Recordatorio enviado correctamente' };
      }
    }
  },
};

export default remindersApi;
