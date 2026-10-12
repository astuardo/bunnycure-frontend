import apiClient from './client';
import { ApiResponse } from '../types/api.types';
import { LoyaltyCardPublicDto } from '../types/loyaltyCard.types';

export const loyaltyCardApi = {
  getPublicCard: async (publicId: string): Promise<LoyaltyCardPublicDto> => {
    const response = await apiClient.get<ApiResponse<LoyaltyCardPublicDto>>(
      `/api/public/loyalty-card/${publicId}`
    );
    if (!response.data.data) {
      throw new Error('Tarjeta de fidelización no encontrada');
    }
    return response.data.data;
  },
};
