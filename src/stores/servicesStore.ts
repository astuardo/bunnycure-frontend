/**
 * Store de Servicios con Zustand.
 * Maneja el estado del catálogo de servicios y operaciones CRUD.
 */

import { create } from 'zustand';
import { servicesApi } from '../api/services.api';
import { ServiceCatalog, ServiceFormData } from '../types/service.types';

interface ServicesState {
  services: ServiceCatalog[];
  selectedService: ServiceCatalog | null;
  isLoading: boolean;
  error: string | null;
  showInactiveServices: boolean;
  
  // Actions
  fetchServices: (activeOnly?: boolean) => Promise<void>;
  fetchServiceById: (id: number) => Promise<void>;
  createService: (data: ServiceFormData) => Promise<ServiceCatalog>;
  updateService: (id: number, data: ServiceFormData) => Promise<ServiceCatalog>;
  toggleServiceActive: (id: number) => Promise<void>;
  deleteService: (id: number) => Promise<void>;
  setShowInactiveServices: (show: boolean) => void;
  setSelectedService: (service: ServiceCatalog | null) => void;
  clearError: () => void;
}

export const useServicesStore = create<ServicesState>((set, get) => ({
  services: [],
  selectedService: null,
  isLoading: false,
  error: null,
  showInactiveServices: false,

  fetchServices: async (activeOnly) => {
    set({ isLoading: true, error: null });
    try {
      const shouldShowActiveOnly = activeOnly !== undefined ? activeOnly : !get().showInactiveServices;
      const services = await servicesApi.list(shouldShowActiveOnly);
      set({ services, isLoading: false });
    } catch (error) {
      console.error('❌ Error fetching services:', error);
      const err = error as { response?: { data?: { error?: { message?: string } } } };
      const errorMessage = err.response?.data?.error?.message || 'Error al cargar servicios';
      set({ error: errorMessage, isLoading: false });
      throw error;
    }
  },

  fetchServiceById: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const service = await servicesApi.getById(id);
      set({ selectedService: service, isLoading: false });
    } catch (error) {
      console.error('❌ Error fetching service:', error);
      const err = error as { response?: { data?: { error?: { message?: string } } } };
      const errorMessage = err.response?.data?.error?.message || 'Error al cargar servicio';
      set({ error: errorMessage, isLoading: false });
      throw error;
    }
  },

  createService: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const newService = await servicesApi.create(data);
      set((state) => ({
        services: [...state.services, newService],
        isLoading: false,
      }));
      console.log('✅ Servicio creado exitosamente');
      return newService;
    } catch (error) {
      console.error('❌ Error creating service:', error);
      const err = error as { response?: { data?: { error?: { message?: string } } } };
      const errorMessage = err.response?.data?.error?.message || 'Error al crear servicio';
      set({ error: errorMessage, isLoading: false });
      throw error;
    }
  },

  updateService: async (id, data) => {
    set({ isLoading: true, error: null });
    try {
      const updatedService = await servicesApi.update(id, data);
      set((state) => ({
        services: state.services.map((svc) =>
          svc.id === id ? updatedService : svc
        ),
        selectedService: state.selectedService?.id === id ? updatedService : state.selectedService,
        isLoading: false,
      }));
      console.log('✅ Servicio actualizado exitosamente');
      return updatedService;
    } catch (error) {
      console.error('❌ Error updating service:', error);
      const err = error as { response?: { data?: { error?: { message?: string } } } };
      const errorMessage = err.response?.data?.error?.message || 'Error al actualizar servicio';
      set({ error: errorMessage, isLoading: false });
      throw error;
    }
  },

  toggleServiceActive: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const updatedService = await servicesApi.toggleActive(id);
      set((state) => ({
        services: state.services.map((svc) =>
          svc.id === id ? updatedService : svc
        ),
        selectedService: state.selectedService?.id === id ? updatedService : state.selectedService,
        isLoading: false,
      }));
      console.log('✅ Estado de servicio actualizado');
    } catch (error) {
      console.error('❌ Error toggling service:', error);
      const err = error as { response?: { data?: { error?: { message?: string } } } };
      const errorMessage = err.response?.data?.error?.message || 'Error al cambiar estado';
      set({ error: errorMessage, isLoading: false });
      throw error;
    }
  },

  deleteService: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await servicesApi.delete(id);
      set((state) => ({
        services: state.services.filter((svc) => svc.id !== id),
        selectedService: state.selectedService?.id === id ? null : state.selectedService,
        isLoading: false,
      }));
      console.log('✅ Servicio eliminado exitosamente');
    } catch (error) {
      console.error('❌ Error deleting service:', error);
      const err = error as { response?: { data?: { error?: { message?: string } } } };
      const errorMessage = err.response?.data?.error?.message || 'Error al eliminar servicio';
      set({ error: errorMessage, isLoading: false });
      throw error;
    }
  },

  setShowInactiveServices: (show) => {
    set({ showInactiveServices: show });
    get().fetchServices(!show);
  },

  setSelectedService: (service) => {
    set({ selectedService: service });
  },

  clearError: () => {
    set({ error: null });
  },
}));
