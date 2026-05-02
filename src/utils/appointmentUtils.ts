/**
 * Utilidades compartidas para cálculos de citas
 */

import { Appointment } from '@/types/appointment.types';

/**
 * Calcula el total de una cita considerando:
 * 1. Total estimado en notas (si existe)
 * 2. totalPrice del campo
 * 3. Suma de precios de servicios
 * 
 * Duplicado en: AppointmentsPage, DashboardPage, analytics.api
 * Este es el único lugar de verdad.
 */
export function getAppointmentTotal(apt: Appointment): number {
  if (!apt) return 0;

  // Primero intentar leer desde notas (total estimado final)
  if (apt.notes) {
    const match = apt.notes.match(/Total final estimado:\s*\$?\s*([\d.]+)/i);
    if (match && match[1]) {
      const parsedTotal = parseInt(match[1].replace(/\./g, ''), 10);
      if (!isNaN(parsedTotal) && parsedTotal > 0) return parsedTotal;
    }
  }

  // Luego intentar desde totalPrice
  if (typeof apt.totalPrice === 'number' && apt.totalPrice > 0) return apt.totalPrice;

  // Finalmente sumar precios de servicios
  const services = apt.services || (apt.service ? [apt.service] : []);
  return services.reduce((sum, service) => sum + (service?.price || 0), 0);
}

/**
 * Extrae el motivo de cancelación desde las notas de la cita
 */
export function extractCancellationReason(apt: Appointment): string {
  if (apt?.notes) {
    const match = apt.notes.match(/Motivo:\s*(.+?)(\n|$)/i);
    if (match && match[1]) {
      return match[1].trim();
    }
  }
  return 'Sin especificar';
}
