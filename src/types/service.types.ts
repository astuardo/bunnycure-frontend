/**
 * Tipos para el dominio de Servicios.
 */

export interface ServiceCatalog {
  id: number;
  name: string;
  description?: string;
  durationMinutes: number;
  price: number; // BigDecimal en backend
  active: boolean;
  displayOrder: number;
  imageUrl?: string; // Campo no existe en modelo, por ahora opcional
}

export interface ServiceSummary {
  id: number;
  name: string;
  durationMinutes: number;
  price: number; // BigDecimal en backend
  active: boolean;
}

export interface ServiceFormData {
  name: string;
  description?: string;
  durationMinutes: number;
  price: number;
  displayOrder: number;
  imageUrl?: string;
}
