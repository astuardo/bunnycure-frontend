/**
 * Tipos para el dominio de Citas.
 */

import { CustomerSummary } from './customer.types';
import { ServiceSummary } from './service.types';

export enum AppointmentStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED'
}

export interface Appointment {
  id: number;
  appointmentDate: string;
  appointmentTime: string;
  status: AppointmentStatus;
  notes?: string;
  customer: CustomerSummary;
  service: ServiceSummary;
  reminderSent: boolean;
  whatsAppConfirmationSent: boolean; // Campo no existe en modelo, por ahora incluido en DTO
}

export interface AppointmentCreateRequest {
  customerId: number;
  serviceId: number;
  appointmentDate: string;
  appointmentTime: string;
  notes?: string;
}

export interface AppointmentUpdateRequest {
  customerId?: number;
  serviceId?: number;
  appointmentDate?: string;
  appointmentTime?: string;
  status?: AppointmentStatus;
  notes?: string;
}
