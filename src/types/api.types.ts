/**
 * Tipos comunes para respuestas de la API REST.
 * Coinciden con los DTOs del backend Java.
 */

export interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  error: ErrorResponse | null;
  timestamp: string;
}

export interface ErrorResponse {
  message: string;
  errorCode: string;
  fieldErrors?: FieldError[];
  /** Datos adicionales (p.ej. plan requerido en errores 402). */
  details?: Record<string, unknown>;
}

export interface FieldError {
  field: string;
  message: string;
}

export interface PagedResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
}
