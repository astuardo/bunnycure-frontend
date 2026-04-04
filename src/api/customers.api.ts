/**
 * API de Clientes - endpoints para gestión de customers.
 */

import apiClient from './client';
import { ApiResponse } from '../types/api.types';
import { Customer, CustomerSummary, CustomerLookupResponse, CustomerFormData } from '../types/customer.types';

export const customersApi = {
  /**
   * Listar clientes (opcionalmente con búsqueda)
   */
  list: async (search?: string): Promise<CustomerSummary[]> => {
    const response = await apiClient.get<ApiResponse<CustomerSummary[]>>('/api/customers', {
      params: search ? { search } : undefined
    });
    return response.data.data || [];
  },

  /**
   * Obtener cliente por ID
   */
  getById: async (id: number): Promise<Customer> => {
    const response = await apiClient.get<ApiResponse<Customer>>(`/api/customers/${id}`);
    if (!response.data.data) throw new Error('Cliente no encontrado');
    return response.data.data;
  },

  /**
   * Buscar cliente por teléfono (endpoint público)
   */
  lookup: async (phone: string): Promise<CustomerLookupResponse> => {
    const response = await apiClient.post<CustomerLookupResponse>(
      '/api/customers/lookup',
      null,
      { params: { phone } }
    );
    return response.data;
  },

  /**
   * Crear nuevo cliente
   */
  create: async (data: CustomerFormData): Promise<Customer> => {
    const response = await apiClient.post<ApiResponse<Customer>>('/api/customers', data);
    if (!response.data.data) throw new Error('Error al crear cliente');
    return response.data.data;
  },

  /**
   * Actualizar cliente existente
   */
  update: async (id: number, data: CustomerFormData): Promise<Customer> => {
    const response = await apiClient.put<ApiResponse<Customer>>(`/api/customers/${id}`, data);
    if (!response.data.data) throw new Error('Error al actualizar cliente');
    return response.data.data;
  },

  /**
   * Eliminar cliente
   */
  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/api/customers/${id}`);
  },
};
