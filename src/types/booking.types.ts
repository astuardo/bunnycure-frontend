/**
 * Tipos para el dominio de Solicitudes de Reserva.
 */

import { ServiceSummary } from './service.types';

export enum BookingRequestStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED'
}

export interface BookingRequest {
  id: number;
  fullName: string;
  phone: string;
  email?: string;
  preferredDate: string;
  preferredBlock: string; // "Mañana", "Tarde", "Noche" (no es LocalTime)
  notes?: string; // Se llama "notes" en el modelo, no "comments"
  status: BookingRequestStatus;
  service: ServiceSummary;
  createdAt: string;
  appointmentId?: number;
}

export interface BookingRequestFormData {
  fullName: string;
  phone: string;
  email?: string;
  serviceId: number;
  preferredDate: string;
  preferredBlock: string; // "Mañana", "Tarde", "Noche"
  notes?: string;
}

export interface BookingApproval {
  appointmentDate?: string;
  appointmentTime?: string;
  serviceId?: number;
  observations?: string;
}
