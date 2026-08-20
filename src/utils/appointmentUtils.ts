/**
 * Utilidades compartidas para cálculos de citas
 */

import { Appointment } from '@/types/appointment.types';
import { ServiceSummary } from '@/types/service.types';

/**
 * Obtiene los servicios asociados a una cita (soporta formato nuevo 'services' y legacy 'service')
 */
export function getAppointmentServices(apt: Appointment): ServiceSummary[] {
  if (apt.services && apt.services.length > 0) return apt.services;
  return apt.service ? [apt.service] : [];
}

/**
 * Calcula el total de una cita considerando:
 * 1. totalPrice provisto por el backend / request (fuente canónica)
 * 2. Suma de precios de servicios asociados
 * 3. Total estimado en notas (fallback)
 */
export function getAppointmentTotal(apt: Appointment): number {
  if (!apt) return 0;

  // 1. Usar totalPrice calculado por el backend (fuente de verdad)
  if (typeof apt.totalPrice === 'number' && apt.totalPrice > 0) {
    return apt.totalPrice;
  }

  // 2. Sumar precios de los servicios
  const services = apt.services && apt.services.length > 0
    ? apt.services
    : (apt.service ? [apt.service] : []);

  const servicesTotal = services.reduce((sum, s) => sum + (s?.price || 0), 0);
  if (servicesTotal > 0) {
    return servicesTotal;
  }

  // 3. Fallback de contingencia: leer total estimado en notas si existe
  if (apt.notes) {
    const match = apt.notes.match(/Total final estimado:\s*\$?\s*([\d.]+)/i);
    if (match && match[1]) {
      const parsedTotal = parseInt(match[1].replace(/\./g, ''), 10);
      if (!isNaN(parsedTotal) && parsedTotal > 0) return parsedTotal;
    }
  }

  return 0;
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

