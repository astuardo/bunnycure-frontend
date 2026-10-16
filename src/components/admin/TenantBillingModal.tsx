import { useCallback, useEffect, useState } from 'react';
import { billingApi } from '../../api/billing.api';
import { useToast } from '../../hooks/useToast';
import { Alert, Badge, Button, Input, Modal, Spinner } from '../ui';
import {
  BillingCycle,
  PlanCode,
  SUBSCRIPTION_STATUS_LABELS,
  SubscriptionInfo,
  SubscriptionPayment,
  SubscriptionStatus,
  formatClp,
} from '../../types/billing.types';

interface TenantBillingModalProps {
  tenantId: number;
  tenantName: string;
  onHide: () => void;
}

const PLAN_OPTIONS: { code: PlanCode; name: string }[] = [
  { code: 'STANDARD', name: 'Emprendedora' },
  { code: 'PRO', name: 'Studio Pro' },
  { code: 'VIP', name: 'Franquicias' },
];

/** Consola de plataforma: estado de la suscripción de un salón, pagos manuales y ajustes. */
export function TenantBillingModal({ tenantId, tenantName, onHide }: TenantBillingModalProps) {
  const toast = useToast();
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [payments, setPayments] = useState<SubscriptionPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [payPlan, setPayPlan] = useState<PlanCode>('PRO');
  const [payCycle, setPayCycle] = useState<BillingCycle>('MONTHLY');
  const [payAmount, setPayAmount] = useState('');
  const [payReference, setPayReference] = useState('');

  const [newStatus, setNewStatus] = useState<SubscriptionStatus | ''>('');
  const [newPeriodEnd, setNewPeriodEnd] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [sub, pays] = await Promise.all([billingApi.getTenantSubscription(tenantId), billingApi.getTenantPayments(tenantId)]);
      setSubscription(sub);
      setPayments(pays);
      setPayPlan(sub.plan);
      setPayCycle(sub.billingCycle);
    } catch {
      toast.error('No se pudo cargar la suscripción del salón');
    } finally {
      setLoading(false);
    }
  }, [tenantId, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const registerPayment = async () => {
    setSaving(true);
    try {
      const payment = await billingApi.registerManualPayment(tenantId, {
        plan: payPlan,
        billingCycle: payCycle,
        amountClp: payAmount ? Number(payAmount) : undefined,
        reference: payReference || undefined,
      });
      toast.success(`Pago registrado: activo hasta el ${new Date(`${payment.periodEnd}T12:00:00`).toLocaleDateString('es-CL')}`);
      setPayAmount('');
      setPayReference('');
      await load();
    } catch {
      toast.error('No se pudo registrar el pago');
    } finally {
      setSaving(false);
    }
  };

  const applyAdjustment = async () => {
    if (!newStatus && !newPeriodEnd) return;
    setSaving(true);
    try {
      setSubscription(
        await billingApi.updateTenantSubscription(tenantId, {
          status: newStatus || undefined,
          currentPeriodEnd: newPeriodEnd || undefined,
        })
      );
      setNewStatus('');
      setNewPeriodEnd('');
      toast.success('Suscripción actualizada');
    } catch {
      toast.error('No se pudo actualizar la suscripción');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal show onHide={onHide} size="lg">
      <Modal.Header closeButton>
        <Modal.Title>Suscripción · {tenantName}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {loading || !subscription ? (
          <div className="flex justify-center p-6"><Spinner /></div>
        ) : (
          <div className="space-y-5 text-sm">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div><div className="text-xs text-gray-500">Plan</div><div className="font-semibold">{subscription.planName}</div></div>
              <div><div className="text-xs text-gray-500">Estado</div><Badge pill>{SUBSCRIPTION_STATUS_LABELS[subscription.status]}</Badge></div>
              <div>
                <div className="text-xs text-gray-500">{subscription.status === 'TRIALING' ? 'Prueba hasta' : 'Pagado hasta'}</div>
                <div className="font-semibold">{(subscription.status === 'TRIALING' ? subscription.trialEndsOn : subscription.currentPeriodEnd) ?? 'Sin vencimiento'}</div>
              </div>
              <div><div className="text-xs text-gray-500">Puestos</div><div className="font-semibold">{subscription.usedStaffSeats} / {subscription.maxStaffSeats ?? '∞'}</div></div>
            </div>

            <section className="border rounded-xl p-3 space-y-3">
              <h3 className="font-semibold">Registrar pago manual</h3>
              <div className="grid grid-cols-2 gap-3">
                <label className="text-xs">Plan
                  <select className="block w-full border rounded-lg p-2 mt-1" value={payPlan} onChange={(e) => setPayPlan(e.target.value as PlanCode)}>
                    {PLAN_OPTIONS.map((p) => <option key={p.code} value={p.code}>{p.name}</option>)}
                  </select>
                </label>
                <label className="text-xs">Ciclo
                  <select className="block w-full border rounded-lg p-2 mt-1" value={payCycle} onChange={(e) => setPayCycle(e.target.value as BillingCycle)}>
                    <option value="MONTHLY">Mensual</option>
                    <option value="ANNUAL">Anual</option>
                  </select>
                </label>
                <Input name="amountClp" label="Monto CLP (vacío = precio de lista)" type="number" min={1} value={payAmount} onChange={(e) => setPayAmount(e.target.value)} />
                <Input name="reference" label="Referencia (n° transferencia)" value={payReference} maxLength={200} onChange={(e) => setPayReference(e.target.value)} />
              </div>
              <p className="text-xs text-gray-500">
                Activa el salón y extiende su período. Si aún no vence, el nuevo período empieza al día siguiente del actual.
              </p>
              <Button onClick={registerPayment} isLoading={saving}>Registrar pago</Button>
            </section>

            <section className="border rounded-xl p-3 space-y-3">
              <h3 className="font-semibold">Ajuste manual</h3>
              <div className="grid grid-cols-2 gap-3">
                <label className="text-xs">Estado
                  <select className="block w-full border rounded-lg p-2 mt-1" value={newStatus} onChange={(e) => setNewStatus(e.target.value as SubscriptionStatus | '')}>
                    <option value="">(sin cambio)</option>
                    {(Object.keys(SUBSCRIPTION_STATUS_LABELS) as SubscriptionStatus[]).map((s) => (
                      <option key={s} value={s}>{SUBSCRIPTION_STATUS_LABELS[s]}</option>
                    ))}
                  </select>
                </label>
                <Input name="currentPeriodEnd" label="Pagado hasta" type="date" value={newPeriodEnd} onChange={(e) => setNewPeriodEnd(e.target.value)} />
              </div>
              <Button variant="secondary" onClick={applyAdjustment} isLoading={saving} disabled={!newStatus && !newPeriodEnd}>
                Aplicar ajuste
              </Button>
            </section>

            <section>
              <h3 className="font-semibold mb-2">Pagos</h3>
              {payments.length === 0 ? (
                <Alert variant="info">Sin pagos registrados.</Alert>
              ) : (
                <ul className="divide-y border rounded-xl">
                  {payments.map((p) => (
                    <li key={p.id} className="p-2 flex justify-between gap-2">
                      <span>{p.periodStart} → {p.periodEnd} · {p.plan} {p.billingCycle === 'ANNUAL' ? 'anual' : 'mensual'} · {p.provider}{p.reference ? ` · ${p.reference}` : ''}</span>
                      <span className="font-semibold">{formatClp(p.amountClp)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        )}
      </Modal.Body>
    </Modal>
  );
}
