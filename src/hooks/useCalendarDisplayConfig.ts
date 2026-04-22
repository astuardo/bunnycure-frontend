import { useEffect, useState } from 'react';
import { settingsApi } from '@/api/settings.api';
import {
  CalendarDisplayConfig,
  DEFAULT_CALENDAR_DISPLAY_CONFIG,
  getCalendarDisplayConfig,
} from '@/utils/calendarDisplay';

export function useCalendarDisplayConfig() {
  const [config, setConfig] = useState<CalendarDisplayConfig>(DEFAULT_CALENDAR_DISPLAY_CONFIG);

  useEffect(() => {
    const load = async () => {
      try {
        const settings = await settingsApi.getAll();
        setConfig(getCalendarDisplayConfig(settings));
      } catch (error) {
        console.warn('No se pudo cargar configuración de colores del calendario:', error);
      }
    };

    load();
  }, []);

  return config;
}
