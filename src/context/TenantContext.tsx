import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { TenantInfo, DEFAULT_TENANT } from '../types/tenant.types';
import { tenantApi } from '../api/tenant.api';

interface TenantContextValue {
  tenant: TenantInfo;
  loading: boolean;
  refreshTenant: () => Promise<void>;
}

const TenantContext = createContext<TenantContextValue>({
  tenant: DEFAULT_TENANT,
  loading: false,
  refreshTenant: async () => {},
});

export const TenantProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [tenant, setTenant] = useState<TenantInfo>(DEFAULT_TENANT);
  const [loading, setLoading] = useState(true);

  const applyBranding = useCallback((tenantData: TenantInfo) => {
    if (tenantData.name) {
      document.title = `${tenantData.name} | Agendamiento & Salón`;
    }

    if (tenantData.primaryColor) {
      document.documentElement.style.setProperty('--primary-color', tenantData.primaryColor);
      document.documentElement.style.setProperty('--bs-primary', tenantData.primaryColor);
    }
  }, []);

  const refreshTenant = useCallback(async () => {
    try {
      const hostname = typeof window !== 'undefined' ? window.location.hostname : undefined;
      const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
      const slug = urlParams?.get('salon') || undefined;

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
  }, [refreshTenant]);

  return (
    <TenantContext.Provider value={{ tenant, loading, refreshTenant }}>
      {children}
    </TenantContext.Provider>
  );
};

export const useTenant = () => useContext(TenantContext);
