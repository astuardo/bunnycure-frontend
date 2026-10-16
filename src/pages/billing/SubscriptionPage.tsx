import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import DashboardLayout from '../../components/common/DashboardLayout';
import { Alert, Badge, BadgeVariant, Button, Spinner } from '../../components/ui';
import { billingApi } from '../../api/billing.api';
import {
  BillingCycle,
  Plan,
  PlanCode,
  SUBSCRIPTION_STATUS_LABELS,
  SubscriptionInfo,
  SubscriptionPayment,
  SubscriptionStatus,
  formatClp,
} from '../../types/billing.types';

const STATUS_VARIANT: Record<SubscriptionStatus, BadgeVariant> = {
  PENDING_VERIFICATION: 'neutral',
  TRIALING: 'info',
  ACTIVE: 'success',
  PAST_DUE: 'warning',
  SUSPENDED: 'danger',
  CANCELED: 'neutral',
};

const formatDate = (iso: string | null) =>
  iso ? new Date(`${iso}T12:00:00`).toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' }) : '—';

/** "Mi suscripción": plan, estado, límites, cambio de plan y pagos del salón. */
export default function SubscriptionPage() {
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [payments, setPayments] = useState<SubscriptionPayment[]>([]);
  const [cycle, setCycle] = useState<BillingCycle>('MONTHLY');
  const [selectedPlan, setSelectedPlan] = useState<PlanCode | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([billingApi.getSubscription(), billingApi.getPlans(), billingApi.getPayments()])
      .then(([sub, planList, paymentList]) => {
        setSubscription(sub);
        setPlans(planList);
        setPayments(paymentList);
        setCycle(sub.billingCycle);
      })
      .catch(() => setLoadError('No pudimos cargar la información de tu suscripción. Intenta nuevamente.'))
      .finally(() => setLoading(false));
  }, []);

  const handleChoosePlan = async (plan: PlanCode) => {
    setSelectedPlan(plan);
    if (!subscription?.onlinePaymentEnabled) {
      return; // se muestran las instrucciones de pago manual
    }
    setCheckoutLoading(true);
    try {
      window.location.href = await billingApi.startCheckout(plan, cycle);
    } catch {
      toast.error('No pudimos iniciar el pago en línea. Usa las instrucciones de pago manual.');
      setCheckoutLoading(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex justify-center p-10"><Spinner size="lg" /></div>
      </DashboardLayout>
    );
  }

  if (loadError || !subscription) {
    return (
      <DashboardLayout>
        <div className="p-4 max-w-3xl mx-auto"><Alert variant="danger">{loadError}</Alert></div>
      </DashboardLayout>
    );
  }

  const status = subscription.status;

  return (
    <DashboardLayout>
      <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
        <header>
          <h1 className="text-2xl font-bold text-bunny-cocoa">Mi suscripción</h1>
          <p className="text-sm text-bunny-text-muted">Plan, pagos y límites de tu salón.</p>
        </header>

        {status === 'SUSPENDED' && (
          <Alert variant="danger" title="Tu salón está suspendido">
            No registramos el pago del último período. Tus datos están a salvo: regulariza el pago para reactivar el acceso de tu equipo.
          </Alert>
        )}
        {status === 'PAST_DUE' && (
          <Alert variant="warning" title="Pago vencido">
            Tu período terminó el {formatDate(subscription.currentPeriodEnd || subscription.trialEndsOn)}. Tienes hasta el{' '}
            {formatDate(subscription.graceEndsOn)} para pagar antes de que se suspenda el acceso.
          </Alert>
        )}
        {status === 'TRIALING' && (
          <Alert variant="info" title="Prueba gratuita">
            Tu prueba termina el {formatDate(subscription.trialEndsOn)}. Elige un plan para seguir usando la plataforma sin interrupciones.
          </Alert>
        )}

        <section className="bg-white rounded-2xl border border-bunny-border p-5 grid gap-4 md:grid-cols-4">
          <div>
            <div className="text-xs text-bunny-text-muted">Plan</div>
            <div className="text-lg font-bold text-bunny-cocoa">{subscription.planName}</div>
          </div>
          <div>
            <div className="text-xs text-bunny-text-muted">Estado</div>
            <Badge variant={STATUS_VARIANT[status]} pill>{SUBSCRIPTION_STATUS_LABELS[status]}</Badge>
          </div>
          <div>
            <div className="text-xs text-bunny-text-muted">{status === 'TRIALING' ? 'Prueba hasta' : 'Pagado hasta'}</div>
            <div className="font-semibold text-bunny-cocoa">
              {status === 'TRIALING'
                ? formatDate(subscription.trialEndsOn)
                : subscription.currentPeriodEnd ? formatDate(subscription.currentPeriodEnd) : 'Sin vencimiento'}
            </div>
          </div>
          <div>
            <div className="text-xs text-bunny-text-muted">Especialistas y recepcionistas</div>
            <div className="font-semibold text-bunny-cocoa">
              {subscription.usedStaffSeats} / {subscription.maxStaffSeats ?? 'ilimitadas'}
            </div>
          </div>
        </section>

        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-bunny-cocoa">Planes</h2>
            <div className="inline-flex rounded-full border border-bunny-border bg-white p-1 text-xs font-semibold" role="group" aria-label="Ciclo de facturación">
              {(['MONTHLY', 'ANNUAL'] as BillingCycle[]).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCycle(c)}
                  aria-pressed={cycle === c}
                  className={`px-4 py-1.5 rounded-full ${cycle === c ? 'bg-bunny-primary text-white' : 'text-bunny-cocoa'}`}
                >
                  {c === 'MONTHLY' ? 'Mensual' : `Anual (-${plans[0]?.annualDiscountPercent ?? 20}%)`}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {plans.map((plan) => {
              const isCurrent = plan.code === subscription.plan;
              const price = cycle === 'ANNUAL' ? plan.annualPriceClp : plan.monthlyPriceClp;
              return (
                <div
                  key={plan.code}
                  className={`bg-white rounded-2xl border p-5 flex flex-col ${isCurrent ? 'border-bunny-primary ring-1 ring-bunny-primary' : 'border-bunny-border'}`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-bold text-bunny-cocoa">{plan.name}</h3>
                    {isCurrent && <Badge variant="primary" pill>Tu plan</Badge>}
                  </div>
                  <div className="text-2xl font-bold text-bunny-cocoa">
                    {formatClp(price)}
                    <span className="text-xs font-normal text-bunny-text-muted"> CLP / {cycle === 'ANNUAL' ? 'año' : 'mes'}</span>
                  </div>
                  <div className="text-xs text-bunny-text-muted mb-3">
                    {plan.maxStaffSeats ? `Hasta ${plan.maxStaffSeats} especialistas o recepcionistas` : 'Equipo ilimitado'}
                  </div>
                  <ul className="text-sm space-y-1 mb-4 flex-1">
                    {plan.features.map((f) => (
                      <li key={f.code} className={f.included ? 'text-bunny-cocoa' : 'text-bunny-text-muted line-through'}>
                        {f.included ? '✓' : '✕'} {f.name}
                      </li>
                    ))}
                  </ul>
                  <Button
                    variant={isCurrent ? 'secondary' : 'primary'}
                    isLoading={checkoutLoading && selectedPlan === plan.code}
                    onClick={() => handleChoosePlan(plan.code)}
                  >
                    {isCurrent ? 'Renovar este plan' : `Cambiar a ${plan.name}`}
                  </Button>
                </div>
              );
            })}
          </div>

          {selectedPlan && !subscription.onlinePaymentEnabled && (
            <Alert variant="info" title={`Pago del plan ${plans.find((p) => p.code === selectedPlan)?.name ?? selectedPlan}`}>
              <p className="whitespace-pre-line">{subscription.manualPaymentInstructions}</p>
              <p className="mt-2 text-xs">
                Indica el nombre de tu salón y el plan ({cycle === 'ANNUAL' ? 'anual' : 'mensual'}). Activaremos tu plan al confirmar el pago.
              </p>
            </Alert>
          )}
        </section>

        <section className="bg-white rounded-2xl border border-bunny-border p-5">
          <h2 className="text-lg font-bold text-bunny-cocoa mb-3">Pagos</h2>
          {payments.length === 0 ? (
            <p className="text-sm text-bunny-text-muted">Aún no hay pagos registrados.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-bunny-text-muted border-b border-bunny-border">
                    <th className="py-2 pr-3">Fecha</th>
                    <th className="py-2 pr-3">Plan</th>
                    <th className="py-2 pr-3">Período</th>
                    <th className="py-2 pr-3 text-right">Monto</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((p) => (
                    <tr key={p.id} className="border-b border-bunny-border/50 last:border-0">
                      <td className="py-2 pr-3">{new Date(p.paidAt).toLocaleDateString('es-CL')}</td>
                      <td className="py-2 pr-3">{plans.find((pl) => pl.code === p.plan)?.name ?? p.plan} ({p.billingCycle === 'ANNUAL' ? 'anual' : 'mensual'})</td>
                      <td className="py-2 pr-3">{formatDate(p.periodStart)} – {formatDate(p.periodEnd)}</td>
                      <td className="py-2 pr-3 text-right font-semibold">{formatClp(p.amountClp)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </DashboardLayout>
  );
}
