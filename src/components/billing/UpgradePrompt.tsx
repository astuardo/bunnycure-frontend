import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { isSalonAdmin } from '../../types/user.types';
import { PlanFeature } from '../../types/billing.types';
import { FEATURE_MIN_PLAN, usePlanFeatures } from '../../hooks/usePlanFeatures';

const FEATURE_COPY: Record<PlanFeature, { title: string; pitch: string }> = {
  WHATSAPP_AUTOMATION: { title: 'WhatsApp automático', pitch: 'Confirma y recuerda citas por WhatsApp sin intervención manual.' },
  SII_INVOICING: { title: 'Boletas SII', pitch: 'Emite boletas de honorarios automáticamente al cerrar cada atención.' },
  WALLET_PASSES: { title: 'Tarjeta en Wallet', pitch: 'Tus clientas llevan su tarjeta de sellos en Apple y Google Wallet.' },
  GIFT_CARDS: { title: 'Gift cards', pitch: 'Vende gift cards digitales con PIN y canje por QR.' },
  INVENTORY: { title: 'Inventario', pitch: 'Controla insumos y descuenta stock automáticamente por servicio.' },
  COMMISSIONS: { title: 'Comisiones', pitch: 'Calcula la comisión de cada especialista sin planillas.' },
  MARKETING_CAMPAIGNS: { title: 'Campañas', pitch: 'Reactiva clientas con campañas segmentadas por WhatsApp.' },
  MULTI_LOCATION: { title: 'Sucursales', pitch: 'Administra varias sucursales desde una sola cuenta.' },
  CUSTOM_DOMAIN: { title: 'Dominio propio', pitch: 'Usa tu propio dominio .cl para reservas y tarjetas.' },
};

interface UpgradePromptProps {
  feature: PlanFeature;
}

/** Se muestra en lugar de una funcionalidad que el plan del salón no incluye. */
export default function UpgradePrompt({ feature }: UpgradePromptProps) {
  const { user } = useAuth();
  const { planName } = usePlanFeatures();
  const copy = FEATURE_COPY[feature];
  const required = FEATURE_MIN_PLAN[feature];
  const canManagePlan = isSalonAdmin(user?.role);

  return (
    <div className="max-w-xl mx-auto mt-10 bg-white rounded-2xl border border-bunny-border shadow-sm p-6 text-center">
      <div className="text-4xl mb-3" aria-hidden>🔒</div>
      <h1 className="text-xl font-bold text-bunny-cocoa mb-2">{copy.title} está disponible desde el plan {required.name}</h1>
      <p className="text-sm text-bunny-text-muted mb-1">{copy.pitch}</p>
      <p className="text-xs text-bunny-text-muted mb-6">Tu plan actual: {planName}</p>
      {canManagePlan ? (
        <Link
          to="/suscripcion"
          className="inline-block px-5 py-2.5 rounded-xl bg-bunny-primary text-white text-sm font-semibold hover:bg-bunny-primary-hover"
        >
          Ver planes y mejorar
        </Link>
      ) : (
        <p className="text-sm text-bunny-cocoa">Pídele a la administradora del salón que mejore el plan.</p>
      )}
    </div>
  );
}
