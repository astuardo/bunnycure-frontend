/**
 * Tipos para el dominio de Clientes.
 */

export enum NotificationPreference {
  EMAIL = 'EMAIL',
  WHATSAPP = 'WHATSAPP',
  BOTH = 'BOTH',
  NONE = 'NONE'
}

export interface Customer {
  id: number;
  publicId: string;
  fullName: string;
  phone: string;
  email?: string;
  gender?: string;
  birthDate?: string;
  emergencyPhone?: string;
  healthNotes?: string;
  notes?: string;
  instagram?: string;
  notificationPreference: NotificationPreference;
  loyaltyStamps?: number;
  totalCompletedVisits?: number;
  currentRewardIndex?: number;
}

export interface CustomerSummary {
  id: number;
  fullName: string;
  phone: string;
  loyaltyStamps?: number;
}

export interface CustomerLookupResponse {
  exists: boolean;
  customer?: {
    publicId: string;
    fullName: string;
    phone: string;
    email?: string;
  };
}

export interface CustomerFormData {
  fullName: string;
  phone: string;
  email?: string;
  gender?: string;
  birthDate?: string;
  emergencyPhone?: string;
  healthNotes?: string;
  notes?: string;
  instagram?: string;
  notificationPreference: NotificationPreference;
}
