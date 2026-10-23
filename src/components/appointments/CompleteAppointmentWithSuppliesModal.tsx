import { useEffect, useState, useMemo } from 'react';
import {
  FiCheckCircle,
  FiAlertTriangle,
  FiPackage,
  FiFileText,
  FiPlus,
  FiTrash2,
} from 'react-icons/fi';
import { inventoryApi } from '@/api/inventory.api';
import { appointmentsApi } from '@/api/appointments.api';
import type { AppointmentSuppliesPreview, Product } from '@/types/inventory.types';
import type { Appointment } from '@/types/appointment.types';
import { useToast } from '@/hooks/useToast';
import { formatCurrencyCLP } from '@/utils/formatters';
import { formatRutWithDots } from '@/utils/rutUtils';
import { getAppointmentTotal } from '@/utils/appointmentUtils';
import { Modal, Button, Badge, Spinner } from '@/components/ui';

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
  isExtra?: boolean;
}

export const CompleteAppointmentWithSuppliesModal = ({
  show,
  appointmentId,
  onHide,
  onCompleted,
}: Props) => {
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [preview, setPreview] = useState<AppointmentSuppliesPreview | null>(null);
  const [appointmentData, setAppointmentData] = useState<Appointment | null>(null);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [items, setItems] = useState<EditableItem[]>([]);
  const [generateInvoice, setGenerateInvoice] = useState(true);
  const [deductSupplies, setDeductSupplies] = useState(true);
  const [invoiceQuotaInfo, setInvoiceQuotaInfo] = useState<string | null>(null);

  // Estado para buscador y selector de insumos adicionales
  const [showAddProductSelector, setShowAddProductSelector] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const [selectedExtraProductId, setSelectedExtraProductId] = useState<number | null>(null);
  const [extraQuantity, setExtraQuantity] = useState<number>(1);

  useEffect(() => {
    if (!show || !appointmentId) return;

    const loadData = async () => {
      setLoading(true);
      try {
        const [previewData, quota, aptData, productsData] = await Promise.all([
          inventoryApi.getAppointmentSuppliesPreview(appointmentId),
          appointmentsApi.getInvoiceQuota().catch(() => null),
          appointmentsApi.getById(appointmentId).catch(() => null),
          inventoryApi.listProducts().catch(() => []),
        ]);

        setPreview(previewData);
        setAppointmentData(aptData);
        setAllProducts(productsData);
        setItems(
          previewData.supplies.map((s) => ({
            productId: s.productId,
            productName: s.productName,
            consumptionUnit: s.consumptionUnit,
            quantity: s.suggestedQuantity,
            currentStock: s.currentStock,
            unitConsumptionCost: s.unitConsumptionCost,
            isExtra: false,
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
  }, [show, appointmentId, toast]);

  const handleQuantityChange = (productId: number, newQty: number) => {
    setItems((prev) =>
      prev.map((item) =>
        item.productId === productId ? { ...item, quantity: Math.max(0, newQty) } : item
      )
    );
  };

  const handleRemoveItem = (productId: number) => {
    setItems((prev) => prev.filter((item) => item.productId !== productId));
  };

  // Agregar insumo / esmalte adicional que no estaba en la receta original
  const handleAddExtraProduct = () => {
    if (!selectedExtraProductId) {
      toast.error('Selecciona un producto del catálogo');
      return;
    }

    const prod = allProducts.find((p) => p.id === selectedExtraProductId);
    if (!prod) return;

    // Verificar si ya está en la lista
    const existingIndex = items.findIndex((i) => i.productId === prod.id);
    if (existingIndex >= 0) {
      // Si ya existe, sumar la cantidad
      setItems((prev) =>
        prev.map((item, idx) =>
          idx === existingIndex ? { ...item, quantity: item.quantity + extraQuantity } : item
        )
      );
      toast.info(`Se incrementó la cantidad de ${prod.name}`);
    } else {
      const conv = prod.conversionFactor && prod.conversionFactor > 0 ? prod.conversionFactor : 1;
      const unitCost = (prod.purchasePrice || 0) / conv;

      setItems((prev) => [
        ...prev,
        {
          productId: prod.id,
          productName: prod.name,
          consumptionUnit: prod.consumptionUnit,
          quantity: extraQuantity,
          currentStock: prod.stockConsumptionUnit || 0,
          unitConsumptionCost: unitCost,
          isExtra: true,
        },
      ]);
      toast.success(`Insumo "${prod.name}" añadido al consumo de la cita`);
    }

    // Resetear selector
    setSelectedExtraProductId(null);
    setProductSearch('');
    setExtraQuantity(1);
    setShowAddProductSelector(false);
  };

  const filteredProductsForAdd = useMemo(() => {
    if (!productSearch.trim()) return allProducts;
    const q = productSearch.toLowerCase().trim();
    return allProducts.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.consumptionUnit.toLowerCase().includes(q) ||
        p.purchaseUnit.toLowerCase().includes(q)
    );
  }, [allProducts, productSearch]);

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
    } catch (err: unknown) {
      console.error('Error completing appointment with supplies:', err);
      const errorMsg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Error al completar la cita';
      toast.error(errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  if (!show || !appointmentId) return null;

  const totalCost = items.reduce((sum, i) => sum + i.quantity * i.unitConsumptionCost, 0);
  const appointmentPrice = appointmentData ? getAppointmentTotal(appointmentData) : 0;
  const grossMargin = appointmentPrice - totalCost;
  const marginPercentage = appointmentPrice > 0 ? Math.round((grossMargin / appointmentPrice) * 100) : 0;
  const hasDeficit = items.some((i) => i.currentStock - i.quantity < 0);

  return (
    <Modal show={show} onHide={onHide} size="lg" centered>
      <Modal.Header closeButton className="bg-emerald-50/70 border-b border-emerald-200">
        <Modal.Title>
          <div className="flex items-center gap-2 text-emerald-950 font-bold text-base sm:text-lg">
            <FiCheckCircle size={22} className="text-emerald-600" />
            <span>Completar Cita #{appointmentId} y Registro de Insumos</span>
          </div>
        </Modal.Title>
      </Modal.Header>

      <Modal.Body className="p-4 sm:p-6 space-y-5">
        {loading ? (
          <div className="text-center py-16 space-y-2">
            <Spinner size="lg" variant="primary" />
            <p className="text-stone-400 text-xs">Cargando receta e insumos sugeridos...</p>
          </div>
        ) : (
          <>
            {/* Resumen de la Cita & Análisis de Margen */}
            <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs sm:text-sm">
                <div>
                  <span className="text-stone-400 block text-xs">Cliente</span>
                  <span className="font-bold text-amber-950 text-sm">{preview?.customerName}</span>
                  {appointmentData?.customer?.rut ? (
                    <div className="text-stone-500 font-mono text-xs mt-0.5">
                      🆔 {formatRutWithDots(appointmentData.customer.rut)}
                    </div>
                  ) : (
                    <div className="text-amber-600 font-semibold text-xs mt-0.5">
                      ⚠️ Sin RUT registrado
                    </div>
                  )}
                </div>
                <div>
                  <span className="text-stone-400 block text-xs">Servicios Realizados</span>
                  <span className="font-semibold text-stone-800">
                    {preview?.serviceNames.join(' + ') || 'Servicio'}
                  </span>
                </div>
              </div>

              {/* Métricas de Rentabilidad de la Cita */}
              {appointmentPrice > 0 && (
                <div className="pt-3 border-t border-stone-200 grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="bg-white p-2 rounded-xl border border-stone-100 shadow-2xs">
                    <span className="text-stone-400 block text-[10px] uppercase font-bold">Precio Cita</span>
                    <span className="font-bold text-stone-900">{formatCurrencyCLP(appointmentPrice)}</span>
                  </div>
                  <div className="bg-white p-2 rounded-xl border border-stone-100 shadow-2xs">
                    <span className="text-stone-400 block text-[10px] uppercase font-bold">Costo Materiales</span>
                    <span className="font-bold text-rose-700">{formatCurrencyCLP(totalCost)}</span>
                  </div>
                  <div className="bg-white p-2 rounded-xl border border-stone-100 shadow-2xs">
                    <span className="text-stone-400 block text-[10px] uppercase font-bold">Margen Bruto</span>
                    <span className={`font-bold ${grossMargin >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                      {formatCurrencyCLP(grossMargin)} ({marginPercentage}%)
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Insumos a Descontar */}
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="font-bold text-xs sm:text-sm text-stone-800 flex items-center gap-2">
                  <FiPackage className="text-rose-700" />
                  <span>Insumos y Esmaltes a Descontar del Inventario:</span>
                  <Badge variant="neutral">{items.length}</Badge>
                </div>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-semibold text-stone-600">
                    <input
                      type="checkbox"
                      checked={deductSupplies}
                      onChange={(e) => setDeductSupplies(e.target.checked)}
                      className="rounded border-stone-300 text-rose-800 focus:ring-rose-500"
                    />
                    <span>Descontar stock</span>
                  </label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowAddProductSelector(!showAddProductSelector)}
                    leftIcon={<FiPlus />}
                    className="text-xs"
                  >
                    Agregar Insumo / Esmalte
                  </Button>
                </div>
              </div>

              {/* Panel Desplegable para Agregar Insumo Adicional */}
              {showAddProductSelector && (
                <div className="p-3.5 rounded-2xl bg-rose-50/60 border border-rose-200 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                      <FiPlus className="text-rose-700" /> Agregar Insumo / Esmalte no incluido en la receta:
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowAddProductSelector(false)}
                      className="text-stone-400 hover:text-stone-600 text-xs font-bold"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                    <div className="sm:col-span-8">
                      <input
                        type="text"
                        placeholder="Buscar producto por nombre o unidad (ej: OPI, Top Coat, Base, Foil)..."
                        value={productSearch}
                        onChange={(e) => setProductSearch(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs rounded-xl border border-stone-200 bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                      />
                      <select
                        size={4}
                        value={selectedExtraProductId || ''}
                        onChange={(e) => setSelectedExtraProductId(Number(e.target.value))}
                        className="w-full mt-1 px-2 py-1 text-xs rounded-xl border border-stone-200 bg-white focus:outline-none"
                      >
                        {filteredProductsForAdd.length === 0 ? (
                          <option disabled>No hay productos coincidentes</option>
                        ) : (
                          filteredProductsForAdd.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name} — Stock: {p.stockConsumptionUnit?.toFixed(1) || 0} {p.consumptionUnit} (${p.purchasePrice} / {p.purchaseUnit})
                            </option>
                          ))
                        )}
                      </select>
                    </div>

                    <div className="sm:col-span-4 flex flex-col justify-between gap-2">
                      <div>
                        <label htmlFor="complete-appointment-with-supplies-cantidad-a-consumir" className="block text-[11px] font-semibold text-stone-600 mb-1">
                          Cantidad a Consumir:
                        </label>
                        <input id="complete-appointment-with-supplies-cantidad-a-consumir"
                          type="number"
                          min={0.001}
                          step="any"
                          value={extraQuantity}
                          onChange={(e) => setExtraQuantity(parseFloat(e.target.value) || 0)}
                          className="w-full px-3 py-1.5 text-xs rounded-xl border border-stone-200 bg-white focus:outline-none"
                        />
                      </div>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={handleAddExtraProduct}
                        disabled={!selectedExtraProductId || extraQuantity <= 0}
                        className="w-full text-xs font-semibold"
                      >
                        ✓ Añadir a la Cita
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {hasDeficit && deductSupplies && (
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-start gap-2">
                  <FiAlertTriangle className="shrink-0 text-base mt-0.5 text-amber-600" />
                  <div>
                    <strong>Aviso de stock insuficiente:</strong> Uno o más insumos quedarán con saldo negativo para registrar el déficit y permitir la auditoría de compras del salón.
                  </div>
                </div>
              )}

              {items.length === 0 ? (
                <div className="p-4 rounded-xl bg-sky-50 border border-sky-100 text-sky-800 text-xs text-center space-y-1">
                  <p className="font-semibold">ℹ️ No hay insumos registrados para esta atención.</p>
                  <p className="text-stone-500">
                    Puedes pulsar "Agregar Insumo / Esmalte" arriba para registrar los materiales utilizados, o completar la cita directamente.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto border border-stone-200 rounded-2xl bg-white shadow-2xs">
                  <table className="w-full text-left text-xs sm:text-sm">
                    <thead className="bg-stone-50 border-b border-stone-200 text-stone-600 font-semibold uppercase text-[11px] tracking-wider">
                      <tr>
                        <th className="py-2.5 px-3.5">Insumo / Material</th>
                        <th className="py-2.5 px-3.5 w-32">Cantidad Usada</th>
                        <th className="py-2.5 px-3.5">Stock Actual</th>
                        <th className="py-2.5 px-3.5">Stock Resultante</th>
                        <th className="py-2.5 px-3.5 text-right">Costo Est.</th>
                        <th className="py-2.5 px-3 text-center w-10"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100 text-stone-700">
                      {items.map((item) => {
                        const stockAfter = item.currentStock - item.quantity;
                        const isItemDeficit = stockAfter < 0;

                        return (
                          <tr key={item.productId} className="hover:bg-stone-50/60 transition-colors">
                            <td className="py-2.5 px-3.5">
                              <div className="font-semibold text-amber-950 flex items-center gap-1.5">
                                <span>{item.productName}</span>
                                {item.isExtra && (
                                  <Badge variant="info">Extra</Badge>
                                )}
                              </div>
                              <span className="text-stone-400 text-xs">{item.consumptionUnit}</span>
                            </td>
                            <td className="py-2.5 px-3.5">
                              <input
                                type="number"
                                min={0}
                                step="any"
                                value={item.quantity}
                                onChange={(e) =>
                                  handleQuantityChange(item.productId, parseFloat(e.target.value) || 0)
                                }
                                disabled={!deductSupplies}
                                className="w-24 text-xs rounded-xl border border-stone-200 p-1.5 focus:outline-none focus:ring-2 focus:ring-rose-500/20 disabled:opacity-50 bg-white"
                              />
                            </td>
                            <td className="py-2.5 px-3.5 text-stone-500">
                              {item.currentStock.toFixed(1)} {item.consumptionUnit}
                            </td>
                            <td className="py-2.5 px-3.5">
                              <span
                                className={`font-semibold ${
                                  isItemDeficit && deductSupplies ? 'text-rose-600 font-bold' : 'text-emerald-600'
                                }`}
                              >
                                {deductSupplies ? stockAfter.toFixed(1) : item.currentStock.toFixed(1)}{' '}
                                {item.consumptionUnit}
                              </span>
                              {isItemDeficit && deductSupplies && (
                                <Badge variant="danger">
                                  Déficit
                                </Badge>
                              )}
                            </td>
                            <td className="py-2.5 px-3.5 text-right text-stone-600 font-medium">
                              {formatCurrencyCLP(item.quantity * item.unitConsumptionCost)}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <button
                                type="button"
                                onClick={() => handleRemoveItem(item.productId)}
                                className="text-stone-300 hover:text-red-500 transition-colors p-1"
                                title="Quitar insumo de esta cita"
                              >
                                <FiTrash2 size={14} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot className="bg-stone-50 border-t border-stone-200 font-bold">
                      <tr>
                        <td colSpan={4} className="py-2.5 px-3.5 text-right text-stone-700">
                          Costo Total de Materiales Usados:
                        </td>
                        <td className="py-2.5 px-3.5 text-right text-rose-800 font-bold">
                          {formatCurrencyCLP(totalCost)}
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>

            {/* Opción de Boleta Electrónica SII */}
            <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200">
              <label className="flex items-center gap-2 cursor-pointer select-none text-xs sm:text-sm font-semibold text-stone-800">
                <input
                  type="checkbox"
                  id="generate-invoice-checkbox"
                  checked={generateInvoice}
                  onChange={(e) => setGenerateInvoice(e.target.checked)}
                  className="rounded border-stone-300 text-rose-800 focus:ring-rose-500"
                />
                <span className="flex items-center gap-1.5">
                  <FiFileText className="text-rose-700" /> Emitir boleta electrónica SII para esta atención
                </span>
              </label>
              {invoiceQuotaInfo && (
                <small className="text-stone-400 block mt-1 ml-5 text-xs">{invoiceQuotaInfo}</small>
              )}
            </div>
          </>
        )}
      </Modal.Body>

      <Modal.Footer>
        <div className="w-full flex justify-between items-center gap-2 flex-wrap">
          <Button variant="ghost" size="sm" onClick={onHide} disabled={submitting}>
            Cancelar
          </Button>

          <div className="flex items-center gap-2">
            {items.length > 0 && deductSupplies && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleComplete(false)}
                disabled={submitting || loading}
                className="text-xs"
              >
                Completar sin descontar stock
              </Button>
            )}

            <Button
              variant="primary"
              size="sm"
              onClick={() => handleComplete(true)}
              disabled={submitting || loading}
              isLoading={submitting}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold flex items-center gap-1.5 text-xs sm:text-sm shadow-sm"
            >
              ✅ Confirmar y Completar Cita
            </Button>
          </div>
        </div>
      </Modal.Footer>
    </Modal>
  );
};

export default CompleteAppointmentWithSuppliesModal;
