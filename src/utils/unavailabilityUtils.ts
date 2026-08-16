import { parseISO, startOfDay, endOfDay } from 'date-fns';
import { ScheduleUnavailability } from '../types/unavailability.types';

export const isDateBlockedFullDay = (
  date: Date,
  unavailabilities: ScheduleUnavailability[] = []
): { blocked: boolean; reason?: string; item?: ScheduleUnavailability } => {
  const targetTime = startOfDay(date).getTime();

  for (const item of unavailabilities) {
    if (item.type === 'FULL_DAY') {
      const start = startOfDay(parseISO(item.startDate)).getTime();
      const end = endOfDay(parseISO(item.endDate || item.startDate)).getTime();
      if (targetTime >= start && targetTime <= end) {
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
  const targetTime = startOfDay(date).getTime();

  return unavailabilities.filter((item) => {
    const start = startOfDay(parseISO(item.startDate)).getTime();
    const end = endOfDay(parseISO(item.endDate || item.startDate)).getTime();
    return targetTime >= start && targetTime <= end;
  });
};

export const isDateBlockedTimeSlot = (
  date: Date,
  unavailabilities: ScheduleUnavailability[] = []
): boolean => {
  const targetTime = startOfDay(date).getTime();

  return unavailabilities.some((item) => {
    if (item.type !== 'TIME_SLOT') return false;
    const start = startOfDay(parseISO(item.startDate)).getTime();
    const end = endOfDay(parseISO(item.endDate || item.startDate)).getTime();
    return targetTime >= start && targetTime <= end;
  });
};

export const getTodayUnavailabilities = (
  unavailabilities: ScheduleUnavailability[] = []
): ScheduleUnavailability[] => {
  return getDateUnavailabilities(new Date(), unavailabilities);
};
