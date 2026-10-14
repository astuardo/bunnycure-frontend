import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { TenantInfo, DEFAULT_TENANT } from '../types/tenant.types';
import { tenantApi } from '../api/tenant.api';
import { useAuthStore } from '../stores/authStore';

interface TenantContextValue {
  tenant: TenantInfo;
  loading: boolean;
  refreshTenant: (customSlug?: string) => Promise<void>;
}

const TenantContext = createContext<TenantContextValue>({
  tenant: DEFAULT_TENANT,
  loading: false,
  refreshTenant: async () => {},
});

export const TenantProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [tenant, setTenant] = useState<TenantInfo>(DEFAULT_TENANT);
  const [loading, setLoading] = useState(true);
  const user = useAuthStore((state) => state.user);

  const applyBranding = useCallback((tenantData: TenantInfo) => {
    if (typeof window !== 'undefined' && tenantData.slug) {
      try {
        sessionStorage.setItem('bunny_tenant_slug', tenantData.slug);
        if (tenantData.id) {
          sessionStorage.setItem('bunny_tenant_id', String(tenantData.id));
        }
      } catch {
        // Ignorar errores de storage
      }
    }

    if (tenantData.name) {
      document.title = `${tenantData.name} | Agendamiento & Salón`;
    }

    if (tenantData.primaryColor) {
      document.documentElement.style.setProperty('--tenant-primary', tenantData.primaryColor);
      document.documentElement.style.setProperty('--primary-color', tenantData.primaryColor);
      document.documentElement.style.setProperty('--bs-primary', tenantData.primaryColor);

      // Si es formato hex #rrggbb, extraer RGB para opacidades
      if (/^#[0-9A-Fa-f]{6}$/.test(tenantData.primaryColor)) {
        const r = parseInt(tenantData.primaryColor.slice(1, 3), 16);
        const g = parseInt(tenantData.primaryColor.slice(3, 5), 16);
        const b = parseInt(tenantData.primaryColor.slice(5, 7), 16);
        document.documentElement.style.setProperty('--tenant-primary-rgb', `${r}, ${g}, ${b}`);
        document.documentElement.style.setProperty('--bs-primary-rgb', `${r}, ${g}, ${b}`);
      }
    }
    if (tenantData.secondaryColor) {
      document.documentElement.style.setProperty('--tenant-secondary', tenantData.secondaryColor);
      document.documentElement.style.setProperty('--secondary-color', tenantData.secondaryColor);
      if (/^#[0-9A-Fa-f]{6}$/.test(tenantData.secondaryColor)) {
        const r = parseInt(tenantData.secondaryColor.slice(1, 3), 16);
        const g = parseInt(tenantData.secondaryColor.slice(3, 5), 16);
        const b = parseInt(tenantData.secondaryColor.slice(5, 7), 16);
        document.documentElement.style.setProperty('--tenant-secondary-rgb', `${r}, ${g}, ${b}`);
        document.documentElement.style.setProperty('--bs-secondary-rgb', `${r}, ${g}, ${b}`);
      }
    }
  }, []);

  const refreshTenant = useCallback(async (customSlug?: string) => {
    try {
      const hostname = typeof window !== 'undefined' ? window.location.hostname : undefined;
      const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
      const querySlug = urlParams?.get('salon') || urlParams?.get('tenant') || undefined;
      const authSlug = useAuthStore.getState().user?.tenantSlug || undefined;
      const slug = customSlug || querySlug || authSlug;

      const info = await tenantApi.getTenantInfo(hostname, slug);
      setTenant(info);
      applyBranding(info);
    } catch (err) {
      console.warn('Error loading tenant branding:', err);
    } finally {
      setLoading(false);
    }
  }, [applyBranding]);

  useEffect(() => {
    refreshTenant();
  }, [refreshTenant, user?.tenantSlug]);

  return (
    <TenantContext.Provider value={{ tenant, loading, refreshTenant }}>
      {children}
    </TenantContext.Provider>
  );
};

export const useTenant = () => useContext(TenantContext);

