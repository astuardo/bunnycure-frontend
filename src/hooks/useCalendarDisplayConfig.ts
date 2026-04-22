import { useEffect, useState } from 'react';
import { settingsApi } from '@/api/settings.api';
import {
  CALENDAR_DISPLAY_STORAGE_KEY,
  CalendarDisplayConfig,
  DEFAULT_CALENDAR_DISPLAY_CONFIG,
  getCalendarDisplayConfig,
} from '@/utils/calendarDisplay';

export function useCalendarDisplayConfig() {
  const [config, setConfig] = useState<CalendarDisplayConfig>(DEFAULT_CALENDAR_DISPLAY_CONFIG);

  useEffect(() => {
    const load = async () => {
      try {
        const localValue = localStorage.getItem(CALENDAR_DISPLAY_STORAGE_KEY);
        if (localValue) {
          const parsed = JSON.parse(localValue) as CalendarDisplayConfig;
          setConfig({
            morning: { ...DEFAULT_CALENDAR_DISPLAY_CONFIG.morning, ...parsed.morning },
            afternoon: { ...DEFAULT_CALENDAR_DISPLAY_CONFIG.afternoon, ...parsed.afternoon },
            night: { ...DEFAULT_CALENDAR_DISPLAY_CONFIG.night, ...parsed.night },
          });
        }
      } catch (error) {
        console.warn('No se pudo leer configuración local del calendario:', error);
      }

      try {
        const settings = await settingsApi.getAll();
        const fromServer = getCalendarDisplayConfig(settings);
        const localValue = localStorage.getItem(CALENDAR_DISPLAY_STORAGE_KEY);
        if (!localValue) {
          setConfig(fromServer);
        }
      } catch (error) {
        console.warn('No se pudo cargar configuración de colores del calendario:', error);
      }
    };

    load();
  }, []);

  return config;
}
