import apiClient from './client';
import { ApiResponse } from '../types/api.types';
import { DashboardStats } from '../types/stats.types';

export const statsApi = {
  getDashboardStats: async (): Promise<DashboardStats> => {
    const response = await apiClient.get<ApiResponse<DashboardStats>>('/api/stats/dashboard');
    if (!response.data.data) {
      throw new Error('Error al obtener estadísticas del dashboard');
    }
    return response.data.data;
  },
};
