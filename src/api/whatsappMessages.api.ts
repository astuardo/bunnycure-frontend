import apiClient from './client';
import { ApiResponse, PagedResponse } from '../types/api.types';

export interface IncomingWhatsAppMessageDto {
  id: number;
  fromPhone: string;
  senderName: string;
  content: string;
  messageType: string;
  customerId?: number | null;
  customerName?: string | null;
  isRead: boolean;
  replyUrl: string;
  createdAt: string;
}

export const whatsappMessagesApi = {
  /**
   * Obtener mensajes entrantes paginados
   */
  getMessages: async (
    page = 0,
    size = 20,
    unreadOnly = false,
    readOnly = false
  ): Promise<PagedResponse<IncomingWhatsAppMessageDto>> => {
    const response = await apiClient.get<ApiResponse<PagedResponse<IncomingWhatsAppMessageDto>>>(
      '/api/whatsapp/messages',
      {
        params: { page, size, unreadOnly, readOnly },
      }
    );
    return response.data?.data || {
      content: [],
      page: 0,
      size,
      totalElements: 0,
      totalPages: 0,
      first: true,
      last: true,
    };
  },

  /**
   * Obtener conteo de mensajes no leídos
   */
  getUnreadCount: async (): Promise<number> => {
    try {
      const response = await apiClient.get<ApiResponse<{ unreadCount: number }>>(
        '/api/whatsapp/messages/unread-count'
      );
      return response.data?.data?.unreadCount ?? 0;
    } catch {
      return 0;
    }
  },

  /**
   * Marcar mensaje individual como leído
   */
  markAsRead: async (id: number): Promise<boolean> => {
    try {
      const response = await apiClient.patch<ApiResponse<{ success: boolean }>>(
        `/api/whatsapp/messages/${id}/read`
      );
      return response.data?.data?.success ?? true;
    } catch {
      return false;
    }
  },

  /**
   * Marcar todos los mensajes como leídos
   */
  markAllAsRead: async (): Promise<number> => {
    try {
      const response = await apiClient.patch<ApiResponse<{ markedCount: number }>>(
        '/api/whatsapp/messages/read-all'
      );
      return response.data?.data?.markedCount ?? 0;
    } catch {
      return 0;
    }
  },

  /**
   * Marcar todos los mensajes de un número/remitente como leídos
   */
  markByPhoneAsRead: async (phone: string): Promise<number> => {
    try {
      const response = await apiClient.patch<ApiResponse<{ markedCount: number }>>(
        `/api/whatsapp/messages/by-phone/${encodeURIComponent(phone)}/read`
      );
      return response.data?.data?.markedCount ?? 0;
    } catch {
      return 0;
    }
  },
};
