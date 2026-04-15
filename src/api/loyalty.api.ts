import apiClient from './client';
import { ApiResponse } from '../types/api.types';
import { LoyaltyReward } from '../types/loyalty.types';

export const loyaltyApi = {
  list: async (): Promise<LoyaltyReward[]> => {
    const response = await apiClient.get<ApiResponse<LoyaltyReward[]>>('/api/loyalty-rewards');
    return response.data.data || [];
  },

  create: async (reward: Partial<LoyaltyReward>): Promise<LoyaltyReward> => {
    const response = await apiClient.post<ApiResponse<LoyaltyReward>>('/api/loyalty-rewards', reward);
    if (!response.data.data) throw new Error('Error al crear premio');
    return response.data.data;
  },

  update: async (id: number, reward: Partial<LoyaltyReward>): Promise<LoyaltyReward> => {
    const response = await apiClient.put<ApiResponse<LoyaltyReward>>(`/api/loyalty-rewards/${id}`, reward);
    if (!response.data.data) throw new Error('Error al actualizar premio');
    return response.data.data;
  },

  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/api/loyalty-rewards/${id}`);
  },

  reorder: async (ids: number[]): Promise<void> => {
    await apiClient.post('/api/loyalty-rewards/reorder', ids);
  },
};
