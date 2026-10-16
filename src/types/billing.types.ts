/**
 * Planes, suscripción y registro autoservicio.
 * Coinciden con BillingDtos del backend (cl.bunnycure.web.dto.billing).
 */

export type PlanCode = 'STANDARD' | 'PRO' | 'VIP';
export type BillingCycle = 'MONTHLY' | 'ANNUAL';
export type SubscriptionStatus =
  | 'PENDING_VERIFICATION'
  | 'TRIALING'
  | 'ACTIVE'
  | 'PAST_DUE'
  | 'SUSPENDED'
  | 'CANCELED';

export type PlanFeature =
  | 'WHATSAPP_AUTOMATION'
  | 'SII_INVOICING'
  | 'WALLET_PASSES'
  | 'GIFT_CARDS'
  | 'INVENTORY'
  | 'COMMISSIONS'
  | 'MARKETING_CAMPAIGNS'
  | 'MULTI_LOCATION'
  | 'CUSTOM_DOMAIN';

export interface PlanFeatureItem {
  code: PlanFeature;
  name: string;
  included: boolean;
}

export interface Plan {
  code: PlanCode;
  name: string;
  monthlyPriceClp: number;
  annualPriceClp: number;
  annualDiscountPercent: number;
  /** null = ilimitado */
  maxStaffSeats: number | null;
  features: PlanFeatureItem[];
}

export interface SubscriptionInfo {
  plan: PlanCode;
  planName: string;
  status: SubscriptionStatus;
  billingCycle: BillingCycle;
  periodPriceClp: number;
  trialEndsOn: string | null;
  currentPeriodEnd: string | null;
  graceEndsOn: string | null;
  maxStaffSeats: number | null;
  usedStaffSeats: number;
  features: PlanFeatureItem[];
  paymentProvider: 'MANUAL' | 'MERCADO_PAGO';
  onlinePaymentEnabled: boolean;
  manualPaymentInstructions: string;
}

export interface SubscriptionPayment {
  id: number;
  amountClp: number;
  plan: PlanCode;
  billingCycle: BillingCycle;
  periodStart: string;
  periodEnd: string;
  provider: 'MANUAL' | 'MERCADO_PAGO';
  reference: string | null;
  paidAt: string;
}

export interface SignupRequest {
  salonName: string;
  ownerName: string;
  email: string;
  phone?: string;
  password: string;
  plan: PlanCode;
  slug?: string;
  acceptTerms: boolean;
  /** Honeypot anti-bots: siempre vacío para personas. */
  website: string;
}

export interface SignupResponse {
  slug: string | null;
  email: string;
  message: string;
}

export interface VerifyEmailResponse {
  slug: string;
  loginUrl: string;
  trialEndsOn: string | null;
}

export interface ManualPaymentRequest {
  plan?: PlanCode;
  billingCycle: BillingCycle;
  amountClp?: number;
  reference?: string;
}

export interface SubscriptionUpdateRequest {
  plan?: PlanCode;
  billingCycle?: BillingCycle;
  status?: SubscriptionStatus;
  currentPeriodEnd?: string;
  trialEndsOn?: string;
}

export const SUBSCRIPTION_STATUS_LABELS: Record<SubscriptionStatus, string> = {
  PENDING_VERIFICATION: 'Pendiente de verificación',
  TRIALING: 'Prueba gratuita',
  ACTIVE: 'Activa',
  PAST_DUE: 'Pago vencido',
  SUSPENDED: 'Suspendida',
  CANCELED: 'Cancelada',
};

export const formatClp = (amount: number): string => `$${Math.round(amount).toLocaleString('es-CL')}`;
