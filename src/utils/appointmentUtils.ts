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

/**
 * Nombre de la plantilla oficial en Meta Business Manager / WhatsApp Cloud API
 */
export const GOOGLE_REVIEW_TEMPLATE_NAME = 'valoracion_servicio_google';

/**
 * Enlace oficial de valoración en Google Reviews
 */
export const GOOGLE_REVIEWS_URL = 'https://g.page/r/CfcuMpxkvLJ3EBM/review';

/**
 * Construye el mensaje oficial alineado con la plantilla 'valoracion_servicio_google'
 */
export function buildGoogleReviewMessage(customerName?: string, serviceName?: string): string {
  const firstName = (customerName || '').trim().split(/\s+/)[0] || 'amiga';
  const service = serviceName || 'tu atención de manicure';

  return (
    `¡Hola ${firstName}! 🌸 Muchas gracias por visitarnos hoy en BunnyCure para tu ${service} ✨\n\n` +
    `Nos encantaría saber qué te pareció tu atención y tus uñitas. ¿Nos regalarías 1 minuto para dejarnos tu opinión en Google? 💖\n\n` +
    `⭐ Dejar reseña aquí: ${GOOGLE_REVIEWS_URL}\n\n` +
    `¡Tu valoración nos ayuda muchísimo a seguir mejorando y creciendo! 🥰`
  );
}

export function buildGoogleReviewWhatsAppUrl(phone?: string, customerName?: string, serviceName?: string): string {
  const digits = (phone || '').replace(/\D/g, '');
  let waPhone = digits;
  if (digits.startsWith('56')) {
    waPhone = digits;
  } else if (digits.length === 9 && digits.startsWith('9')) {
    waPhone = `56${digits}`;
  }

  const message = buildGoogleReviewMessage(customerName, serviceName);
  const encoded = encodeURIComponent(message);

  if (!waPhone) {
    return `https://wa.me/?text=${encoded}`;
  }
  return `https://wa.me/${waPhone}?text=${encoded}`;
}

