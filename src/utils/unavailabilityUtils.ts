import { format, isValid } from 'date-fns';
import { ScheduleUnavailability } from '../types/unavailability.types';

const toDateString = (date: Date): string => {
  if (!isValid(date)) return '';
  return format(date, 'yyyy-MM-dd');
};

const normalizeIsoDate = (dateStr?: string): string => {
  if (!dateStr) return '';
  return dateStr.trim().slice(0, 10);
};

export const isDateBlockedFullDay = (
  date: Date,
  unavailabilities: ScheduleUnavailability[] = []
): { blocked: boolean; reason?: string; item?: ScheduleUnavailability } => {
  const targetStr = toDateString(date);
  if (!targetStr) return { blocked: false };

  for (const item of unavailabilities) {
    if (item.type === 'FULL_DAY') {
      const startStr = normalizeIsoDate(item.startDate);
      const endStr = normalizeIsoDate(item.endDate || item.startDate);
      if (targetStr >= startStr && targetStr <= endStr) {
        return { blocked: true, reason: item.reason, item };
      }
    }
  }

  return { blocked: false };
};

export const getDateUnavailabilities = (
  date: Date,
  unavailabilities: ScheduleUnavailability[] = []
): ScheduleUnavailability[] => {
  const targetStr = toDateString(date);
  if (!targetStr) return [];

  return unavailabilities.filter((item) => {
    const startStr = normalizeIsoDate(item.startDate);
    const endStr = normalizeIsoDate(item.endDate || item.startDate);
    return targetStr >= startStr && targetStr <= endStr;
  });
};

export const isDateBlockedTimeSlot = (
  date: Date,
  unavailabilities: ScheduleUnavailability[] = []
): boolean => {
  const targetStr = toDateString(date);
  if (!targetStr) return false;

  return unavailabilities.some((item) => {
    if (item.type !== 'TIME_SLOT') return false;
    const startStr = normalizeIsoDate(item.startDate);
    const endStr = normalizeIsoDate(item.endDate || item.startDate);
    return targetStr >= startStr && targetStr <= endStr;
  });
};

export const getTodayUnavailabilities = (
  unavailabilities: ScheduleUnavailability[] = []
): ScheduleUnavailability[] => {
  return getDateUnavailabilities(new Date(), unavailabilities);
};
