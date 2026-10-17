// Tipos y utilidades compartidos por AppointmentsPage y sus modales.

import { AppointmentStatus } from '../../types/appointment.types';

export interface AppointmentFormState {
  customerId: number;
  serviceIds: number[];
  appointmentDate: string;
  appointmentTime: string;
  notes: string;
}
export interface CustomChargeItem {
  id: number;
  description: string;
  amount: number;
}
export type CreateStep = 'form' | 'summary';
export const formatCurrency = (value: number) => `$${value.toLocaleString('es-CL')}`;
export interface AppointmentEditFormState extends AppointmentFormState {
  status: AppointmentStatus;
  totalPrice?: number;
}
export type EditMode = 'edit' | 'reschedule';
