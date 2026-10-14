/**
 * API Client para la gestión SaaS Multi-Salón (Super Admin / Platform Management)
 */

import apiClient from './client';
import { ApiResponse } from '../types/api.types';
import {
  TenantAdmin,
  TenantSummary,
  TenantCreateFormData,
  TenantUpdateFormData,
} from '../types/tenant.types';

export const tenantsApi = {
  /**
   * Listar todos los salones registrados con métricas
   */
  list: async (): Promise<TenantAdmin[]> => {
    const response = await apiClient.get<ApiResponse<TenantAdmin[]>>('/api/admin/tenants');
    return response.data.data || [];
  },

  /**
   * Listar resúmenes de salones activos (para conmutador rápido)
   */
  getSummaries: async (): Promise<TenantSummary[]> => {
    const response = await apiClient.get<ApiResponse<TenantSummary[]>>('/api/admin/tenants/summaries');
    return response.data.data || [];
  },

  /**
   * Obtener detalle completo de un salón por ID
   */
  getById: async (id: number): Promise<TenantAdmin> => {
    const response = await apiClient.get<ApiResponse<TenantAdmin>>(`/api/admin/tenants/${id}`);
    if (!response.data.data) throw new Error('Salón no encontrado');
    return response.data.data;
  },

  /**
   * Crear y aprovisionar un nuevo salón
   */
  create: async (data: TenantCreateFormData): Promise<TenantAdmin> => {
    const response = await apiClient.post<ApiResponse<TenantAdmin>>('/api/admin/tenants', data);
    if (!response.data.data) throw new Error('Error al registrar salón');
    return response.data.data;
  },

  /**
   * Actualizar configuración de un salón
   */
  update: async (id: number, data: TenantUpdateFormData): Promise<TenantAdmin> => {
    const response = await apiClient.put<ApiResponse<TenantAdmin>>(`/api/admin/tenants/${id}`, data);
    if (!response.data.data) throw new Error('Error al actualizar salón');
    return response.data.data;
  },

  /**
   * Alternar estado activo / inactivo de un salón
   */
  toggleStatus: async (id: number, active: boolean): Promise<void> => {
    await apiClient.patch(`/api/admin/tenants/${id}/status`, { active });
  },
};
