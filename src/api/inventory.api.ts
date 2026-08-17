import apiClient from './client';
import { ApiResponse } from '../types/api.types';
import {
  Product,
  ProductFormData,
  ConsumeRequest,
  PurchaseRequest,
  InventoryMovement,
  ProductImportPreview,
  ServiceSupply,
  ServiceSupplyFormData,
  ServiceCostSummary,
  ProductPriceAnalysis,
  StockProjection,
  AppointmentSuppliesPreview,
  CompleteAppointmentWithSuppliesPayload,
} from '../types/inventory.types';

export const inventoryApi = {
  listProducts: async (): Promise<Product[]> => {
    const response = await apiClient.get<ApiResponse<Product[]>>('/api/inventory/products');
    return response.data.data || [];
  },

  getProduct: async (id: number): Promise<Product> => {
    const response = await apiClient.get<ApiResponse<Product>>(`/api/inventory/products/${id}`);
    if (!response.data.data) throw new Error('Producto no encontrado');
    return response.data.data;
  },

  createProduct: async (payload: ProductFormData): Promise<Product> => {
    const response = await apiClient.post<ApiResponse<Product>>('/api/inventory/products', payload);
    if (!response.data.data) throw new Error('Error al crear producto');
    return response.data.data;
  },

  updateProduct: async (id: number, payload: ProductFormData): Promise<Product> => {
    const response = await apiClient.put<ApiResponse<Product>>(`/api/inventory/products/${id}`, payload);
    if (!response.data.data) throw new Error('Error al actualizar producto');
    return response.data.data;
  },

  deleteProduct: async (id: number): Promise<void> => {
    await apiClient.delete(`/api/inventory/products/${id}`);
  },

  refreshObservedPrice: async (id: number): Promise<Product> => {
    const response = await apiClient.post<ApiResponse<Product>>(`/api/inventory/products/${id}/refresh-observed`);
    if (!response.data.data) throw new Error('Error al actualizar precio observado');
    return response.data.data;
  },

  importProductFromUrl: async (purchaseUrl: string): Promise<ProductImportPreview> => {
    const response = await apiClient.post<ApiResponse<ProductImportPreview>>('/api/inventory/products/import-from-url', { purchaseUrl });
    if (!response.data.data) throw new Error('No se pudo importar datos del link');
    return response.data.data;
  },

  consumeForService: async (payload: ConsumeRequest) => {
    return apiClient.post('/api/inventory/consume', payload);
  },

  registerPurchase: async (payload: PurchaseRequest): Promise<InventoryMovement> => {
    const response = await apiClient.post<ApiResponse<InventoryMovement>>('/api/inventory/purchase', payload);
    if (!response.data.data) throw new Error('Error al registrar compra');
    return response.data.data;
  },

  listMovements: async (productId?: number): Promise<InventoryMovement[]> => {
    const response = await apiClient.get<ApiResponse<InventoryMovement[]>>('/api/inventory/movements', {
      params: { productId }
    });
    return response.data.data || [];
  },

  // ─── Recetas de Insumos por Servicio ───────────────────────────────────────

  getServiceSupplies: async (serviceId: number): Promise<ServiceSupply[]> => {
    const response = await apiClient.get<ApiResponse<ServiceSupply[]>>(`/api/services/${serviceId}/supplies`);
    return response.data.data || [];
  },

  saveServiceSupplies: async (serviceId: number, supplies: ServiceSupplyFormData[]): Promise<ServiceSupply[]> => {
    const response = await apiClient.put<ApiResponse<ServiceSupply[]>>(`/api/services/${serviceId}/supplies`, supplies);
    return response.data.data || [];
  },

  getServiceCostSummary: async (serviceId: number): Promise<ServiceCostSummary> => {
    const response = await apiClient.get<ApiResponse<ServiceCostSummary>>(`/api/services/${serviceId}/cost-summary`);
    if (!response.data.data) throw new Error('Error al obtener desglose de costo');
    return response.data.data;
  },

  getAllServicesCostsSummary: async (): Promise<ServiceCostSummary[]> => {
    const response = await apiClient.get<ApiResponse<ServiceCostSummary[]>>('/api/services/costs-summary');
    return response.data.data || [];
  },

  // ─── Análisis de Precios de Compra ─────────────────────────────────────────

  getPriceAnalysis: async (productId: number): Promise<ProductPriceAnalysis> => {
    const response = await apiClient.get<ApiResponse<ProductPriceAnalysis>>(`/api/inventory/products/${productId}/price-analysis`);
    if (!response.data.data) throw new Error('Error al obtener análisis de precios');
    return response.data.data;
  },

  // ─── Proyecciones de Stock a 7 Días ────────────────────────────────────────

  getStockProjections: async (): Promise<StockProjection[]> => {
    const response = await apiClient.get<ApiResponse<StockProjection[]>>('/api/inventory/projections');
    return response.data.data || [];
  },

  // ─── Previsualización y Deducción en Citas ─────────────────────────────────

  getAppointmentSuppliesPreview: async (appointmentId: number): Promise<AppointmentSuppliesPreview> => {
    const response = await apiClient.get<ApiResponse<AppointmentSuppliesPreview>>(`/api/inventory/appointments/${appointmentId}/supplies-preview`);
    if (!response.data.data) throw new Error('Error al previsualizar insumos de la cita');
    return response.data.data;
  },

  completeAppointmentWithSupplies: async (payload: CompleteAppointmentWithSuppliesPayload): Promise<void> => {
    await apiClient.post('/api/inventory/appointments/complete-with-supplies', payload);
  },
};

