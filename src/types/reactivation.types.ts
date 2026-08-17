/**
 * Tipos para el Módulo de Reactivación de Clientas Inactivas.
 */

import { Customer } from './customer.types';
import { Appointment } from './appointment.types';

export type InactivityRange = 'ALL_20_PLUS' | '20_TO_29' | '30_TO_44' | '45_PLUS';

export type ContactStatusFilter = 'ALL' | 'UNCONTACTED' | 'CONTACTED_RECENTLY';

export type TemplateTone = 'MAINTENANCE' | 'MISS_YOU' | 'SPECIAL_OFFER';

export interface InactiveCustomer {
  customer: Customer;
  lastAppointment: Appointment | null;
  lastAppointmentDate: Date | null;
  daysSinceLastAppointment: number;
  lastServiceName: string;
  lastServiceId: number | null;
  totalCompletedVisits: number;
  hasFutureAppointment: boolean;
  lastContactedAt: string | null; // ISO string
  isContactedRecently: boolean; // within cooldown window (e.g. 7 days)
  daysSinceLastContact: number | null;
}

export interface ReactivationFilterOptions {
  inactivityRange: InactivityRange;
  serviceId: number | 'ALL';
  contactStatus: ContactStatusFilter;
  search: string;
}

export interface ReactivationSummaryMetrics {
  totalInactive20Plus: number;
  maintenance20To29: number;
  followUp30To44: number;
  critical45Plus: number;
  contactedRecently: number;
}

export interface ReactivationContactRecord {
  customerId: number;
  contactedAt: string; // ISO string
  channel: 'WHATSAPP' | 'MANUAL';
  lastServiceMentioned?: string;
}
