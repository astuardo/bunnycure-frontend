import apiClient from './client';
import { ApiResponse, PagedResponse } from '../types/api.types';

export interface WhatsAppOutboxMessageDto {
  id: number;
  appointmentId?: number | null;
  customerId?: number | null;
  customerName?: string | null;
  recipientPhone: string;
  messageType: 'TEMPLATE' | 'TEXT';
  templateName?: string | null;
  languageCode?: string | null;
  headerParam?: string | null;
  bodyParamsJson?: string | null;
  summaryContent?: string | null;
  status: 'PENDING' | 'RETRY' | 'SENT' | 'FAILED' | 'DISCARDED';
  attemptCount: number;
  lastError?: string | null;
  lastAttemptAt?: string | null;
  formattedLastAttemptAt?: string | null;
  createdAt: string;
  formattedCreatedAt?: string | null;
  sentAt?: string | null;
}

export interface RetryAllResult {
  total: number;
  succeeded: number;
  failed: number;
}

export const whatsappOutboxApi = {
  /**
   * Obtener mensajes de la cola de salida / fallidos paginados
   */
  getMessages: async (
    page = 0,
    size = 15,
    pendingOnly = true
  ): Promise<PagedResponse<WhatsAppOutboxMessageDto>> => {
    const response = await apiClient.get<ApiResponse<PagedResponse<WhatsAppOutboxMessageDto>>>(
      '/api/whatsapp/outbox',
      {
        params: { page, size, pendingOnly },
      }
    );
    return (
      response.data?.data || {
        content: [],
        page: 0,
        size,
        totalElements: 0,
        totalPages: 0,
        first: true,
        last: true,
      }
    );
  },

  /**
   * Obtener conteo de mensajes pendientes o fallidos
   */
  getPendingCount: async (): Promise<number> => {
    try {
      const response = await apiClient.get<ApiResponse<{ pendingCount: number }>>(
        '/api/whatsapp/outbox/pending-count'
      );
      return response.data?.data?.pendingCount ?? 0;
    } catch {
      return 0;
    }
  },

  /**
   * Reintentar un mensaje individual
   */
  retryMessage: async (id: number): Promise<{ success: boolean; message?: string; error?: string }> => {
    const response = await apiClient.post<ApiResponse<{ success: boolean; message?: string; error?: string }>>(
      `/api/whatsapp/outbox/${id}/retry`
    );
    return response.data?.data || { success: false, message: 'Respuesta inválida del servidor' };
  },

  /**
   * Reintentar todos los mensajes pendientes
   */
  retryAll: async (): Promise<RetryAllResult> => {
    const response = await apiClient.post<ApiResponse<RetryAllResult>>(
      '/api/whatsapp/outbox/retry-all'
    );
    return response.data?.data || { total: 0, succeeded: 0, failed: 0 };
  },

  /**
   * Descartar un mensaje individual
   */
  discardMessage: async (id: number): Promise<boolean> => {
    const response = await apiClient.post<ApiResponse<{ discarded: boolean }>>(
      `/api/whatsapp/outbox/${id}/discard`
    );
    return response.data?.data?.discarded ?? true;
  },

  /**
   * Descartar todos los mensajes pendientes
   */
  discardAll: async (): Promise<number> => {
    const response = await apiClient.post<ApiResponse<{ discardedCount: number }>>(
      '/api/whatsapp/outbox/discard-all'
    );
    return response.data?.data?.discardedCount ?? 0;
  },
};
