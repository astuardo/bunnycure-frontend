import apiClient from './client';
import { ApiResponse } from '../types/api.types';
import {
  ManualPaymentRequest,
  Plan,
  SignupRequest,
  SignupResponse,
  SubscriptionInfo,
  SubscriptionPayment,
  SubscriptionUpdateRequest,
  VerifyEmailResponse,
  BillingCycle,
  PlanCode,
} from '../types/billing.types';

const unwrap = <T,>(response: { data: ApiResponse<T> }): T => {
  if (!response.data.data) {
    throw new Error(response.data.error?.message || 'Respuesta vacía del servidor');
  }
  return response.data.data;
};

/** Planes, suscripción del salón y registro autoservicio. */
export const billingApi = {
  // ── Público ──────────────────────────────────────────────────────────
  getPlans: async (): Promise<Plan[]> =>
    unwrap(await apiClient.get<ApiResponse<Plan[]>>('/api/public/plans')),

  signup: async (request: SignupRequest): Promise<SignupResponse> =>
    unwrap(await apiClient.post<ApiResponse<SignupResponse>>('/api/public/signup', request)),

  verifyEmail: async (token: string): Promise<VerifyEmailResponse> =>
    unwrap(await apiClient.post<ApiResponse<VerifyEmailResponse>>('/api/public/signup/verify', { token })),

  resendVerification: async (email: string): Promise<void> => {
    await apiClient.post('/api/public/signup/resend', { email });
  },

  isSlugAvailable: async (slug: string): Promise<boolean> =>
    unwrap(
      await apiClient.get<ApiResponse<{ slug: string; available: boolean }>>('/api/public/signup/slug-available', {
        params: { slug },
      })
    ).available,

  // ── Administradora del salón ─────────────────────────────────────────
  getSubscription: async (): Promise<SubscriptionInfo> =>
    unwrap(await apiClient.get<ApiResponse<SubscriptionInfo>>('/api/billing/subscription')),

  getPayments: async (): Promise<SubscriptionPayment[]> =>
    unwrap(await apiClient.get<ApiResponse<SubscriptionPayment[]>>('/api/billing/payments')),

  startCheckout: async (plan: PlanCode, billingCycle: BillingCycle): Promise<string> =>
    unwrap(
      await apiClient.post<ApiResponse<{ checkoutUrl: string }>>('/api/billing/checkout', { plan, billingCycle })
    ).checkoutUrl,

  // ── Consola de plataforma ────────────────────────────────────────────
  getTenantSubscription: async (tenantId: number): Promise<SubscriptionInfo> =>
    unwrap(await apiClient.get<ApiResponse<SubscriptionInfo>>(`/api/admin/tenants/${tenantId}/billing`)),

  getTenantPayments: async (tenantId: number): Promise<SubscriptionPayment[]> =>
    unwrap(await apiClient.get<ApiResponse<SubscriptionPayment[]>>(`/api/admin/tenants/${tenantId}/billing/payments`)),

  registerManualPayment: async (tenantId: number, request: ManualPaymentRequest): Promise<SubscriptionPayment> =>
    unwrap(
      await apiClient.post<ApiResponse<SubscriptionPayment>>(`/api/admin/tenants/${tenantId}/billing/payments`, request)
    ),

  updateTenantSubscription: async (tenantId: number, request: SubscriptionUpdateRequest): Promise<SubscriptionInfo> =>
    unwrap(await apiClient.patch<ApiResponse<SubscriptionInfo>>(`/api/admin/tenants/${tenantId}/billing`, request)),
};
