/**
 * API de Citas - endpoints para gestión de appointments.
 */

import apiClient from './client';
import { ApiResponse } from '../types/api.types';
import { Appointment, AppointmentCreateRequest, AppointmentUpdateRequest, AppointmentStatus } from '../types/appointment.types';

export const appointmentsApi = {
  /**
   * Listar citas (opcionalmente filtradas por fecha/estado)
   */
  list: async (params?: {
    startDate?: string;
    endDate?: string;
    status?: AppointmentStatus;
  }): Promise<Appointment[]> => {
    const response = await apiClient.get<ApiResponse<Appointment[]>>('/api/appointments', { params });
    return response.data.data || [];
  },

  /**
   * Obtener cita por ID
   */
  getById: async (id: number): Promise<Appointment> => {
    const response = await apiClient.get<ApiResponse<Appointment>>(`/api/appointments/${id}`);
    if (!response.data.data) throw new Error('Cita no encontrada');
    return response.data.data;
  },

  /**
   * Crear nueva cita
   */
  create: async (data: AppointmentCreateRequest): Promise<Appointment> => {
    const response = await apiClient.post<ApiResponse<Appointment>>('/api/appointments', data);
    if (!response.data.data) throw new Error('Error al crear cita');
    return response.data.data;
  },

  /**
   * Actualizar cita existente
   */
  update: async (id: number, data: AppointmentUpdateRequest): Promise<Appointment> => {
    const response = await apiClient.put<ApiResponse<Appointment>>(`/api/appointments/${id}`, data);
    if (!response.data.data) throw new Error('Error al actualizar cita');
    return response.data.data;
  },

  /**
   * Cambiar estado de cita
   */
  updateStatus: async (id: number, status: AppointmentStatus): Promise<Appointment> => {
    const response = await apiClient.patch<ApiResponse<Appointment>>(
      `/api/appointments/${id}/status`,
      null,
      { params: { status } }
    );
    if (!response.data.data) throw new Error('Error al actualizar estado');
    return response.data.data;
  },

  /**
   * Eliminar cita
   */
  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/api/appointments/${id}`);
  },

  /**
   * Reenviar notificación manualmente
   */
  sendNotification: async (id: number): Promise<void> => {
    await apiClient.post(`/api/appointments/${id}/notify`);
  },

  /**
   * WhatsApp Handoff - Obtener URL para transferir a agente humano
   */
  whatsappHandoff: async (id: number): Promise<string> => {
    const response = await apiClient.post<{ url: string }>(`/api/appointments/${id}/whatsapp-handoff`);
    return response.data.url;
  },

  /**
   * Enviar confirmación por WhatsApp manualmente
   */
  sendWhatsAppConfirmation: async (id: number): Promise<void> => {
    await apiClient.post(`/api/appointments/${id}/whatsapp/confirmation`);
  },

  /**
   * Enviar recordatorio por WhatsApp manualmente
   */
  sendWhatsAppReminder: async (id: number): Promise<void> => {
    await apiClient.post(`/api/appointments/${id}/whatsapp/reminder`);
  },
};
