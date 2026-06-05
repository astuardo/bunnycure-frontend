import React, { useEffect, useState } from 'react';
import { Modal } from 'react-bootstrap';
import { InventoryMovement } from '@/types/inventory.types';
import { inventoryApi } from '@/api/inventory.api';
import { toast } from 'react-toastify';
import { formatCurrencyCLP } from '@/utils/formatters';

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
      } catch (err: any) {
        toast.error('No se pudo cargar movimientos');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [show, productId]);

  if (!show) return null;

  return (
    <Modal show={show} onHide={onHide} size="lg" centered>
      <Modal.Header closeButton>
        <Modal.Title>Historial de movimientos</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {loading ? (
          <div>Cargando...</div>
        ) : movements.length === 0 ? (
          <div className="text-muted">No hay movimientos registrados</div>
        ) : (
          <div className="table-responsive">
            <table className="table table-sm">
              <thead>
                <tr>
                  <th>Tipo</th>
                  <th>Cantidad (consumo)</th>
                  <th>Cantidad (compra)</th>
                  <th>Precio unidad</th>
                  <th>Referencia</th>
                  <th>Fecha</th>
                </tr>
              </thead>
              <tbody>
                {movements.map(m => (
                  <tr key={m.id}>
                    <td>{m.movementType}</td>
                    <td>{m.quantityConsumptionUnit}</td>
                    <td>{m.quantityPurchaseUnit ?? '-'}</td>
                    <td>{m.unitPurchasePrice != null ? formatCurrencyCLP(m.unitPurchasePrice) : '-'}</td>
                    <td>{m.reference ?? '-'}</td>
                    <td>{m.createdAt ? new Date(m.createdAt).toLocaleString() : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Modal.Body>
      <Modal.Footer>
        <button className="btn btn-secondary" onClick={onHide}>Cerrar</button>
      </Modal.Footer>
    </Modal>
  );
};

export default MovementListModal;
