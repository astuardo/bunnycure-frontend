import { ReactNode } from 'react';
import { PlanFeature } from '../../types/billing.types';
import { usePlanFeatures } from '../../hooks/usePlanFeatures';
import DashboardLayout from '../common/DashboardLayout';
import UpgradePrompt from './UpgradePrompt';

interface PlanFeatureGateProps {
  feature: PlanFeature;
  children: ReactNode;
}

/**
 * Muestra la página solo si el plan del salón incluye la funcionalidad; si no, la invitación
 * a mejorar el plan dentro del layout (las páginas traen su propio DashboardLayout).
 * El backend aplica igualmente el plan (HTTP 402).
 */
export default function PlanFeatureGate({ feature, children }: PlanFeatureGateProps) {
  const { hasFeature } = usePlanFeatures();
  if (hasFeature(feature)) {
    return <>{children}</>;
  }
  return (
    <DashboardLayout>
      <div className="p-4">
        <UpgradePrompt feature={feature} />
      </div>
    </DashboardLayout>
  );
}
