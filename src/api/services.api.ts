/**
 * API de Servicios - endpoints para gestión de catálogo de servicios.
 */

import apiClient from './client';
import { ApiResponse } from '../types/api.types';
import { ServiceCatalog, ServiceFormData } from '../types/service.types';

export const servicesApi = {
  /**
   * Listar servicios (opcionalmente solo activos)
   */
  list: async (activeOnly: boolean = true): Promise<ServiceCatalog[]> => {
    const response = await apiClient.get<ApiResponse<ServiceCatalog[]>>('/api/services', {
      params: { activeOnly }
    });
    return response.data.data || [];
  },

  /**
   * Obtener servicio por ID
   */
  getById: async (id: number): Promise<ServiceCatalog> => {
    const response = await apiClient.get<ApiResponse<ServiceCatalog>>(`/api/services/${id}`);
    if (!response.data.data) throw new Error('Servicio no encontrado');
    return response.data.data;
  },

  /**
   * Crear nuevo servicio
   */
  create: async (data: ServiceFormData): Promise<ServiceCatalog> => {
    const response = await apiClient.post<ApiResponse<ServiceCatalog>>('/api/services', data);
    if (!response.data.data) throw new Error('Error al crear servicio');
    return response.data.data;
  },

  /**
   * Actualizar servicio existente
   */
  update: async (id: number, data: ServiceFormData): Promise<ServiceCatalog> => {
    const response = await apiClient.put<ApiResponse<ServiceCatalog>>(`/api/services/${id}`, data);
    if (!response.data.data) throw new Error('Error al actualizar servicio');
    return response.data.data;
  },

  /**
   * Activar/Desactivar servicio
   */
  toggleActive: async (id: number): Promise<ServiceCatalog> => {
    const response = await apiClient.patch<ApiResponse<ServiceCatalog>>(`/api/services/${id}/toggle-active`);
    if (!response.data.data) throw new Error('Error al cambiar estado');
    return response.data.data;
  },

  /**
   * Eliminar servicio (o desactivar si está en uso)
   */
  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/api/services/${id}`);
  },
};
