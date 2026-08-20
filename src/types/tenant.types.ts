export interface TenantInfo {
  id: number;
  name: string;
  slug: string;
  customDomain?: string;
  phone?: string;
  email?: string;
  address?: string;
  logoUrl?: string;
  primaryColor?: string;
  active: boolean;
  planTier: string;
}

export const DEFAULT_TENANT: TenantInfo = {
  id: 1,
  name: 'BunnyCure Studio',
  slug: 'bunnycure',
  customDomain: 'app.bunnycure.cl',
  phone: '+56983692046',
  email: 'contacto@bunnycure.cl',
  address: 'Santiago, Chile',
  logoUrl: '/images/logo.png',
  primaryColor: '#d48b70',
  active: true,
  planTier: 'PRO',
};
