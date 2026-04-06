/**
 * Store de Citas con Zustand.
 * Maneja el estado de las citas y operaciones CRUD.
 */

import { create } from 'zustand';
import { appointmentsApi } from '../api/appointments.api';
import { Appointment, AppointmentCreateRequest, AppointmentUpdateRequest, AppointmentStatus } from '../types/appointment.types';

interface AppointmentsState {
  appointments: Appointment[];
  selectedAppointment: Appointment | null;
  isLoading: boolean;
  error: string | null;
  
  // Filtros
  filters: {
    startDate?: string;
    endDate?: string;
    status?: AppointmentStatus;
  };
  
  // Actions
  fetchAppointments: (filters?: { startDate?: string; endDate?: string; status?: AppointmentStatus }) => Promise<void>;
  fetchAppointmentById: (id: number) => Promise<void>;
  createAppointment: (data: AppointmentCreateRequest) => Promise<Appointment>;
  updateAppointment: (id: number, data: AppointmentUpdateRequest) => Promise<Appointment>;
  updateAppointmentStatus: (id: number, status: AppointmentStatus) => Promise<void>;
  deleteAppointment: (id: number) => Promise<void>;
  setFilters: (filters: Partial<AppointmentsState['filters']>) => void;
  clearFilters: () => void;
  setSelectedAppointment: (appointment: Appointment | null) => void;
  clearError: () => void;
}

export const useAppointmentsStore = create<AppointmentsState>((set, get) => ({
  appointments: [],
  selectedAppointment: null,
  isLoading: false,
  error: null,
  filters: {},

  fetchAppointments: async (filters) => {
    set({ isLoading: true, error: null });
    try {
      const params = filters || get().filters;
      const appointments = await appointmentsApi.list(params);
      set({ appointments, isLoading: false });
    } catch (error) {
      console.error('❌ Error fetching appointments:', error);
      const err = error as { response?: { data?: { error?: { message?: string } } } };
      const errorMessage = err.response?.data?.error?.message || 'Error al cargar citas';
      set({ error: errorMessage, isLoading: false });
      throw error;
    }
  },

  fetchAppointmentById: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const appointment = await appointmentsApi.getById(id);
      set({ selectedAppointment: appointment, isLoading: false });
    } catch (error) {
      console.error('❌ Error fetching appointment:', error);
      const err = error as { response?: { data?: { error?: { message?: string } } } };
      const errorMessage = err.response?.data?.error?.message || 'Error al cargar cita';
      set({ error: errorMessage, isLoading: false });
      throw error;
    }
  },

  createAppointment: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const newAppointment = await appointmentsApi.create(data);
      set((state) => ({
        appointments: [...state.appointments, newAppointment],
        isLoading: false,
      }));
      console.log('✅ Cita creada exitosamente');
      return newAppointment;
    } catch (error) {
      console.error('❌ Error creating appointment:', error);
      const err = error as { response?: { data?: { error?: { message?: string } } } };
      const errorMessage = err.response?.data?.error?.message || 'Error al crear cita';
      set({ error: errorMessage, isLoading: false });
      throw error;
    }
  },

  updateAppointment: async (id, data) => {
    set({ isLoading: true, error: null });
    try {
      const updatedAppointment = await appointmentsApi.update(id, data);
      set((state) => ({
        appointments: state.appointments.map((apt) =>
          apt.id === id ? updatedAppointment : apt
        ),
        selectedAppointment: state.selectedAppointment?.id === id ? updatedAppointment : state.selectedAppointment,
        isLoading: false,
      }));
      console.log('✅ Cita actualizada exitosamente');
      return updatedAppointment;
    } catch (error) {
      console.error('❌ Error updating appointment:', error);
      const err = error as { response?: { data?: { error?: { message?: string } } } };
      const errorMessage = err.response?.data?.error?.message || 'Error al actualizar cita';
      set({ error: errorMessage, isLoading: false });
      throw error;
    }
  },

  updateAppointmentStatus: async (id, status) => {
    set({ isLoading: true, error: null });
    try {
      const updatedAppointment = await appointmentsApi.updateStatus(id, status);
      set((state) => ({
        appointments: state.appointments.map((apt) =>
          apt.id === id ? updatedAppointment : apt
        ),
        selectedAppointment: state.selectedAppointment?.id === id ? updatedAppointment : state.selectedAppointment,
        isLoading: false,
      }));
      console.log(`✅ Estado de cita actualizado a ${status}`);
    } catch (error) {
      console.error('❌ Error updating appointment status:', error);
      const err = error as { response?: { data?: { error?: { message?: string } } } };
      const errorMessage = err.response?.data?.error?.message || 'Error al actualizar estado';
      set({ error: errorMessage, isLoading: false });
      throw error;
    }
  },

  deleteAppointment: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await appointmentsApi.delete(id);
      set((state) => ({
        appointments: state.appointments.filter((apt) => apt.id !== id),
        selectedAppointment: state.selectedAppointment?.id === id ? null : state.selectedAppointment,
        isLoading: false,
      }));
      console.log('✅ Cita eliminada exitosamente');
    } catch (error) {
      console.error('❌ Error deleting appointment:', error);
      const err = error as { response?: { data?: { error?: { message?: string } } } };
      const errorMessage = err.response?.data?.error?.message || 'Error al eliminar cita';
      set({ error: errorMessage, isLoading: false });
      throw error;
    }
  },

  setFilters: (filters) => {
    set((state) => ({
      filters: { ...state.filters, ...filters },
    }));
  },

  clearFilters: () => {
    set({ filters: {} });
  },

  setSelectedAppointment: (appointment) => {
    set({ selectedAppointment: appointment });
  },

  clearError: () => {
    set({ error: null });
  },
}));
