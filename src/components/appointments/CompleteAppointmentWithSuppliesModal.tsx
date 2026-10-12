import React, { useEffect, useState } from 'react';
import { FiCheckCircle, FiAlertTriangle, FiPackage, FiFileText } from 'react-icons/fi';
import { inventoryApi } from '@/api/inventory.api';
import { appointmentsApi } from '@/api/appointments.api';
import { AppointmentSuppliesPreview } from '@/types/inventory.types';
import { Appointment } from '@/types/appointment.types';
import { useToast } from '@/hooks/useToast';
import { formatCurrencyCLP } from '@/utils/formatters';
import { formatRutWithDots } from '@/utils/rutUtils';
import { Modal, Button, Badge, Spinner, Alert } from '@/components/ui';

interface Props {
  show: boolean;
  appointmentId: number | null;
  onHide: () => void;
  onCompleted: () => void;
}

interface EditableItem {
  productId: number;
  productName: string;
  consumptionUnit: string;
  quantity: number;
  currentStock: number;
  unitConsumptionCost: number;
}

export const CompleteAppointmentWithSuppliesModal: React.FC<Props> = ({
  show,
  appointmentId,
  onHide,
  onCompleted,
}) => {
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [preview, setPreview] = useState<AppointmentSuppliesPreview | null>(null);
  const [appointmentData, setAppointmentData] = useState<Appointment | null>(null);
  const [items, setItems] = useState<EditableItem[]>([]);
  const [generateInvoice, setGenerateInvoice] = useState(true);
  const [deductSupplies, setDeductSupplies] = useState(true);
  const [invoiceQuotaInfo, setInvoiceQuotaInfo] = useState<string | null>(null);

  useEffect(() => {
    if (!show || !appointmentId) return;

    const loadData = async () => {
      setLoading(true);
      try {
        const [previewData, quota, aptData] = await Promise.all([
          inventoryApi.getAppointmentSuppliesPreview(appointmentId),
          appointmentsApi.getInvoiceQuota().catch(() => null),
          appointmentsApi.getById(appointmentId).catch(() => null),
        ]);

        setPreview(previewData);
        setAppointmentData(aptData);
        setItems(
          previewData.supplies.map((s) => ({
            productId: s.productId,
            productName: s.productName,
            consumptionUnit: s.consumptionUnit,
            quantity: s.suggestedQuantity,
            currentStock: s.currentStock,
            unitConsumptionCost: s.unitConsumptionCost,
          }))
        );

        if (quota) {
          setGenerateInvoice(quota.generateByDefault);
          setInvoiceQuotaInfo(`Boletas del mes: ${quota.generatedThisMonth}/${quota.monthlyLimit}`);
        }
      } catch (err) {
        console.error('Error loading supplies preview:', err);
        toast.error('Error al cargar datos de la cita');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [show, appointmentId]);

  const handleQuantityChange = (productId: number, newQty: number) => {
    setItems((prev) =>
      prev.map((item) =>
        item.productId === productId ? { ...item, quantity: Math.max(0, newQty) } : item
      )
    );
  };

  const handleComplete = async (shouldDeduct: boolean) => {
    if (!appointmentId) return;

    setSubmitting(true);
    try {
      await inventoryApi.completeAppointmentWithSupplies({
        appointmentId,
        generateInvoice,
        deductSupplies: shouldDeduct,
        supplies: items.map((i) => ({
          productId: i.productId,
          quantity: i.quantity,
        })),
      });

      toast.success('Cita completada exitosamente');
      onCompleted();
      onHide();
    } catch (err: any) {
      console.error('Error completing appointment with supplies:', err);
      toast.error(err.response?.data?.message || 'Error al completar la cita');
    } finally {
      setSubmitting(false);
    }
  };

  if (!show || !appointmentId) return null;

  const totalCost = items.reduce((sum, i) => sum + i.quantity * i.unitConsumptionCost, 0);
  const hasDeficit = items.some((i) => i.currentStock - i.quantity < 0);

  return (
    <Modal show={show} onHide={onHide} size="lg" centered>
      <Modal.Header closeButton className="bg-emerald-50/70 border-b border-emerald-200">
        <Modal.Title>
          <div className="flex items-center gap-2 text-emerald-900 font-bold text-base sm:text-lg">
            <FiCheckCircle size={22} className="text-emerald-600" />
            <span>Completar Cita #{appointmentId}</span>
          </div>
        </Modal.Title>
      </Modal.Header>

      <Modal.Body className="p-4 space-y-4">
        {loading ? (
          <div className="text-center py-12">
            <Spinner size="lg" className="border-emerald-600 mx-auto" />
            <p className="mt-2 text-slate-400 text-xs">Cargando receta e insumos...</p>
          </div>
        ) : (
          <>
            {/* Resumen de la Cita */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs sm:text-sm">
                <div>
                  <span className="text-slate-400 block text-xs">Cliente</span>
                  <span className="font-bold text-slate-800">{preview?.customerName}</span>
                  {appointmentData?.customer?.rut ? (
                    <div className="text-slate-500 font-mono text-xs mt-0.5">
                      🆔 {formatRutWithDots(appointmentData.customer.rut)}
                    </div>
                  ) : (
                    <div className="text-amber-600 font-semibold text-xs mt-0.5">
                      ⚠️ Sin RUT registrado
                    </div>
                  )}
                </div>
                <div>
                  <span className="text-slate-400 block text-xs">Servicios Realizados</span>
                  <span className="font-semibold text-slate-800">
                    {preview?.serviceNames.join(' + ') || 'Servicio'}
                  </span>
                </div>
              </div>
            </div>

            {/* Insumos */}
            {items.length === 0 ? (
              <Alert variant="info" className="text-xs sm:text-sm">
                ℹ️ Los servicios de esta cita no tienen insumos ni receta configurada en el inventario. La cita se completará normalmente.
              </Alert>
            ) : (
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <div className="font-bold text-xs sm:text-sm text-slate-800 flex items-center gap-2">
                    <FiPackage className="text-bunny-primary" />
                    <span>Insumos a Descontar:</span>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-semibold text-slate-600">
                    <input
                      type="checkbox"
                      checked={deductSupplies}
                      onChange={(e) => setDeductSupplies(e.target.checked)}
                      className="rounded border-slate-300 text-bunny-primary focus:ring-bunny-primary"
                    />
                    <span>Descontar stock</span>
                  </label>
                </div>

                {hasDeficit && deductSupplies && (
                  <Alert variant="warning" className="text-xs flex items-start gap-2">
                    <FiAlertTriangle className="shrink-0 text-base mt-0.5" />
                    <div>
                      <strong>Aviso de stock insuficiente:</strong> Uno o más insumos quedarán con saldo negativo para registrar el déficit y poder auditarlo.
                    </div>
                  </Alert>
                )}

                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-left text-xs sm:text-sm">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase text-xs">
                      <tr>
                        <th className="py-2.5 px-3">Insumo</th>
                        <th className="py-2.5 px-3 w-32">Cantidad Usada</th>
                        <th className="py-2.5 px-3">Stock Actual</th>
                        <th className="py-2.5 px-3">Stock Resultante</th>
                        <th className="py-2.5 px-3 text-right">Costo Est.</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {items.map((item) => {
                        const stockAfter = item.currentStock - item.quantity;
                        const isItemDeficit = stockAfter < 0;

                        return (
                          <tr key={item.productId} className="hover:bg-slate-50/60">
                            <td className="py-2 px-3">
                              <div className="font-semibold text-slate-800">{item.productName}</div>
                              <small className="text-slate-400">{item.consumptionUnit}</small>
                            </td>
                            <td className="py-2 px-3">
                              <input
                                type="number"
                                min={0}
                                step="any"
                                value={item.quantity}
                                onChange={(e) =>
                                  handleQuantityChange(item.productId, parseFloat(e.target.value) || 0)
                                }
                                disabled={!deductSupplies}
                                className="w-24 text-xs rounded border border-slate-300 p-1.5 focus:outline-none focus:ring-1 focus:ring-bunny-primary disabled:opacity-50"
                              />
                            </td>
                            <td className="py-2 px-3 text-slate-500">
                              {item.currentStock.toFixed(1)} {item.consumptionUnit}
                            </td>
                            <td className="py-2 px-3">
                              <span
                                className={`font-semibold ${
                                  isItemDeficit && deductSupplies ? 'text-rose-600' : 'text-emerald-600'
                                }`}
                              >
                                {deductSupplies ? stockAfter.toFixed(1) : item.currentStock.toFixed(1)}{' '}
                                {item.consumptionUnit}
                              </span>
                              {isItemDeficit && deductSupplies && (
                                <Badge variant="danger" className="ml-1 text-[10px]">
                                  Déficit
                                </Badge>
                              )}
                            </td>
                            <td className="py-2 px-3 text-right text-slate-500 font-medium">
                              {formatCurrencyCLP(item.quantity * item.unitConsumptionCost)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot className="bg-slate-50 border-t border-slate-200 font-bold">
                      <tr>
                        <td colSpan={4} className="py-2 px-3 text-right text-slate-700">
                          Costo Total de Materiales:
                        </td>
                        <td className="py-2 px-3 text-right text-bunny-primary">
                          {formatCurrencyCLP(totalCost)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}

            {/* Opción de Boleta */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <label className="flex items-center gap-2 cursor-pointer select-none text-xs sm:text-sm font-semibold text-slate-800">
                <input
                  type="checkbox"
                  id="generate-invoice-checkbox"
                  checked={generateInvoice}
                  onChange={(e) => setGenerateInvoice(e.target.checked)}
                  className="rounded border-slate-300 text-bunny-primary focus:ring-bunny-primary"
                />
                <span className="flex items-center gap-1.5">
                  <FiFileText /> Generar boleta de honorarios para esta cita
                </span>
              </label>
              {invoiceQuotaInfo && (
                <small className="text-slate-400 block mt-1 ml-5 text-xs">{invoiceQuotaInfo}</small>
              )}
            </div>
          </>
        )}
      </Modal.Body>

      <Modal.Footer>
        <div className="w-full flex justify-between items-center gap-2">
          <Button variant="secondary" size="sm" onClick={onHide} disabled={submitting}>
            Cancelar
          </Button>

          <div className="flex gap-2">
            {items.length > 0 && deductSupplies && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleComplete(false)}
                disabled={submitting || loading}
                className="text-xs"
              >
                Completar sin descontar
              </Button>
            )}

            <Button
              variant="primary"
              size="sm"
              onClick={() => handleComplete(true)}
              disabled={submitting || loading}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold flex items-center gap-1.5 text-xs sm:text-sm"
            >
              {submitting ? 'Procesando...' : '✅ Confirmar y Completar Cita'}
            </Button>
          </div>
        </div>
      </Modal.Footer>
    </Modal>
  );
};

export default CompleteAppointmentWithSuppliesModal;
