/**
 * Store de Solicitudes de Reserva con Zustand.
 * Maneja el estado de las booking requests y operaciones.
 */

import { create } from 'zustand';
import { bookingsApi } from '../api/bookings.api';
import { BookingRequest, BookingApproval, BookingRequestStatus } from '../types/booking.types';
import { Appointment } from '../types/appointment.types';

interface BookingRequestsState {
  bookingRequests: BookingRequest[];
  selectedBookingRequest: BookingRequest | null;
  isLoading: boolean;
  error: string | null;
  showAllRequests: boolean;
  
  // Actions
  fetchBookingRequests: (pendingOnly?: boolean) => Promise<void>;
  fetchBookingRequestById: (id: number) => Promise<void>;
  approveBookingRequest: (id: number, approval: BookingApproval) => Promise<Appointment>;
  rejectBookingRequest: (id: number, reason?: string) => Promise<void>;
  setShowAllRequests: (show: boolean) => void;
  setSelectedBookingRequest: (request: BookingRequest | null) => void;
  clearError: () => void;
}

export const useBookingRequestsStore = create<BookingRequestsState>((set, get) => ({
  bookingRequests: [],
  selectedBookingRequest: null,
  isLoading: false,
  error: null,
  showAllRequests: false,

  fetchBookingRequests: async (pendingOnly) => {
    set({ isLoading: true, error: null });
    try {
      const shouldShowPendingOnly = pendingOnly !== undefined ? pendingOnly : !get().showAllRequests;
      const bookingRequests = await bookingsApi.list(shouldShowPendingOnly);
      set({ bookingRequests, isLoading: false });
    } catch (error) {
      console.error('❌ Error fetching booking requests:', error);
      const err = error as { response?: { data?: { error?: { message?: string } } } };
      const errorMessage = err.response?.data?.error?.message || 'Error al cargar solicitudes';
      set({ error: errorMessage, isLoading: false });
      throw error;
    }
  },

  fetchBookingRequestById: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const bookingRequest = await bookingsApi.getById(id);
      set({ selectedBookingRequest: bookingRequest, isLoading: false });
    } catch (error) {
      console.error('❌ Error fetching booking request:', error);
      const err = error as { response?: { data?: { error?: { message?: string } } } };
      const errorMessage = err.response?.data?.error?.message || 'Error al cargar solicitud';
      set({ error: errorMessage, isLoading: false });
      throw error;
    }
  },

  approveBookingRequest: async (id, approval) => {
    set({ isLoading: true, error: null });
    try {
      const appointment = await bookingsApi.approve(id, approval);
      // Actualizar estado de la solicitud en la lista
      set((state) => ({
        bookingRequests: state.bookingRequests.map((req) =>
          req.id === id ? { ...req, status: BookingRequestStatus.APPROVED, appointmentId: appointment.id } : req
        ),
        selectedBookingRequest: state.selectedBookingRequest?.id === id 
          ? { ...state.selectedBookingRequest, status: BookingRequestStatus.APPROVED, appointmentId: appointment.id }
          : state.selectedBookingRequest,
        isLoading: false,
      }));
      console.log('✅ Solicitud aprobada y cita creada');
      return appointment;
    } catch (error) {
      console.error('❌ Error approving booking request:', error);
      const err = error as { response?: { data?: { error?: { message?: string } } } };
      const errorMessage = err.response?.data?.error?.message || 'Error al aprobar solicitud';
      set({ error: errorMessage, isLoading: false });
      throw error;
    }
  },

  rejectBookingRequest: async (id, reason) => {
    set({ isLoading: true, error: null });
    try {
      const rejectedRequest = await bookingsApi.reject(id, reason);
      set((state) => ({
        bookingRequests: state.bookingRequests.map((req) =>
          req.id === id ? rejectedRequest : req
        ),
        selectedBookingRequest: state.selectedBookingRequest?.id === id ? rejectedRequest : state.selectedBookingRequest,
        isLoading: false,
      }));
      console.log('✅ Solicitud rechazada');
    } catch (error) {
      console.error('❌ Error rejecting booking request:', error);
      const err = error as { response?: { data?: { error?: { message?: string } } } };
      const errorMessage = err.response?.data?.error?.message || 'Error al rechazar solicitud';
      set({ error: errorMessage, isLoading: false });
      throw error;
    }
  },

  setShowAllRequests: (show) => {
    set({ showAllRequests: show });
    get().fetchBookingRequests(!show);
  },

  setSelectedBookingRequest: (request) => {
    set({ selectedBookingRequest: request });
  },

  clearError: () => {
    set({ error: null });
  },
}));
