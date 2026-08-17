/**
 * Utilidades para Detección y Saludos de Cumpleañeras del Salón
 */

import { Customer } from '../types/customer.types';
import { BirthdayCustomer, BirthdaySummaryMetrics } from '../types/birthday.types';

export const BUNNYCURE_OFFICIAL_PHONE = '+56 9 8887 3031';
export const BUNNYCURE_BOOKING_URL = 'https://app.bunnycure.cl/reservar';

const MONTH_NAMES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

/**
 * Obtiene la clave de almacenamiento para el registro de saludo anual
 */
const getGreetingStorageKey = (customerId: number, year: number) => {
  return `bunnycure_birthday_greeted_${year}_${customerId}`;
};

/**
 * Verifica si ya se le envió saludo a la clienta en el año en curso
 */
export const hasBeenGreetedThisYear = (customerId: number, year: number = new Date().getFullYear()): boolean => {
  try {
    return localStorage.getItem(getGreetingStorageKey(customerId, year)) === 'true';
  } catch {
    return false;
  }
};

/**
 * Registra que se envió el saludo de cumpleaños en el año en curso
 */
export const recordBirthdayGreeting = (customerId: number, year: number = new Date().getFullYear()): void => {
  try {
    localStorage.setItem(getGreetingStorageKey(customerId, year), 'true');
  } catch {}
};

/**
 * Elimina el registro de saludo para permitir volver a enviar
 */
export const clearBirthdayGreeting = (customerId: number, year: number = new Date().getFullYear()): void => {
  try {
    localStorage.removeItem(getGreetingStorageKey(customerId, year));
  } catch {}
};

/**
 * Procesa todas las clientas para clasificar y calcular sus fechas de cumpleaños
 */
export const computeBirthdayCustomers = (
  customers: Customer[],
  referenceDate: Date = new Date()
): { birthdayCustomers: BirthdayCustomer[]; metrics: BirthdaySummaryMetrics } => {
  const currentYear = referenceDate.getFullYear();
  const currentMonth = referenceDate.getMonth() + 1; // 1..12
  const currentDay = referenceDate.getDate(); // 1..31

  let totalWithBirthDate = 0;
  let totalWithoutBirthDate = 0;
  let totalThisMonth = 0;
  let totalToday = 0;
  let totalNext7Days = 0;
  let totalGreetedThisYear = 0;

  const birthdayCustomers: BirthdayCustomer[] = [];

  customers.forEach((customer) => {
    const rawBirthDate = customer.birthDate;
    if (!rawBirthDate || typeof rawBirthDate !== 'string') {
      totalWithoutBirthDate++;
      return;
    }

    // Extraer YYYY, MM, DD
    const cleanStr = rawBirthDate.trim().slice(0, 10);
    const parts = cleanStr.split('-');
    if (parts.length < 3) {
      totalWithoutBirthDate++;
      return;
    }

    const birthYear = parseInt(parts[0], 10);
    const birthMonth = parseInt(parts[1], 10);
    const birthDay = parseInt(parts[2], 10);

    if (isNaN(birthMonth) || isNaN(birthDay) || birthMonth < 1 || birthMonth > 12 || birthDay < 1 || birthDay > 31) {
      totalWithoutBirthDate++;
      return;
    }

    totalWithBirthDate++;

    // Calcular edad a cumplir este año
    let ageToTurn: number | undefined = undefined;
    if (!isNaN(birthYear) && birthYear > 1900 && birthYear <= currentYear) {
      ageToTurn = currentYear - birthYear;
    }

    const isToday = birthMonth === currentMonth && birthDay === currentDay;
    const isThisMonth = birthMonth === currentMonth;

    // Calcular días faltantes para el cumpleaños
    let birthdayThisYear = new Date(currentYear, birthMonth - 1, birthDay);
    const todayMidnight = new Date(currentYear, referenceDate.getMonth(), currentDay);

    // Si ya pasó este año y no es hoy, considerar el próximo año para el cálculo de días faltantes
    if (birthdayThisYear < todayMidnight) {
      birthdayThisYear = new Date(currentYear + 1, birthMonth - 1, birthDay);
    }

    const diffTime = birthdayThisYear.getTime() - todayMidnight.getTime();
    const daysUntilBirthday = Math.round(diffTime / (1000 * 60 * 60 * 24));

    const isNext7Days = daysUntilBirthday >= 0 && daysUntilBirthday <= 7;

    let status: BirthdayCustomer['status'] = 'OTHER_MONTH';
    if (isToday) {
      status = 'TODAY';
    } else if (isNext7Days) {
      status = 'NEXT_7_DAYS';
    } else if (isThisMonth) {
      status = 'THIS_MONTH';
    }

    const alreadyGreeted = hasBeenGreetedThisYear(customer.id, currentYear);

    if (isThisMonth) totalThisMonth++;
    if (isToday) totalToday++;
    if (isNext7Days) totalNext7Days++;
    if (alreadyGreeted) totalGreetedThisYear++;

    const formattedBirthDay = `${birthDay} de ${MONTH_NAMES[birthMonth - 1]}`;

    birthdayCustomers.push({
      customer,
      birthDate: cleanStr,
      birthDayNumber: birthDay,
      birthMonthNumber: birthMonth,
      formattedBirthDay,
      ageToTurn,
      status,
      isToday,
      isNext7Days,
      isThisMonth,
      daysUntilBirthday,
      alreadyGreetedThisYear: alreadyGreeted,
    });
  });

  // Ordenar: primero los de hoy, luego los más próximos
  birthdayCustomers.sort((a, b) => {
    if (a.isToday && !b.isToday) return -1;
    if (!a.isToday && b.isToday) return 1;
    if (a.isThisMonth && !b.isThisMonth) return -1;
    if (!a.isThisMonth && b.isThisMonth) return 1;
    return a.daysUntilBirthday - b.daysUntilBirthday || a.birthDayNumber - b.birthDayNumber;
  });

  const metrics: BirthdaySummaryMetrics = {
    totalThisMonth,
    totalToday,
    totalNext7Days,
    totalGreetedThisYear,
    totalWithBirthDate,
    totalWithoutBirthDate,
  };

  return { birthdayCustomers, metrics };
};

export type BirthdayTone = 'DISCOUNT' | 'GIFT' | 'SIMPLE';

/**
 * Genera el mensaje personalizado de saludo de cumpleaños
 */
export const buildBirthdayGreetingMessage = (customerName: string, tone: BirthdayTone = 'DISCOUNT'): string => {
  const firstName = customerName.trim().split(' ')[0] || 'Clienta';

  if (tone === 'DISCOUNT') {
    return (
      `¡Feliz Cumpleaños, ${firstName}! 🎂🐰💖\n\n` +
      `De parte de todo el equipo de *BunnyCure* te deseamos un día maravilloso lleno de alegría 🎉✨\n\n` +
      `Para celebrar juntas, tienes un *15% DE DESCUENTO* en cualquier servicio durante todo tu mes de cumpleaños 💅🎁\n\n` +
      `¿Te gustaría reservar tu momento de relajo y consentirte?\n` +
      `Agenda directamente aquí: ${BUNNYCURE_BOOKING_URL} o responde a este mensaje para coordinar tu horita 💬\n\n` +
      `¡Que sea un año increíble! 🥳✨`
    );
  }

  if (tone === 'GIFT') {
    return (
      `¡Hola ${firstName}! 🎂🐰 ¡Feliz cumpleaños! 🎉✨\n\n` +
      `En *BunnyCure* queremos regalonearte en tu día especial 💖\n` +
      `Por eso, en tu próxima atención de este mes te regalamos un *Nail Art Especial o Hidratación Profunda de Manos* de cortesía 💅🎁\n\n` +
      `Puedes agendar tu cita en ${BUNNYCURE_BOOKING_URL} o escribirnos para ayudarte con tu reserva 💬\n\n` +
      `¡Te esperamos con mucho cariño! 🥳🐰`
    );
  }

  // SIMPLE
  return (
    `¡Muy Feliz Cumpleaños, ${firstName}! 🥳🎉🎂\n\n` +
    `De parte de todo el equipo de *BunnyCure* te enviamos un abrazo gigante y nuestros mejores deseos en tu día especial 🐰💖\n\n` +
    `¡Esperamos que lo pases hermoso y verte pronto por el salón para consentirte como te mereces! ✨💅`
  );
};

/**
 * Genera el enlace directo a WhatsApp (wa.me)
 */
export const buildBirthdayWhatsAppUrl = (phone: string, message: string): string => {
  const digits = phone.replace(/\D/g, '');
  const finalPhone = digits.startsWith('56') ? digits : digits.length === 9 ? `56${digits}` : `569${digits}`;
  const encoded = encodeURIComponent(message);
  return `https://wa.me/${finalPhone}?text=${encoded}`;
};
