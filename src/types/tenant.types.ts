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
  secondaryColor?: string;
  slogan?: string;
  whatsappNumber?: string;
  instagramHandle?: string;
  bookingEnabled?: boolean;
  morningBlock?: string;
  afternoonBlock?: string;
  nightBlock?: string;
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
  secondaryColor: '#6B4C38',
  slogan: 'Arte en tus manos ✨',
  whatsappNumber: '+56988873031',
  instagramHandle: '@bunny.cure',
  bookingEnabled: true,
  morningBlock: '09:00 – 13:00',
  afternoonBlock: '15:00 – 18:00',
  nightBlock: '19:00 – 22:00',
  active: true,
  planTier: 'PRO',
};

export interface TenantAdmin {
  id: number;
  name: string;
  slug: string;
  customDomain?: string | null;
  rut?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  logoUrl?: string | null;
  primaryColor?: string | null;
  active: boolean;
  planTier: string;
  whatsappPhoneId?: string | null;
  createdAt: string;
  updatedAt: string;
  userCount: number;
  appointmentCount: number;
  customerCount: number;
}

export interface TenantSummary {
  id: number;
  name: string;
  slug: string;
  customDomain?: string | null;
  active: boolean;
  planTier: string;
  primaryColor?: string | null;
  logoUrl?: string | null;
}

export interface TenantCreateFormData {
  name: string;
  slug: string;
  customDomain?: string;
  rut?: string;
  phone?: string;
  email?: string;
  address?: string;
  logoUrl?: string;
  primaryColor?: string;
  planTier?: string;
  whatsappPhoneId?: string;
  whatsappToken?: string;
  initialAdminUsername?: string;
  initialAdminPassword?: string;
  initialAdminFullName?: string;
  initialAdminEmail?: string;
}

export interface TenantUpdateFormData {
  name: string;
  customDomain?: string;
  rut?: string;
  phone?: string;
  email?: string;
  address?: string;
  logoUrl?: string;
  primaryColor?: string;
  planTier?: string;
  whatsappPhoneId?: string;
  whatsappToken?: string;
  active?: boolean;
}

