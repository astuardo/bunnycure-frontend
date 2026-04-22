import { Appointment } from '@/types/appointment.types';
import { SettingsData } from '@/api/settings.api';

export interface CalendarSlotConfig {
  start: string;
  end: string;
  color: string;
}

export interface CalendarDisplayConfig {
  morning: CalendarSlotConfig;
  afternoon: CalendarSlotConfig;
  night: CalendarSlotConfig;
}

export const CALENDAR_DISPLAY_STORAGE_KEY = 'calendar-display-config';

export const DEFAULT_CALENDAR_DISPLAY_CONFIG: CalendarDisplayConfig = {
  morning: { start: '07:00', end: '13:00', color: '#10b981' },
  afternoon: { start: '14:00', end: '19:00', color: '#00a6d6' },
  night: { start: '19:00', end: '23:00', color: '#0047ab' },
};

const parseMinutes = (time: string): number | null => {
  const normalized = time?.slice(0, 5);
  if (!normalized || !/^\d{2}:\d{2}$/.test(normalized)) return null;
  const [h, m] = normalized.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m) || h < 0 || h > 23 || m < 0 || m > 59) return null;
  return h * 60 + m;
};

const isWithinRange = (target: number, start: number, end: number): boolean => {
  if (start <= end) return target >= start && target < end;
  return target >= start || target < end;
};

const resolveSlotColor = (time: string, config: CalendarDisplayConfig): string => {
  const minutes = parseMinutes(time);
  if (minutes === null) return config.afternoon.color;

  const morningStart = parseMinutes(config.morning.start) ?? parseMinutes(DEFAULT_CALENDAR_DISPLAY_CONFIG.morning.start)!;
  const morningEnd = parseMinutes(config.morning.end) ?? parseMinutes(DEFAULT_CALENDAR_DISPLAY_CONFIG.morning.end)!;
  if (isWithinRange(minutes, morningStart, morningEnd)) return config.morning.color;

  const afternoonStart = parseMinutes(config.afternoon.start) ?? parseMinutes(DEFAULT_CALENDAR_DISPLAY_CONFIG.afternoon.start)!;
  const afternoonEnd = parseMinutes(config.afternoon.end) ?? parseMinutes(DEFAULT_CALENDAR_DISPLAY_CONFIG.afternoon.end)!;
  if (isWithinRange(minutes, afternoonStart, afternoonEnd)) return config.afternoon.color;

  const nightStart = parseMinutes(config.night.start) ?? parseMinutes(DEFAULT_CALENDAR_DISPLAY_CONFIG.night.start)!;
  const nightEnd = parseMinutes(config.night.end) ?? parseMinutes(DEFAULT_CALENDAR_DISPLAY_CONFIG.night.end)!;
  if (isWithinRange(minutes, nightStart, nightEnd)) return config.night.color;

  return config.afternoon.color;
};

export const getCalendarDisplayConfig = (settings?: Partial<SettingsData>): CalendarDisplayConfig => ({
  morning: {
    start: settings?.calendarMorningStart || DEFAULT_CALENDAR_DISPLAY_CONFIG.morning.start,
    end: settings?.calendarMorningEnd || DEFAULT_CALENDAR_DISPLAY_CONFIG.morning.end,
    color: settings?.calendarMorningColor || DEFAULT_CALENDAR_DISPLAY_CONFIG.morning.color,
  },
  afternoon: {
    start: settings?.calendarAfternoonStart || DEFAULT_CALENDAR_DISPLAY_CONFIG.afternoon.start,
    end: settings?.calendarAfternoonEnd || DEFAULT_CALENDAR_DISPLAY_CONFIG.afternoon.end,
    color: settings?.calendarAfternoonColor || DEFAULT_CALENDAR_DISPLAY_CONFIG.afternoon.color,
  },
  night: {
    start: settings?.calendarNightStart || DEFAULT_CALENDAR_DISPLAY_CONFIG.night.start,
    end: settings?.calendarNightEnd || DEFAULT_CALENDAR_DISPLAY_CONFIG.night.end,
    color: settings?.calendarNightColor || DEFAULT_CALENDAR_DISPLAY_CONFIG.night.color,
  },
});

export const getDayDotColors = (
  appointments: Appointment[],
  config: CalendarDisplayConfig,
  maxDots: number = 6
): string[] => {
  if (appointments.length === 0) return [];

  const sorted = [...appointments].sort((a, b) => {
    const aMinutes = parseMinutes(a.appointmentTime) ?? Number.MAX_SAFE_INTEGER;
    const bMinutes = parseMinutes(b.appointmentTime) ?? Number.MAX_SAFE_INTEGER;
    return aMinutes - bMinutes;
  });
  return sorted.slice(0, maxDots).map((appointment) => resolveSlotColor(appointment.appointmentTime, config));
};
