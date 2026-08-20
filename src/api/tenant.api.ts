import apiClient from './client';
import { ApiResponse } from '../types/api.types';
import { TenantInfo, DEFAULT_TENANT } from '../types/tenant.types';

export const tenantApi = {
  /**
   * Obtiene la información pública y de branding del salón según el dominio actual o slug.
   */
  getTenantInfo: async (domain?: string, slug?: string): Promise<TenantInfo> => {
    try {
      const params: Record<string, string> = {};
      if (domain) params.domain = domain;
      if (slug) params.slug = slug;

      const response = await apiClient.get<ApiResponse<TenantInfo>>('/api/public/tenant-info', {
        params,
      });

      return response.data.data || DEFAULT_TENANT;
    } catch (error) {
      console.warn('⚠️ No se pudo obtener información del salón, usando valores por defecto:', error);
      return DEFAULT_TENANT;
    }
  },
};
