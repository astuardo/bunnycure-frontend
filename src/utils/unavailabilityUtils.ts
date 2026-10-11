import { format, isValid } from 'date-fns';
import { ScheduleUnavailability } from '../types/unavailability.types';

export const toDateString = (date: Date | string): string => {
  if (!date) return '';
  if (typeof date === 'string') {
    const trimmed = date.trim();
    if (trimmed.length >= 10) return trimmed.slice(0, 10);
    return '';
  }
  if (!isValid(date)) return '';
  return format(date, 'yyyy-MM-dd');
};

export const normalizeIsoDate = (dateStr?: string): string => {
  if (!dateStr) return '';
  return dateStr.trim().slice(0, 10);
};

export const isDateBlockedFullDay = (
  date: Date | string,
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
  date: Date | string,
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
  date: Date | string,
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

export const getTimeSlotBlocksForDate = (
  date: Date | string,
  unavailabilities: ScheduleUnavailability[] = []
): ScheduleUnavailability[] => {
  const targetStr = toDateString(date);
  if (!targetStr) return [];

  return unavailabilities.filter((item) => {
    if (item.type !== 'TIME_SLOT') return false;
    const startStr = normalizeIsoDate(item.startDate);
    const endStr = normalizeIsoDate(item.endDate || item.startDate);
    return targetStr >= startStr && targetStr <= endStr;
  });
};

export const timeToMinutes = (timeStr?: string): number => {
  if (!timeStr) return 0;
  const parts = timeStr.trim().split(':');
  if (parts.length < 2) return 0;
  const hours = parseInt(parts[0], 10) || 0;
  const minutes = parseInt(parts[1], 10) || 0;
  return hours * 60 + minutes;
};

export const minutesToTime = (minutes: number): string => {
  const total = ((minutes % 1440) + 1440) % 1440;
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
};

export const isTimeIntervalOverlapping = (
  startA: number,
  endA: number,
  startB: number,
  endB: number
): boolean => {
  return Math.max(startA, startB) < Math.min(endA, endB);
};

export interface TimeSlotConflict {
  hasConflict: boolean;
  reason?: string;
  item?: ScheduleUnavailability;
  conflictSlot?: string;
  slotStartTime?: string;
  slotEndTime?: string;
}

export const checkTimeSlotConflict = (
  date: Date | string,
  time: string,
  durationMinutes: number = 60,
  unavailabilities: ScheduleUnavailability[] = []
): TimeSlotConflict => {
  if (!time) return { hasConflict: false };
  const targetStr = toDateString(date);
  if (!targetStr) return { hasConflict: false };

  const apptStart = timeToMinutes(time);
  const effectiveDuration = Math.max(1, durationMinutes || 60);
  const apptEnd = apptStart + effectiveDuration;

  const daySlotBlocks = getTimeSlotBlocksForDate(targetStr, unavailabilities);

  for (const item of daySlotBlocks) {
    if (!item.startTime || !item.endTime) continue;
    const blockStart = timeToMinutes(item.startTime);
    const blockEnd = timeToMinutes(item.endTime);

    if (isTimeIntervalOverlapping(apptStart, apptEnd, blockStart, blockEnd)) {
      return {
        hasConflict: true,
        reason: item.reason || 'Horario bloqueado',
        item,
        conflictSlot: `${item.startTime} a ${item.endTime} hrs`,
        slotStartTime: item.startTime,
        slotEndTime: item.endTime,
      };
    }
  }

  return { hasConflict: false };
};
