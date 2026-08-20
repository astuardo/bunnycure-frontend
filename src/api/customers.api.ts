/**
 * API de Clientes - endpoints para gestión de customers.
 */

import apiClient from './client';
import { ApiResponse } from '../types/api.types';
import { Customer, CustomerLookupResponse, CustomerFormData } from '../types/customer.types';

interface WalletLinksResponse {
  url: string;
  qrUrl?: string;
  shortUrl?: string;
}

type BackendLookupResponse = {
  found?: boolean;
  exists?: boolean;
  customer?: {
    publicId?: string;
    id?: number;
    fullName?: string;
    phone?: string;
    email?: string;
  };
  publicId?: string;
  id?: number;
  fullName?: string;
  phone?: string;
  email?: string;
};

const normalizeLookupResponse = (payload: BackendLookupResponse): CustomerLookupResponse => {
  if (typeof payload.exists === 'boolean') {
    return {
      exists: payload.exists,
      customer: payload.customer
        ? {
            publicId: payload.customer.publicId || String(payload.customer.id || ''),
            fullName: payload.customer.fullName || '',
            phone: payload.customer.phone || '',
            email: payload.customer.email,
          }
        : undefined,
    };
  }

  const found = payload.found === true;
  return {
    exists: found,
    customer: found
      ? {
          publicId: payload.publicId || String(payload.id || ''),
          fullName: payload.fullName || '',
          phone: payload.phone || '',
          email: payload.email,
        }
      : undefined,
  };
};

const buildPhoneLookupCandidates = (phone: string): string[] => {
  const trimmed = phone.trim();
  const digits = trimmed.replace(/\D/g, '');
  if (!digits) return [];

  const candidates = new Set<string>();
  candidates.add(trimmed);
  candidates.add(digits);
  candidates.add(`+${digits}`);

  if (digits.startsWith('56')) {
    const local = digits.slice(2);
    if (local) {
      candidates.add(local);
      candidates.add(`+${local}`);
    }
  }

  if (digits.length === 9 && digits.startsWith('9')) {
    candidates.add(`56${digits}`);
    candidates.add(`+56${digits}`);
  }

  return Array.from(candidates).filter((value) => value.length > 0);
};

export const customersApi = {
  /**
   * Listar clientes (opcionalmente con búsqueda)
   */
  list: async (search?: string): Promise<Customer[]> => {
    const response = await apiClient.get<ApiResponse<Customer[]>>('/api/customers', {
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
    const response = await apiClient.post<BackendLookupResponse>(
      '/api/customers/lookup',
      null,
      { params: { phone } }
    );
    return normalizeLookupResponse(response.data);
  },

  /**
   * Buscar cliente por teléfono probando variantes de formato (+56, 56, local)
   */
  lookupFlexible: async (phone: string): Promise<CustomerLookupResponse> => {
    const candidates = buildPhoneLookupCandidates(phone);
    let lastResponse: CustomerLookupResponse = { exists: false };

    for (const candidate of candidates) {
      const response = await apiClient.post<BackendLookupResponse>(
        '/api/customers/lookup',
        null,
        { params: { phone: candidate } }
      );
      const normalized = normalizeLookupResponse(response.data);
      lastResponse = normalized;
      if (normalized.exists) {
        return normalized;
      }
    }

    return lastResponse;
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

  /**
   * Ajustar sellos de fidelización manualmente
   */
  adjustLoyalty: async (id: number, delta: number): Promise<Customer> => {
    const response = await apiClient.post<ApiResponse<Customer> | Customer>(
      `/api/customers/${id}/loyalty/adjust`,
      null,
      { params: { delta } }
    );
    const payload = response.data;
    const customer = (payload as ApiResponse<Customer>)?.data ?? (payload as Customer);
    if (!customer || typeof customer !== 'object') throw new Error('Error al ajustar sellos');
    return customer;
  },

  /**
   * Sincronizar y recalcular visitas completadas a partir de las citas reales
   */
  syncVisits: async (id: number): Promise<Customer> => {
    const response = await apiClient.post<ApiResponse<Customer> | Customer>(
      `/api/customers/${id}/sync-visits`
    );
    const payload = response.data;
    const customer = (payload as ApiResponse<Customer>)?.data ?? (payload as Customer);
    if (!customer || typeof customer !== 'object') throw new Error('Error al sincronizar visitas');
    return customer;
  },

  /**
   * Sincronizar y recalcular visitas completadas de TODOS los clientes en base a sus citas reales
   */
  syncAllVisits: async (): Promise<{ totalProcessed: number; updatedCount: number }> => {
    const response = await apiClient.post<ApiResponse<{ totalProcessed: number; updatedCount: number }>>(
      `/api/customers/sync-all-visits`
    );
    const payload = response.data;
    const result = payload?.data || { totalProcessed: 0, updatedCount: 0 };
    return result;
  },

  /**
   * Obtener enlace de Google Wallet para el cliente
   */
  getGoogleWalletLinks: async (id: number): Promise<{ openUrl: string; qrUrl: string }> => {
    const response = await apiClient.get<ApiResponse<WalletLinksResponse>>(`/api/customers/${id}/wallet/google-link`);
    const payload = response.data.data;
    const openUrl = payload?.url || '';
    const qrUrl = payload?.qrUrl || payload?.shortUrl || openUrl;
    return { openUrl, qrUrl };
  },

  /**
   * Obtener enlace de Google Wallet para abrir en navegador
   */
  getGoogleWalletLink: async (id: number): Promise<string> => {
    const { openUrl } = await customersApi.getGoogleWalletLinks(id);
    return openUrl;
  },

  /**
   * Obtener enlace ideal para codificar en QR (corto cuando backend lo provee)
   */
  getGoogleWalletQrLink: async (id: number): Promise<string> => {
    const { qrUrl } = await customersApi.getGoogleWalletLinks(id);
    return qrUrl;
  },

  /**
   * Listar registros de servicio y fotos desde el backend
   */
  listServiceRecords: async (id: number): Promise<Array<{
    id: number;
    customerId: number;
    serviceDetail: string;
    photoCaption?: string;
    mimeType?: string;
    hasPhoto: boolean;
    createdAt: string;
  }>> => {
    const response = await apiClient.get<ApiResponse<Array<{
      id: number;
      customerId: number;
      serviceDetail: string;
      photoCaption?: string;
      mimeType?: string;
      hasPhoto: boolean;
      createdAt: string;
    }>>>(`/api/customers/${id}/service-records`);
    return response.data.data || [];
  },

  /**
   * Guardar nuevo registro de servicio con foto en el backend
   */
  createServiceRecord: async (
    id: number,
    payload: {
      serviceDetail: string;
      photoCaption?: string;
      photoBase64?: string;
      mimeType?: string;
    }
  ) => {
    const response = await apiClient.post<ApiResponse<{
      id: number;
      customerId: number;
      serviceDetail: string;
      photoCaption?: string;
      mimeType?: string;
      hasPhoto: boolean;
      createdAt: string;
    }>>(`/api/customers/${id}/service-records`, payload);
    return response.data.data;
  },

  /**
   * Eliminar un registro de servicio en el backend
   */
  deleteServiceRecord: async (customerId: number, recordId: number): Promise<void> => {
    await apiClient.delete(`/api/customers/${customerId}/service-records/${recordId}`);
  },

  /**
   * Obtener URL directa para streaming de foto de servicio
   */
  getServiceRecordPhotoUrl: (customerId: number, recordId: number): string => {
    return `/api/customers/${customerId}/service-records/${recordId}/photo`;
  },
};
