/**
 * Utilidades para el Módulo de Reactivación de Clientas Inactivas.
 */

import { differenceInCalendarDays, isValid, parseISO, startOfDay } from 'date-fns';
import { Customer } from '@/types/customer.types';
import { Appointment, AppointmentStatus } from '@/types/appointment.types';
import {
  InactiveCustomer,
  ReactivationContactRecord,
  ReactivationFilterOptions,
  ReactivationSummaryMetrics,
  TemplateTone,
} from '@/types/reactivation.types';
import { toWhatsAppPhone } from './giftcardRenderer';
import { matchRutSearch } from './rutUtils';

export const BUNNYCURE_OFFICIAL_PHONE = '+56988873031';
export const BUNNYCURE_OFFICIAL_PHONE_DIGITS = '56988873031';
export const CONTACT_COOLDOWN_DAYS = 7;
const STORAGE_KEY = 'bunnycure_reactivation_contacts_v1';

/**
 * Obtiene el mapa de contactos anti-spam guardados en localStorage.
 */
export function getReactivationContactMap(): Record<number, ReactivationContactRecord> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch (error) {
    console.error('Error reading reactivation contact history:', error);
    return {};
  }
}

/**
 * Registra un contacto realizado a una clienta.
 */
export function recordCustomerContact(
  customerId: number,
  lastServiceMentioned?: string,
  channel: 'WHATSAPP' | 'MANUAL' = 'WHATSAPP'
): void {
  try {
    const map = getReactivationContactMap();
    map[customerId] = {
      customerId,
      contactedAt: new Date().toISOString(),
      channel,
      lastServiceMentioned,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch (error) {
    console.error('Error saving reactivation contact record:', error);
  }
}

/**
 * Remueve el registro de contacto de una clienta (para reestablecer disponibilidad).
 */
export function clearCustomerContact(customerId: number): void {
  try {
    const map = getReactivationContactMap();
    delete map[customerId];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch (error) {
    console.error('Error clearing customer contact record:', error);
  }
}

/**
 * Extrae el primer nombre de una clienta de forma limpia y amigable.
 */
export function getFirstName(fullName?: string): string {
  if (!fullName) return 'amiga';
  const trimmed = fullName.trim();
  if (!trimmed) return 'amiga';
  const parts = trimmed.split(/\s+/);
  return parts[0] || 'amiga';
}

/**
 * Parsea una fecha de manera segura retornando Date o null.
 */
export function parseDateSafe(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) return isValid(value) ? value : null;
  if (typeof value === 'string') {
    const parsed = parseISO(value);
    if (isValid(parsed)) return parsed;
    const direct = new Date(value);
    return isValid(direct) ? direct : null;
  }
  if (typeof value === 'number') {
    const direct = new Date(value);
    return isValid(direct) ? direct : null;
  }
  return null;
}

/**
 * Calcula la lista completa de clientas inactivas (> 20 días sin agendar),
 * excluyendo automáticamente a cualquier clienta con citas futuras.
 */
export function computeInactiveCustomers(
  customers: Customer[],
  appointments: Appointment[]
): InactiveCustomer[] {
  const now = new Date();
  const todayStart = startOfDay(now);
  const contactMap = getReactivationContactMap();

  // Agrupar citas por ID de cliente
  const customerAptsMap = new Map<number, Appointment[]>();
  for (const apt of appointments) {
    const cId = apt.customer?.id;
    if (!cId) continue;
    if (!customerAptsMap.has(cId)) {
      customerAptsMap.set(cId, []);
    }
    customerAptsMap.get(cId)!.push(apt);
  }

  const inactiveList: InactiveCustomer[] = [];

  for (const customer of customers) {
    const apts = customerAptsMap.get(customer.id) || [];

    // 1. Verificar si tiene citas futuras CONFIRMED o PENDING
    const hasFuture = apts.some((apt) => {
      const isFutureStatus =
        apt.status === AppointmentStatus.CONFIRMED ||
        apt.status === AppointmentStatus.PENDING;
      if (!isFutureStatus) return false;

      const aptDate = parseDateSafe(apt.appointmentDate);
      if (!aptDate) return false;
      return aptDate.getTime() >= todayStart.getTime();
    });

    // Si ya tiene cita futura programada, se excluye automáticamente de reactivación
    if (hasFuture) {
      continue;
    }

    // 2. Obtener el historial pasado ordenado (más reciente primero)
    const pastApts = apts
      .filter((apt) => {
        if (apt.status === AppointmentStatus.CANCELLED) return false;
        const aptDate = parseDateSafe(apt.appointmentDate);
        if (!aptDate) return false;
        return aptDate.getTime() <= now.getTime();
      })
      .sort((a, b) => {
        const da = parseDateSafe(a.appointmentDate)?.getTime() || 0;
        const db = parseDateSafe(b.appointmentDate)?.getTime() || 0;
        return db - da;
      });

    const lastAppointment = pastApts[0] || null;
    let baselineDate: Date | null = null;
    let serviceName = 'Servicio de Manicure';
    let serviceId: number | null = null;

    if (lastAppointment) {
      baselineDate = parseDateSafe(lastAppointment.appointmentDate);
      if (lastAppointment.services && lastAppointment.services.length > 0) {
        serviceName = lastAppointment.services.map((s) => s.name).join(' + ');
        serviceId = lastAppointment.services[0].id;
      } else if (lastAppointment.service) {
        serviceName = lastAppointment.service.name;
        serviceId = lastAppointment.service.id;
      }
    } else if (customer.createdAt) {
      // Si nunca ha tenido citas, considerar fecha de registro
      baselineDate = parseDateSafe(customer.createdAt);
      serviceName = 'Primer Servicio';
    }

    if (!baselineDate) {
      continue;
    }

    const daysInactive = differenceInCalendarDays(now, baselineDate);

    // Solo incluir si la inactividad es mayor o igual a 20 días
    if (daysInactive >= 20) {
      const contactRecord = contactMap[customer.id];
      let lastContactedAt: string | null = null;
      let isContactedRecently = false;
      let daysSinceLastContact: number | null = null;

      if (contactRecord?.contactedAt) {
        lastContactedAt = contactRecord.contactedAt;
        const contactDate = parseDateSafe(contactRecord.contactedAt);
        if (contactDate) {
          daysSinceLastContact = differenceInCalendarDays(now, contactDate);
          isContactedRecently = daysSinceLastContact < CONTACT_COOLDOWN_DAYS;
        }
      }

      const totalCompletedVisits = apts.filter(
        (a) => a.status === AppointmentStatus.COMPLETED
      ).length;

      inactiveList.push({
        customer,
        lastAppointment,
        lastAppointmentDate: baselineDate,
        daysSinceLastAppointment: daysInactive,
        lastServiceName: serviceName,
        lastServiceId: serviceId,
        totalCompletedVisits,
        hasFutureAppointment: false,
        lastContactedAt,
        isContactedRecently,
        daysSinceLastContact,
      });
    }
  }

  // Ordenar por mayor cantidad de días inactiva primero
  return inactiveList.sort(
    (a, b) => b.daysSinceLastAppointment - a.daysSinceLastAppointment
  );
}

/**
 * Calcula métricas resumen de inactivas para los KPI cards.
 */
export function computeSummaryMetrics(
  inactiveCustomers: InactiveCustomer[]
): ReactivationSummaryMetrics {
  let maintenance20To29 = 0;
  let followUp30To44 = 0;
  let critical45Plus = 0;
  let contactedRecently = 0;

  for (const item of inactiveCustomers) {
    if (item.daysSinceLastAppointment >= 20 && item.daysSinceLastAppointment <= 29) {
      maintenance20To29++;
    } else if (item.daysSinceLastAppointment >= 30 && item.daysSinceLastAppointment <= 44) {
      followUp30To44++;
    } else if (item.daysSinceLastAppointment >= 45) {
      critical45Plus++;
    }

    if (item.isContactedRecently) {
      contactedRecently++;
    }
  }

  return {
    totalInactive20Plus: inactiveCustomers.length,
    maintenance20To29,
    followUp30To44,
    critical45Plus,
    contactedRecently,
  };
}

/**
 * Filtra el listado de inactivas según las opciones seleccionadas.
 */
export function filterInactiveCustomers(
  items: InactiveCustomer[],
  filters: ReactivationFilterOptions
): InactiveCustomer[] {
  return items.filter((item) => {
    // 1. Filtro por Rango de Inactividad
    if (filters.inactivityRange === '20_TO_29') {
      if (item.daysSinceLastAppointment < 20 || item.daysSinceLastAppointment > 29) return false;
    } else if (filters.inactivityRange === '30_TO_44') {
      if (item.daysSinceLastAppointment < 30 || item.daysSinceLastAppointment > 44) return false;
    } else if (filters.inactivityRange === '45_PLUS') {
      if (item.daysSinceLastAppointment < 45) return false;
    }

    // 2. Filtro por Servicio Previo
    if (filters.serviceId !== 'ALL') {
      if (item.lastServiceId !== filters.serviceId) {
        return false;
      }
    }

    // 3. Filtro por Estado de Contacto Anti-Spam
    if (filters.contactStatus === 'UNCONTACTED') {
      if (item.isContactedRecently) return false;
    } else if (filters.contactStatus === 'CONTACTED_RECENTLY') {
      if (!item.isContactedRecently) return false;
    }

    // 4. Búsqueda por texto (Nombre, Teléfono o RUT con/sin puntos)
    if (filters.search.trim()) {
      const q = filters.search.trim().toLowerCase();
      const name = (item.customer.fullName || '').toLowerCase();
      const phone = (item.customer.phone || '').toLowerCase();
      const rutMatches = matchRutSearch(q, item.customer.rut);
      if (!name.includes(q) && !phone.includes(q) && !rutMatches) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Genera el mensaje dinámico de WhatsApp según el tono seleccionado.
 */
export function buildReactivationMessage(options: {
  customer: Customer;
  lastServiceName?: string;
  daysSinceLast?: number;
  tone?: TemplateTone;
  businessPhone?: string;
}): string {
  const { customer, lastServiceName, daysSinceLast, tone = 'MAINTENANCE', businessPhone = BUNNYCURE_OFFICIAL_PHONE } = options;
  const firstName = getFirstName(customer.fullName);
  const service = lastServiceName || 'tu servicio de manicure';
  const days = daysSinceLast || 21;

  switch (tone) {
    case 'MAINTENANCE':
      return (
        `¡Hola ${firstName}! 🌸 Te escribimos de BunnyCure.\n\n` +
        `Notamos que ya pasaron ${days} días desde tu ${service} y ya estás en la fecha ideal para tu mantención y que tus uñitas sigan sanas y hermosas ✨\n\n` +
        `¿Te gustaría asegurar tu cupo para esta semana? Respóndenos por aquí a nuestro WhatsApp oficial ${businessPhone} para coordinar tu hora con mucho gusto 💖`
      );

    case 'MISS_YOU':
      return (
        `¡Hola ${firstName}! 🐰💅 ¡Te extrañamos mucho en BunnyCure!\n\n` +
        `Hace ya un tiempo que no consentimos tus manitos desde tu último ${service}. Tenemos nuevos colores, esmaltes y diseños hermosos esperándote ✨\n\n` +
        `¿Agendamos tu próxima cita? Avísanos por este chat (${businessPhone}) qué día y hora te acomoda 🥰`
      );

    case 'SPECIAL_OFFER':
      return (
        `¡Hola ${firstName}! 💖 Esperamos que estés teniendo una excelente semana.\n\n` +
        `En BunnyCure nos encantaría volver a atenderte y dejar tus uñitas increíbles como siempre ✨ Si quieres renovar tu ${service}, ¡tenemos espacios disponibles para ti!\n\n` +
        `Escríbenos por este medio (${businessPhone}) y te ayudamos a coordinar tu cita encantadas 🌸✨`
      );

    default:
      return (
        `¡Hola ${firstName}! 🌸 Te saludamos de BunnyCure. Nos encantaría volver a atenderte para tu próxima mantención de ${service}. Respóndenos a este WhatsApp (${businessPhone}) para coordinar tu hora 💖`
      );
  }
}

/**
 * Construye la URL para abrir WhatsApp con número formateado y mensaje codificado.
 */
export function buildReactivationWhatsAppUrl(phone: string, message: string): string {
  const normalizedPhone = toWhatsAppPhone(phone);
  const encodedText = encodeURIComponent(message);
  if (!normalizedPhone) {
    return `https://wa.me/?text=${encodedText}`;
  }
  return `https://wa.me/${normalizedPhone}?text=${encodedText}`;
}
