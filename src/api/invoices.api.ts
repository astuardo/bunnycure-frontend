/**
 * API de Boletas de Honorarios Electrónicas (SII v2 vía ApiGateway)
 */

import apiClient from './client';
import { ApiResponse } from '../types/api.types';
import {
  InvoiceSummary,
  InvoicePendingAppointment,
  InvoiceIssuedItem,
  InvoiceContrastResult,
  EmitInvoiceRequest,
} from '../types/invoice.types';

export const invoicesApi = {
  /**
   * Resumen general y métricas del mes (100% local, 0 créditos)
   */
  getSummary: async (): Promise<InvoiceSummary> => {
    const response = await apiClient.get<ApiResponse<InvoiceSummary>>('/api/invoices/summary');
    if (!response.data.data) throw new Error('Error al obtener métricas de facturación');
    return response.data.data;
  },

  /**
   * Listar citas completadas con boletas pendientes o fallidas por emitir (100% local, 0 créditos)
   */
  getPending: async (params?: { start?: string; end?: string }): Promise<InvoicePendingAppointment[]> => {
    const response = await apiClient.get<ApiResponse<InvoicePendingAppointment[]>>('/api/invoices/pending', { params });
    return response.data.data || [];
  },

  /**
   * Listar boletas emitidas registradas localmente en un período (100% local, 0 créditos)
   */
  getLocalIssued: async (periodo?: string): Promise<InvoiceIssuedItem[]> => {
    const response = await apiClient.get<ApiResponse<InvoiceIssuedItem[]>>('/api/invoices/local-issued', {
      params: { periodo },
    });
    return response.data.data || [];
  },

  /**
   * Emitir o reintentar boleta manual para una cita completada (Consume 1 crédito al emitir con éxito)
   */
  emitForAppointment: async (
    appointmentId: number,
    data?: EmitInvoiceRequest
  ): Promise<InvoiceIssuedItem> => {
    const response = await apiClient.post<ApiResponse<InvoiceIssuedItem>>(
      `/api/invoices/appointments/${appointmentId}/emit`,
      data || {}
    );
    if (!response.data.data) throw new Error('Error al emitir boleta de honorarios');
    return response.data.data;
  },

  /**
   * Contraste y conciliación bajo demanda contra el SII (con caché inteligente)
   */
  contrastWithSii: async (periodo?: string, forceRefresh = false): Promise<InvoiceContrastResult> => {
    const response = await apiClient.get<ApiResponse<InvoiceContrastResult>>('/api/invoices/contrast', {
      params: { periodo, forceRefresh },
    });
    if (!response.data.data) throw new Error('Error al consultar contraste con el SII');
    return response.data.data;
  },

  /**
   * Reenviar correo oficial del SII con PDF y XML al cliente
   */
  resendEmail: async (codigo: string, email?: string): Promise<{ success: boolean; message?: string }> => {
    const response = await apiClient.post<ApiResponse<{ success: boolean }>>(
      `/api/invoices/${codigo}/email`,
      email ? { email } : {}
    );
    return { success: response.data.data?.success ?? true };
  },

  /**
   * Descargar PDF oficial generado por el SII
   */
  downloadPdf: async (codigo: string, folio = 'boleta'): Promise<void> => {
    const response = await apiClient.get(`/api/invoices/${codigo}/pdf`, {
      responseType: 'blob',
    });
    const blob = new Blob([response.data], { type: 'application/pdf' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `BHE-${folio}-${codigo}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  },

  /**
   * Anular boleta en el SII
   */
  cancelInvoice: async (folio: string | number, causa = '3'): Promise<any> => {
    const response = await apiClient.post<ApiResponse<any>>(
      `/api/invoices/${folio}/cancel`,
      {},
      { params: { causa } }
    );
    return response.data.data;
  },
};
