import React, { useEffect, useState } from 'react';
import { FiPlus, FiTrash2, FiInfo } from 'react-icons/fi';
import { Product } from '@/types/inventory.types';
import { ServiceCatalog } from '@/types/service.types';
import { inventoryApi } from '@/api/inventory.api';
import { useToast } from '@/hooks/useToast';
import { formatCurrencyCLP } from '@/utils/formatters';
import { Modal, Button, Badge, Alert, Spinner } from '@/components/ui';

interface Props {
  show: boolean;
  onHide: () => void;
  service: ServiceCatalog | null;
  products: Product[];
  onSaved?: () => void;
}

interface EditableSupplyRow {
  productId: number;
  quantity: number;
}

export const ServiceSuppliesModal: React.FC<Props> = ({
  show,
  onHide,
  service,
  products,
  onSaved,
}) => {
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [rows, setRows] = useState<EditableSupplyRow[]>([]);

  useEffect(() => {
    if (!show || !service) return;

    const loadSupplies = async () => {
      setLoading(true);
      try {
        const supplies = await inventoryApi.getServiceSupplies(service.id);
        setRows(
          supplies.map((s) => ({
            productId: s.productId,
            quantity: s.quantityConsumptionUnit,
          }))
        );
      } catch (err) {
        console.error('Error loading service supplies:', err);
        toast.error('Error al cargar insumos del servicio');
      } finally {
        setLoading(false);
      }
    };

    loadSupplies();
  }, [show, service, toast]);

  const handleAddRow = () => {
    if (products.length === 0) {
      toast.error('No hay productos creados en el inventario');
      return;
    }
    const available = products.find((p) => !rows.some((r) => r.productId === p.id)) || products[0];
    setRows((prev) => [...prev, { productId: available.id, quantity: 1 }]);
  };

  const handleRemoveRow = (index: number) => {
    setRows((prev) => prev.filter((_, i) => i !== index));
  };

  const handleProductChange = (index: number, newProductId: number) => {
    setRows((prev) => {
      const updated = [...prev];
      updated[index].productId = newProductId;
      return updated;
    });
  };

  const handleQuantityChange = (index: number, quantity: number) => {
    setRows((prev) => {
      const updated = [...prev];
      updated[index].quantity = Math.max(0.0001, quantity);
      return updated;
    });
  };

  const calculatedItems = rows.map((r) => {
    const product = products.find((p) => p.id === r.productId);
    const conv = product?.conversionFactor && product.conversionFactor > 0 ? product.conversionFactor : 1;
    const unitCost = (product?.purchasePrice || 0) / conv;
    const totalCost = unitCost * (r.quantity || 0);

    return {
      productId: r.productId,
      product,
      quantity: r.quantity,
      unitCost,
      totalCost,
    };
  });

  const totalMaterialsCost = calculatedItems.reduce((sum, item) => sum + item.totalCost, 0);
  const servicePrice = service?.price || 0;
  const grossMargin = servicePrice - totalMaterialsCost;
  const grossMarginPct = servicePrice > 0 ? (grossMargin / servicePrice) * 100 : 0;

  const handleSave = async () => {
    if (!service) return;

    const productIds = rows.map((r) => r.productId);
    const hasDuplicates = new Set(productIds).size !== productIds.length;
    if (hasDuplicates) {
      toast.error('No puedes agregar el mismo producto más de una vez. Agrupa las cantidades.');
      return;
    }

    setSaving(true);
    try {
      await inventoryApi.saveServiceSupplies(
        service.id,
        rows.map((r) => ({
          productId: r.productId,
          quantityConsumptionUnit: r.quantity,
        }))
      );
      toast.success('✅ Insumos del servicio guardados correctamente');
      onSaved && onSaved();
      onHide();
    } catch (err: unknown) {
      const error = err as { message?: string };
      toast.error(error.message || 'Error al guardar insumos');
    } finally {
      setSaving(false);
    }
  };

  if (!show || !service) return null;

  return (
    <Modal show={show} onHide={onHide} size="xl" centered>
      <Modal.Header closeButton>
        <Modal.Title>
          🧪 Insumos y Receta: {service.name}
        </Modal.Title>
      </Modal.Header>

      <Modal.Body className="space-y-4">
        <Alert variant="info">
          <div className="flex items-start gap-2">
            <FiInfo className="text-base shrink-0 mt-0.5" />
            <div className="text-xs">
              Define qué insumos y cantidades en <strong>unidad de consumo</strong> (ej. <em>ml, gr, unidades</em>)
              se utilizarán por defecto en cada atención de este servicio.
            </div>
          </div>
        </Alert>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-10 text-bunny-text-muted">
            <Spinner size="lg" variant="primary" />
            <p className="mt-2 text-xs">Cargando insumos...</p>
          </div>
        ) : (
          <>
            {/* Métricas de Costo y Margen */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-bunny-paper/60 border border-bunny-border rounded-xl p-3 text-center">
                <span className="text-xs text-bunny-text-muted font-medium block">
                  Precio Venta Servicio
                </span>
                <span className="text-base font-bold text-bunny-cocoa">
                  {formatCurrencyCLP(servicePrice)}
                </span>
              </div>
              <div className="bg-rose-50/70 border border-rose-200 rounded-xl p-3 text-center">
                <span className="text-xs text-rose-800 font-medium block">
                  Costo Total Insumos
                </span>
                <span className="text-base font-bold text-bunny-danger">
                  {formatCurrencyCLP(Math.round(totalMaterialsCost))}
                </span>
              </div>
              <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3 text-center">
                <span className="text-xs text-emerald-800 font-medium block">
                  Margen de Ganancia
                </span>
                <span className="text-base font-bold text-emerald-700">
                  {formatCurrencyCLP(Math.round(grossMargin))} ({grossMarginPct.toFixed(1)}%)
                </span>
              </div>
            </div>

            {/* Tabla de Insumos */}
            <div className="overflow-x-auto rounded-xl border border-bunny-border">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="bg-bunny-paper/70 border-b border-bunny-border text-xs font-semibold text-bunny-text-muted uppercase">
                    <th className="py-3 px-4 w-[45%]">Producto (Inventario)</th>
                    <th className="py-3 px-4 w-[25%]">Cantidad Usada</th>
                    <th className="py-3 px-4 w-[20%]">Costo Estimado</th>
                    <th className="py-3 px-4 w-[10%] text-center">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-bunny-border/60">
                  {rows.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="text-center py-6 text-bunny-text-muted text-xs">
                        No hay insumos asignados a este servicio aún. Haz clic en <strong>"+ Agregar Insumo"</strong>.
                      </td>
                    </tr>
                  ) : (
                    calculatedItems.map((item, idx) => (
                      <tr key={idx} className="hover:bg-bunny-blush/20 transition-colors">
                        <td className="py-3 px-4">
                          <select
                            value={item.productId}
                            onChange={(e) => handleProductChange(idx, Number(e.target.value))}
                            className="w-full rounded-lg border border-bunny-border bg-white px-2.5 py-1.5 text-xs text-bunny-text focus:outline-none focus:ring-2 focus:ring-bunny-primary/30"
                          >
                            {products.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name} ({p.stockConsumptionUnit} {p.consumptionUnit} disponibles)
                              </option>
                            ))}
                          </select>
                          <span className="text-[11px] text-bunny-text-muted block mt-1">
                            Costo unitario: {formatCurrencyCLP(item.unitCost)} / {item.product?.consumptionUnit}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1.5">
                            <input
                              type="number"
                              step="0.01"
                              min="0.0001"
                              value={item.quantity}
                              onChange={(e) => handleQuantityChange(idx, parseFloat(e.target.value) || 0)}
                              className="w-24 rounded-lg border border-bunny-border bg-white px-2.5 py-1.5 text-xs font-semibold text-bunny-cocoa focus:outline-none focus:ring-2 focus:ring-bunny-primary/30"
                            />
                            <Badge variant="neutral" className="text-[10px]">
                              {item.product?.consumptionUnit || 'unidades'}
                            </Badge>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-semibold text-xs text-bunny-cocoa">
                            {formatCurrencyCLP(Math.round(item.totalCost))}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveRow(idx)}
                            title="Eliminar insumo"
                            className="p-1.5 rounded-lg border border-bunny-border text-bunny-danger hover:bg-rose-50 hover:border-rose-300 transition-colors"
                          >
                            <FiTrash2 className="text-xs" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={handleAddRow}
              leftIcon={<FiPlus />}
            >
              Agregar Insumo
            </Button>
          </>
        )}
      </Modal.Body>

      <Modal.Footer>
        <Button variant="outline" size="sm" onClick={onHide} disabled={saving}>
          Cancelar
        </Button>
        <Button
          variant="primary"
          size="sm"
          onClick={handleSave}
          disabled={saving || loading}
          isLoading={saving}
          loadingText="Guardando..."
        >
          Guardar Receta
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default ServiceSuppliesModal;
