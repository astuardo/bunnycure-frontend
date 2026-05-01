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
    const response = await apiClient.post<ApiResponse<Customer>>(
      `/api/customers/${id}/loyalty/adjust`,
      null,
      { params: { delta } }
    );
    if (!response.data.data) throw new Error('Error al ajustar sellos');
    return response.data.data;
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
};
