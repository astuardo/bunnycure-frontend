import apiClient from './client';
import { ApiResponse } from '../types/api.types';
import {
  GiftCard,
  GiftCardCreateRequest,
  GiftCardRedeemRequest,
  GiftCardRevertRequest,
  GiftCardStatus,
} from '../types/giftcard.types';
import { normalizeGiftCardPublicUrl } from '@/utils/giftcardUrl';

const mapGiftCard = (giftCard: GiftCard): GiftCard => ({
  ...giftCard,
  publicUrl: normalizeGiftCardPublicUrl(giftCard.publicUrl, giftCard.code),
});

export const giftcardsApi = {
  list: async (params?: {
    search?: string;
    status?: GiftCardStatus;
    expiringBefore?: string;
  }): Promise<GiftCard[]> => {
    const response = await apiClient.get<ApiResponse<GiftCard[]>>('/api/giftcards', { params });
    return (response.data.data || []).map(mapGiftCard);
  },

  getById: async (id: number): Promise<GiftCard> => {
    const response = await apiClient.get<ApiResponse<GiftCard>>(`/api/giftcards/${id}`);
    if (!response.data.data) throw new Error('GiftCard no encontrada');
    return mapGiftCard(response.data.data);
  },

  create: async (data: GiftCardCreateRequest): Promise<GiftCard> => {
    const response = await apiClient.post<ApiResponse<GiftCard>>('/api/giftcards', data);
    if (!response.data.data) throw new Error('No se pudo crear GiftCard');
    return mapGiftCard(response.data.data);
  },

  update: async (id: number, data: GiftCardCreateRequest): Promise<GiftCard> => {
    const response = await apiClient.put<ApiResponse<GiftCard>>(`/api/giftcards/${id}`, data);
    if (!response.data.data) throw new Error('No se pudo actualizar GiftCard');
    return mapGiftCard(response.data.data);
  },

  redeem: async (id: number, data: GiftCardRedeemRequest): Promise<GiftCard> => {
    const response = await apiClient.post<ApiResponse<GiftCard>>(`/api/giftcards/${id}/redeem`, data);
    if (!response.data.data) throw new Error('No se pudo canjear GiftCard');
    return mapGiftCard(response.data.data);
  },

  revert: async (id: number, data: GiftCardRevertRequest): Promise<GiftCard> => {
    const response = await apiClient.post<ApiResponse<GiftCard>>(`/api/giftcards/${id}/redeem/revert`, data);
    if (!response.data.data) throw new Error('No se pudo revertir canje');
    return mapGiftCard(response.data.data);
  },

  cancel: async (id: number, note?: string): Promise<GiftCard> => {
    const response = await apiClient.post<ApiResponse<GiftCard>>(`/api/giftcards/${id}/cancel`, { note });
    if (!response.data.data) throw new Error('No se pudo anular GiftCard');
    return mapGiftCard(response.data.data);
  },

  getPublicByCode: async (code: string): Promise<GiftCard> => {
    const response = await apiClient.get<ApiResponse<GiftCard>>(`/api/public/giftcards/${code}`);
    if (!response.data.data) throw new Error('GiftCard no encontrada');
    return mapGiftCard(response.data.data);
  },

  redeemPublic: async (code: string, data: GiftCardRedeemRequest): Promise<GiftCard> => {
    const response = await apiClient.post<ApiResponse<GiftCard>>(`/api/public/giftcards/${code}/redeem`, data);
    if (!response.data.data) throw new Error('No se pudo canjear GiftCard');
    return mapGiftCard(response.data.data);
  },
};
