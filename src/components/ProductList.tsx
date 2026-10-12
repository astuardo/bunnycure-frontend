import React from 'react';
import { Product } from '@/types/inventory.types';
import { formatCurrencyCLP } from '@/utils/formatters';
import { FiTrendingUp, FiShoppingBag, FiList, FiEdit2, FiTrash2, FiRefreshCw, FiExternalLink } from 'react-icons/fi';
import { Badge } from '@/components/ui';

const formatDelta = (current?: number | null, previous?: number | null) => {
  if (current === null || current === undefined || previous === null || previous === undefined) return null;
  const delta = current - previous;
  if (delta === 0) {
    return <Badge variant="neutral" className="text-[10px]">Sin cambio</Badge>;
  }

  return delta > 0 ? (
    <Badge variant="danger" className="text-[10px]">▲ +{formatCurrencyCLP(delta)}</Badge>
  ) : (
    <Badge variant="success" className="text-[10px]">▼ {formatCurrencyCLP(Math.abs(delta))}</Badge>
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
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm border-collapse">
        <thead>
          <tr className="bg-bunny-paper/70 border-b border-bunny-border text-xs font-semibold text-bunny-text-muted uppercase">
            <th className="py-3 px-4">Producto</th>
            <th className="py-3 px-4">Precio Compra</th>
            <th className="py-3 px-4">Precio Observado (Web)</th>
            <th className="py-3 px-4">Stock Actual</th>
            <th className="py-3 px-4">Unidades</th>
            <th className="py-3 px-4">Factor</th>
            <th className="py-3 px-4 text-right">Acciones</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-bunny-border/60">
          {products.length === 0 && (
            <tr>
              <td colSpan={7} className="text-center py-8 text-bunny-text-muted text-sm">
                No hay productos registrados en el inventario
              </td>
            </tr>
          )}

          {products.map((p) => {
            const isNegativeStock = (p.stockConsumptionUnit || 0) < 0;
            const isZeroStock = (p.stockConsumptionUnit || 0) === 0;

            return (
              <tr key={p.id} className="hover:bg-bunny-blush/20 transition-colors">
                <td className="py-3 px-4">
                  <div className="font-semibold text-bunny-cocoa">{p.name}</div>
                  {p.purchaseUrl && (
                    <a
                      href={p.purchaseUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-bunny-primary hover:underline text-xs inline-flex items-center gap-1 mt-0.5"
                      title="Ver producto en sitio del proveedor"
                    >
                      <FiExternalLink className="text-[10px]" /> Proveedor
                    </a>
                  )}
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-bunny-cocoa">{formatCurrencyCLP(p.purchasePrice)}</span>
                    <button
                      type="button"
                      className="px-1.5 py-0.5 rounded border border-bunny-border text-[11px] font-medium text-bunny-text-muted hover:bg-bunny-blush transition-colors flex items-center gap-1"
                      onClick={() => onViewPriceAnalysis(p)}
                      title="Ver análisis histórico de precios"
                    >
                      <FiTrendingUp className="text-[10px]" /> Historial
                    </button>
                  </div>
                  <small className="text-bunny-text-muted block text-xs">por {p.purchaseUnit}</small>
                </td>
                <td className="py-3 px-4">
                  {p.purchaseUrl ? (
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-medium text-xs text-bunny-cocoa">
                          {p.observedPrice ? formatCurrencyCLP(p.observedPrice) : 'Pendiente'}
                        </span>
                        <button
                          type="button"
                          className="p-1 rounded border border-bunny-border text-bunny-text-muted hover:bg-gray-100 transition-colors"
                          onClick={() => onRefreshObserved(p)}
                          title="Refrescar precio observado ahora"
                        >
                          <FiRefreshCw className="text-[10px]" />
                        </button>
                      </div>
                      {p.observedPrice && <div className="mt-1">{formatDelta(p.observedPrice, p.previousObservedPrice)}</div>}
                    </div>
                  ) : (
                    <span className="text-bunny-text-muted text-xs">Sin URL</span>
                  )}
                </td>
                <td className="py-3 px-4">
                  <Badge
                    variant={isNegativeStock ? 'danger' : isZeroStock ? 'warning' : 'success'}
                    className="text-xs"
                  >
                    {p.stockConsumptionUnit} {p.consumptionUnit}
                  </Badge>
                  {isNegativeStock && (
                    <small className="text-bunny-danger block mt-0.5 text-[10px] font-bold">Déficit registrado</small>
                  )}
                </td>
                <td className="py-3 px-4 text-xs text-bunny-text">
                  <div>
                    <span className="text-bunny-text-muted">Compra:</span> {p.purchaseUnit}
                  </div>
                  <div>
                    <span className="text-bunny-text-muted">Consumo:</span> {p.consumptionUnit}
                  </div>
                </td>
                <td className="py-3 px-4">
                  <span className="text-[11px] px-2 py-0.5 rounded-md border border-bunny-border bg-white text-bunny-text-muted whitespace-nowrap">
                    1 {p.purchaseUnit} = {p.conversionFactor} {p.consumptionUnit}
                  </span>
                </td>
                <td className="py-3 px-4 text-right">
                  <div className="inline-flex items-center gap-1">
                    <button
                      type="button"
                      className="px-2.5 py-1.5 rounded-lg border border-emerald-300 bg-emerald-50 text-emerald-800 text-xs font-semibold hover:bg-emerald-100 transition-colors inline-flex items-center gap-1"
                      onClick={() => onPurchase(p)}
                      title="Registrar compra / entrada"
                    >
                      <FiShoppingBag className="text-xs" /> Comprar
                    </button>
                    <button
                      type="button"
                      className="p-1.5 rounded-lg border border-bunny-border text-bunny-text-muted hover:bg-bunny-blush/60 transition-colors"
                      onClick={() => onViewMovements(p)}
                      title="Ver kardex / movimientos"
                    >
                      <FiList className="text-xs" />
                    </button>
                    <button
                      type="button"
                      className="p-1.5 rounded-lg border border-bunny-border text-bunny-cocoa hover:bg-bunny-blush/60 hover:border-bunny-terracotta/40 transition-colors"
                      onClick={() => onEdit(p)}
                      title="Editar producto"
                    >
                      <FiEdit2 className="text-xs" />
                    </button>
                    <button
                      type="button"
                      className="p-1.5 rounded-lg border border-bunny-border text-bunny-danger hover:bg-rose-50 hover:border-rose-300 transition-colors"
                      onClick={() => onDelete(p)}
                      title="Eliminar producto"
                    >
                      <FiTrash2 className="text-xs" />
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
