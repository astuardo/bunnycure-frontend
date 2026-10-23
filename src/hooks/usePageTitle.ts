import { useEffect } from 'react';
import { useTenant } from '../context/TenantContext';

/** Título de la pestaña del navegador por pantalla: "Pantalla · Salón". */
export const usePageTitle = (title: string) => {
  const { tenant } = useTenant();

  useEffect(() => {
    document.title = tenant.name ? `${title} · ${tenant.name}` : title;
  }, [title, tenant.name]);
};
