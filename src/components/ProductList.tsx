import React from 'react';
import { Product } from '@/types/inventory.types';
import { formatCurrencyCLP } from '@/utils/formatters';

const formatDelta = (current?: number | null, previous?: number | null) => {
  if (current === null || current === undefined || previous === null || previous === undefined) return null;
  const delta = current - previous;
  if (delta === 0) {
    return <span className="badge bg-secondary">Sin cambio</span>;
  }

  return delta > 0 ? (
    <span className="badge bg-danger">▲ {formatCurrencyCLP(delta)}</span>
  ) : (
    <span className="badge bg-success">▼ {formatCurrencyCLP(Math.abs(delta))}</span>
  );
};

interface Props {
  products: Product[];
  onEdit: (p: Product) => void;
  onDelete: (p: Product) => void;
  onPurchase: (p: Product) => void;
  onViewMovements: (p: Product) => void;
  onRefreshObserved: (p: Product) => void;
}

export const ProductList: React.FC<Props> = ({ products, onEdit, onDelete, onPurchase, onViewMovements, onRefreshObserved }) => {
  return (
    <div className="table-responsive">
      <table className="table table-hover">
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Precio compra</th>
            <th>Precio observado</th>
            <th>Disponibilidad</th>
            <th>Última revisión</th>
            <th>Unidad compra</th>
            <th>Unidad consumo</th>
            <th>Factor</th>
            <th>Stock (consumo)</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {products.length === 0 && (
            <tr>
              <td colSpan={10} className="text-center text-muted">No hay productos</td>
            </tr>
          )}

          {products.map((p) => (
            <tr key={p.id}>
              <td>
                {p.name}
                {p.purchaseUrl && (
                  <a href={p.purchaseUrl} target="_blank" rel="noopener noreferrer" className="ms-2" title="Ir al proveedor">
                    🔗
                  </a>
                )}
              </td>
              <td>{formatCurrencyCLP(p.purchasePrice)}</td>
              <td>
                <div className="d-flex flex-column gap-1">
                  <span>{formatCurrencyCLP(p.observedPrice ?? null)}</span>
                  <span>{formatDelta(p.observedPrice ?? null, p.previousObservedPrice ?? null)}</span>
                </div>
              </td>
              <td>
                {p.observedAvailable === true ? (
                  <span className="badge bg-success">Disponible</span>
                ) : p.observedAvailable === false ? (
                  <span className="badge bg-danger">Sin stock</span>
                ) : (
                  <span className="badge bg-secondary">Sin dato</span>
                )}
              </td>
              <td>{p.lastObservedAt ? new Date(p.lastObservedAt).toLocaleString('es-CL') : '-'}</td>
              <td>{p.purchaseUnit}</td>
              <td>{p.consumptionUnit}</td>
              <td>{p.conversionFactor}</td>
              <td>{p.stockConsumptionUnit}</td>
              <td>
                <div className="btn-group flex-wrap gap-1" role="group">
                  <button type="button" className="btn btn-sm btn-outline-info" onClick={() => onRefreshObserved(p)}>Actualizar</button>
                  <button type="button" className="btn btn-sm btn-outline-success" onClick={() => onPurchase(p)}>Registrar compra</button>
                  <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => onViewMovements(p)}>Movimientos</button>
                  <button type="button" className="btn btn-sm btn-outline-primary" onClick={() => onEdit(p)}>Editar</button>
                  <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => onDelete(p)}>Eliminar</button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ProductList;
