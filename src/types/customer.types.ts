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
  notificationPreference: NotificationPreference;
}

export interface CustomerSummary {
  id: number;
  fullName: string;
  phone: string;
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
  notificationPreference: NotificationPreference;
}
