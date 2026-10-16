import { useCallback } from 'react';
import { useTenant } from '../context/TenantContext';
import { PlanFeature } from '../types/billing.types';

/** Plan mínimo que incluye cada funcionalidad (igual que SubscriptionPlan en el backend). */
export const FEATURE_MIN_PLAN: Record<PlanFeature, { code: 'PRO' | 'VIP'; name: string }> = {
  WHATSAPP_AUTOMATION: { code: 'PRO', name: 'Studio Pro' },
  SII_INVOICING: { code: 'PRO', name: 'Studio Pro' },
  WALLET_PASSES: { code: 'PRO', name: 'Studio Pro' },
  GIFT_CARDS: { code: 'PRO', name: 'Studio Pro' },
  INVENTORY: { code: 'PRO', name: 'Studio Pro' },
  COMMISSIONS: { code: 'PRO', name: 'Studio Pro' },
  MARKETING_CAMPAIGNS: { code: 'PRO', name: 'Studio Pro' },
  MULTI_LOCATION: { code: 'VIP', name: 'Franquicias' },
  CUSTOM_DOMAIN: { code: 'VIP', name: 'Franquicias' },
};

/**
 * Funcionalidades del plan del salón actual (vienen en /api/public/tenant-info).
 * Si el backend no envía `features` (versión anterior), no se restringe nada en la interfaz:
 * el backend sigue siendo quien aplica el plan (HTTP 402).
 */
export const usePlanFeatures = () => {
  const { tenant } = useTenant();
  const features = tenant.features;

  const hasFeature = useCallback(
    (feature: PlanFeature) => (features === undefined ? true : features.includes(feature)),
    [features]
  );

  return {
    hasFeature,
    planCode: tenant.planTier,
    planName: tenant.planName || tenant.planTier,
    subscriptionStatus: tenant.subscriptionStatus,
  };
};
