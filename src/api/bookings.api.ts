/**
 * API de Solicitudes de Reserva - endpoints para booking requests.
 */

import apiClient from './client';
import { ApiResponse } from '../types/api.types';
import { BookingRequest, BookingRequestFormData, BookingApproval } from '../types/booking.types';
import { Appointment } from '../types/appointment.types';

export const bookingsApi = {
  /**
   * Listar solicitudes de reserva (opcionalmente solo pendientes)
   */
  list: async (pendingOnly: boolean = true): Promise<BookingRequest[]> => {
    const response = await apiClient.get<ApiResponse<BookingRequest[]>>('/api/booking-requests', {
      params: { pendingOnly }
    });
    return response.data.data || [];
  },

  /**
   * Obtener solicitud por ID
   */
  getById: async (id: number): Promise<BookingRequest> => {
    const response = await apiClient.get<ApiResponse<BookingRequest>>(`/api/booking-requests/${id}`);
    if (!response.data.data) throw new Error('Solicitud no encontrada');
    return response.data.data;
  },

  /**
   * Crear nueva solicitud de reserva (endpoint público)
   */
  create: async (data: BookingRequestFormData): Promise<BookingRequest> => {
    const response = await apiClient.post<ApiResponse<BookingRequest>>('/api/booking-requests', data);
    if (!response.data.data) throw new Error('Error al crear solicitud');
    return response.data.data;
  },

  /**
   * Aprobar solicitud (crea cita)
   */
  approve: async (id: number, approval: BookingApproval): Promise<Appointment> => {
    const response = await apiClient.post<ApiResponse<Appointment>>(
      `/api/booking-requests/${id}/approve`,
      approval
    );
    if (!response.data.data) throw new Error('Error al aprobar solicitud');
    return response.data.data;
  },

  /**
   * Rechazar solicitud
   */
  reject: async (id: number, reason?: string): Promise<BookingRequest> => {
    const response = await apiClient.post<ApiResponse<BookingRequest>>(
      `/api/booking-requests/${id}/reject`,
      null,
      { params: reason ? { reason } : undefined }
    );
    if (!response.data.data) throw new Error('Error al rechazar solicitud');
    return response.data.data;
  },
};
