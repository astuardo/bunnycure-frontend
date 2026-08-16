/**
 * Tipos para Bloqueos de Agenda, Días No Laborables y Eventos Personales
 */

export type UnavailabilityType = 'FULL_DAY' | 'TIME_SLOT';

export interface ScheduleUnavailability {
  id: string;
  type: UnavailabilityType;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD (igual a startDate si es 1 día)
  startTime?: string; // HH:mm (solo si type === 'TIME_SLOT')
  endTime?: string; // HH:mm (solo si type === 'TIME_SLOT')
  reason: string; // Motivo obligatorio o descriptivo: "Médico", "Vacaciones", etc.
  createdAt: string;
}

export interface UnavailabilityColorConfig {
  fullDayColor: string; // Fondo suave para día completo
  timeSlotColor: string; // Fondo para franjas horarias
}

export interface UnavailabilityNotificationConfig {
  enabled: boolean;
  notify24HoursBefore: boolean;
  notify1HourBefore: boolean;
}

export const DEFAULT_UNAVAILABILITY_COLORS: UnavailabilityColorConfig = {
  fullDayColor: '#ffd6de', // Rosado intenso armonioso BunnyCure
  timeSlotColor: '#feecd2', // Ámbar / durazno suave
};

export const DEFAULT_UNAVAILABILITY_NOTIFICATIONS: UnavailabilityNotificationConfig = {
  enabled: true,
  notify24HoursBefore: true,
  notify1HourBefore: true,
};

export const QUICK_REASONS = [
  'Médico',
  'Vacaciones',
  'Trámite Personal',
  'Capacitación',
  'Feriado',
  'Almuerzo / Descanso',
  'Mantenimiento Local',
];
