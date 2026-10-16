import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { usePlanFeatures } from '../../hooks/usePlanFeatures';
import { isSalonAdmin } from '../../types/user.types';

/** Aviso para administradoras cuando el salón está en prueba gratuita o con el pago vencido. */
export default function SubscriptionBanner() {
  const { user } = useAuth();
  const { subscriptionStatus } = usePlanFeatures();
  const location = useLocation();

  if (!isSalonAdmin(user?.role) || location.pathname.startsWith('/suscripcion')) {
    return null;
  }

  if (subscriptionStatus === 'PAST_DUE') {
    return (
      <div role="status" className="bg-amber-100 text-amber-900 text-sm px-4 py-2 flex flex-wrap items-center justify-between gap-2">
        <span>⚠️ El pago de tu suscripción está vencido. Regularízalo para que tu equipo no pierda el acceso.</span>
        <Link to="/suscripcion" className="font-semibold underline">Pagar ahora</Link>
      </div>
    );
  }

  if (subscriptionStatus === 'TRIALING') {
    return (
      <div role="status" className="bg-bunny-blush text-bunny-cocoa text-sm px-4 py-2 flex flex-wrap items-center justify-between gap-2">
        <span>✨ Estás en tu prueba gratuita.</span>
        <Link to="/suscripcion" className="font-semibold underline">Ver planes</Link>
      </div>
    );
  }

  return null;
}
