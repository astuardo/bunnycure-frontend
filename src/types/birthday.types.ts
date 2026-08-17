/**
 * Tipos para Módulo de Cumpleañeras del Mes y Fidelización
 */

import { Customer } from './customer.types';

export type BirthdayStatus = 'TODAY' | 'NEXT_7_DAYS' | 'THIS_MONTH' | 'OTHER_MONTH';
export type BirthdayTone = 'DISCOUNT' | 'GIFT' | 'SIMPLE';

export interface BirthdayCustomer {
  customer: Customer;
  birthDate: string; // YYYY-MM-DD
  birthDayNumber: number; // 1..31
  birthMonthNumber: number; // 1..12
  formattedBirthDay: string; // "14 de Agosto"
  ageToTurn?: number;
  status: BirthdayStatus;
  isToday: boolean;
  isNext7Days: boolean;
  isThisMonth: boolean;
  daysUntilBirthday: number;
  alreadyGreetedThisYear: boolean;
}

export interface BirthdaySummaryMetrics {
  totalThisMonth: number;
  totalToday: number;
  totalNext7Days: number;
  totalGreetedThisYear: number;
  totalWithBirthDate: number;
  totalWithoutBirthDate: number;
}
