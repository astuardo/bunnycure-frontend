import React, { useEffect, useState } from 'react';
import { InventoryMovement } from '@/types/inventory.types';
import { inventoryApi } from '@/api/inventory.api';
import { toast } from 'react-toastify';
import { formatCurrencyCLP } from '@/utils/formatters';
import { Modal, Button, Badge, Spinner } from '@/components/ui';

interface Props {
  show: boolean;
  onHide: () => void;
  productId?: number | null;
}

export const MovementListModal: React.FC<Props> = ({ show, onHide, productId }) => {
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!show) return;
    const load = async () => {
      setLoading(true);
      try {
        const data = await inventoryApi.listMovements(productId ?? undefined);
        setMovements(data);
      } catch {
        toast.error('No se pudo cargar movimientos');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [show, productId]);

  if (!show) return null;

  return (
    <Modal show={show} onHide={onHide} size="xl" centered>
      <Modal.Header closeButton>
        <Modal.Title>📋 Historial de Movimientos de Stock</Modal.Title>
      </Modal.Header>
      <Modal.Body className="p-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 text-bunny-text-muted">
            <Spinner size="lg" variant="primary" />
            <p className="text-xs mt-3">Cargando movimientos...</p>
          </div>
        ) : movements.length === 0 ? (
          <div className="text-center py-12 text-bunny-text-muted text-sm">
            No hay movimientos registrados para este producto.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-bunny-border">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-bunny-paper/70 border-b border-bunny-border text-xs font-semibold text-bunny-text-muted uppercase">
                  <th className="py-3 px-4">Tipo</th>
                  <th className="py-3 px-4">Cant. (consumo)</th>
                  <th className="py-3 px-4">Cant. (compra)</th>
                  <th className="py-3 px-4">Precio unidad</th>
                  <th className="py-3 px-4">Referencia</th>
                  <th className="py-3 px-4">Fecha</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-bunny-border/60">
                {movements.map((m) => (
                  <tr key={m.id} className="hover:bg-bunny-blush/20 transition-colors">
                    <td className="py-3 px-4">
                      <Badge
                        variant={
                          m.movementType === 'PURCHASE'
                            ? 'success'
                            : m.movementType === 'CONSUMPTION'
                            ? 'danger'
                            : 'neutral'
                        }
                        className="text-[10px]"
                      >
                        {m.movementType}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 font-semibold text-bunny-cocoa">
                      {m.quantityConsumptionUnit}
                    </td>
                    <td className="py-3 px-4 text-bunny-text-muted">
                      {m.quantityPurchaseUnit ?? '—'}
                    </td>
                    <td className="py-3 px-4 font-medium text-bunny-text">
                      {m.unitPurchasePrice != null ? formatCurrencyCLP(m.unitPurchasePrice) : '—'}
                    </td>
                    <td className="py-3 px-4 text-xs text-bunny-text-muted">
                      {m.reference ?? '—'}
                    </td>
                    <td className="py-3 px-4 text-xs text-bunny-text-muted whitespace-nowrap">
                      {m.createdAt ? new Date(m.createdAt).toLocaleString() : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="outline" size="sm" onClick={onHide}>
          Cerrar
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default MovementListModal;
