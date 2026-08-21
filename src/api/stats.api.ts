import apiClient from './client';
import { ApiResponse } from '../types/api.types';
import { DashboardStats, TodayOperationalStats, SpecialistStat } from '../types/stats.types';

export const statsApi = {
  getDashboardStats: async (): Promise<DashboardStats> => {
    const response = await apiClient.get<ApiResponse<DashboardStats>>('/api/stats/dashboard');
    if (!response.data.data) {
      throw new Error('Error al obtener estadísticas del dashboard');
    }
    return response.data.data;
  },

  getTodayOperationalStats: async (): Promise<TodayOperationalStats> => {
    const response = await apiClient.get<ApiResponse<TodayOperationalStats>>('/api/stats/today');
    if (!response.data.data) {
      throw new Error('Error al obtener estadísticas operativas de hoy');
    }
    return response.data.data;
  },

  getSpecialistStats: async (startDate?: string, endDate?: string): Promise<SpecialistStat[]> => {
    const response = await apiClient.get<ApiResponse<SpecialistStat[]>>('/api/stats/specialists', {
      params: { startDate, endDate },
    });
    return response.data.data || [];
  },
};
