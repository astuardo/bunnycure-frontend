import React from 'react';
import { Product } from '@/types/inventory.types';
import { formatCurrencyCLP } from '@/utils/formatters';
import { FiTrendingUp, FiShoppingBag, FiList, FiEdit2, FiTrash2, FiRefreshCw } from 'react-icons/fi';

const formatDelta = (current?: number | null, previous?: number | null) => {
  if (current === null || current === undefined || previous === null || previous === undefined) return null;
  const delta = current - previous;
  if (delta === 0) {
    return <span className="badge bg-secondary" style={{ fontSize: '0.72rem' }}>Sin cambio</span>;
  }

  return delta > 0 ? (
    <span className="badge bg-danger" style={{ fontSize: '0.72rem' }}>▲ +{formatCurrencyCLP(delta)}</span>
  ) : (
    <span className="badge bg-success" style={{ fontSize: '0.72rem' }}>▼ {formatCurrencyCLP(Math.abs(delta))}</span>
  );
};

interface Props {
  products: Product[];
  onEdit: (p: Product) => void;
  onDelete: (p: Product) => void;
  onPurchase: (p: Product) => void;
  onViewMovements: (p: Product) => void;
  onRefreshObserved: (p: Product) => void;
  onViewPriceAnalysis: (p: Product) => void;
}

export const ProductList: React.FC<Props> = ({
  products,
  onEdit,
  onDelete,
  onPurchase,
  onViewMovements,
  onRefreshObserved,
  onViewPriceAnalysis,
}) => {
  return (
    <div className="table-responsive">
      <table className="table table-hover align-middle mb-0" style={{ fontSize: '0.88rem' }}>
        <thead className="table-light">
          <tr>
            <th>Producto</th>
            <th>Precio Compra</th>
            <th>Precio Observado (Web)</th>
            <th>Stock Actual</th>
            <th>Unidades</th>
            <th>Factor</th>
            <th className="text-end">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {products.length === 0 && (
            <tr>
              <td colSpan={7} className="text-center py-5 text-muted">
                No hay productos registrados en el inventario
              </td>
            </tr>
          )}

          {products.map((p) => {
            const isNegativeStock = (p.stockConsumptionUnit || 0) < 0;
            const isZeroStock = (p.stockConsumptionUnit || 0) === 0;

            return (
              <tr key={p.id}>
                <td>
                  <div className="fw-bold text-dark">{p.name}</div>
                  {p.purchaseUrl && (
                    <a
                      href={p.purchaseUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary text-decoration-none small d-inline-flex align-items-center gap-1"
                      title="Ver producto en sitio del proveedor"
                    >
                      🔗 Proveedor
                    </a>
                  )}
                </td>
                <td>
                  <div className="d-flex align-items-center gap-2">
                    <span className="fw-semibold text-dark">{formatCurrencyCLP(p.purchasePrice)}</span>
                    <button
                      type="button"
                      className="btn btn-xs btn-outline-info p-0 px-1"
                      style={{ fontSize: '0.72rem', borderRadius: '4px' }}
                      onClick={() => onViewPriceAnalysis(p)}
                      title="Ver análisis histórico de precios"
                    >
                      <FiTrendingUp /> Historial
                    </button>
                  </div>
                  <small className="text-muted d-block">por {p.purchaseUnit}</small>
                </td>
                <td>
                  {p.purchaseUrl ? (
                    <div>
                      <div className="d-flex align-items-center gap-1">
                        <span className="fw-semibold">
                          {p.observedPrice ? formatCurrencyCLP(p.observedPrice) : 'Pendiente'}
                        </span>
                        <button
                          type="button"
                          className="btn btn-xs btn-outline-secondary p-0 px-1"
                          style={{ fontSize: '0.7rem' }}
                          onClick={() => onRefreshObserved(p)}
                          title="Refrescar precio observado ahora"
                        >
                          <FiRefreshCw size={10} />
                        </button>
                      </div>
                      {p.observedPrice && <div className="mt-1">{formatDelta(p.observedPrice, p.previousObservedPrice)}</div>}
                    </div>
                  ) : (
                    <span className="text-muted small">Sin URL de monitoreo</span>
                  )}
                </td>
                <td>
                  <span
                    className={`badge ${
                      isNegativeStock
                        ? 'bg-danger'
                        : isZeroStock
                        ? 'bg-warning text-dark'
                        : 'bg-success'
                    }`}
                    style={{ fontSize: '0.82rem', padding: '5px 9px' }}
                  >
                    {p.stockConsumptionUnit} {p.consumptionUnit}
                  </span>
                  {isNegativeStock && (
                    <small className="text-danger d-block mt-1 fw-bold">Déficit registrado</small>
                  )}
                </td>
                <td>
                  <div>
                    <span className="text-muted small">Compra:</span> {p.purchaseUnit}
                  </div>
                  <div>
                    <span className="text-muted small">Consumo:</span> {p.consumptionUnit}
                  </div>
                </td>
                <td>
                  <span className="badge bg-light text-dark border">
                    1 {p.purchaseUnit} = {p.conversionFactor} {p.consumptionUnit}
                  </span>
                </td>
                <td className="text-end">
                  <div className="btn-group gap-1" role="group">
                    <button
                      type="button"
                      className="btn btn-sm btn-success d-inline-flex align-items-center gap-1"
                      onClick={() => onPurchase(p)}
                      title="Registrar compra / entrada"
                    >
                      <FiShoppingBag size={13} /> Comprar
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-secondary"
                      onClick={() => onViewMovements(p)}
                      title="Ver kardex / movimientos"
                    >
                      <FiList size={13} />
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-primary"
                      onClick={() => onEdit(p)}
                      title="Editar producto"
                    >
                      <FiEdit2 size={13} />
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-danger"
                      onClick={() => onDelete(p)}
                      title="Eliminar producto"
                    >
                      <FiTrash2 size={13} />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default ProductList;

