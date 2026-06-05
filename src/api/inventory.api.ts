import apiClient from './client';
import { ApiResponse } from '../types/api.types';
import { Product, ProductFormData, ConsumeRequest, PurchaseRequest, InventoryMovement } from '../types/inventory.types';

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
  }
};
