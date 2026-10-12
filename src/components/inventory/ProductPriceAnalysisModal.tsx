import React, { useEffect, useState } from 'react';
import { FiTrendingUp, FiTrendingDown, FiMinus } from 'react-icons/fi';
import { inventoryApi } from '@/api/inventory.api';
import { ProductPriceAnalysis } from '@/types/inventory.types';
import { useToast } from '@/hooks/useToast';
import { formatCurrencyCLP } from '@/utils/formatters';
import { Modal, Button, Badge, Spinner, Alert } from '@/components/ui';

interface Props {
  show: boolean;
  productId: number | null;
  onHide: () => void;
}

export const ProductPriceAnalysisModal: React.FC<Props> = ({ show, productId, onHide }) => {
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<ProductPriceAnalysis | null>(null);

  useEffect(() => {
    if (!show || !productId) return;

    const load = async () => {
      setLoading(true);
      try {
        const data = await inventoryApi.getPriceAnalysis(productId);
        setAnalysis(data);
      } catch (err) {
        console.error('Error loading price analysis:', err);
        toast.error('Error al cargar historial de precios');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [show, productId, toast]);

  if (!show || !productId) return null;

  const renderTrendBadge = (trend: string, varPct: number) => {
    if (trend === 'UP') {
      return (
        <Badge variant="danger" className="gap-1 inline-flex items-center text-xs py-1 px-2.5">
          <FiTrendingUp /> +{varPct.toFixed(1)}% Más Caro
        </Badge>
      );
    }
    if (trend === 'DOWN') {
      return (
        <Badge variant="success" className="gap-1 inline-flex items-center text-xs py-1 px-2.5">
          <FiTrendingDown /> {varPct.toFixed(1)}% Más Barato
        </Badge>
      );
    }
    if (trend === 'EQUAL') {
      return (
        <Badge variant="neutral" className="gap-1 inline-flex items-center text-xs py-1 px-2.5">
          <FiMinus /> Sin Cambio de Precio
        </Badge>
      );
    }
    return <Badge variant="info" className="text-xs py-1 px-2.5">Primer Registro</Badge>;
  };

  return (
    <Modal show={show} onHide={onHide} size="xl" centered>
      <Modal.Header closeButton>
        <Modal.Title>
          📈 Análisis de Variación de Precios de Compra
        </Modal.Title>
      </Modal.Header>

      <Modal.Body className="space-y-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 text-bunny-text-muted">
            <Spinner size="lg" variant="primary" />
            <p className="mt-2 text-xs">Cargando análisis de precios...</p>
          </div>
        ) : !analysis ? (
          <p className="text-bunny-text-muted text-center py-6 text-sm">No se encontraron datos del producto.</p>
        ) : (
          <>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-bunny-border/60 pb-3">
              <div>
                <h4 className="text-base font-bold text-bunny-cocoa m-0">{analysis.productName}</h4>
                <span className="text-xs text-bunny-text-muted block mt-0.5">
                  Total compras registradas: {analysis.totalPurchasesCount}
                </span>
              </div>
              <div>{renderTrendBadge(analysis.trend, analysis.priceVariationPercentage)}</div>
            </div>

            {/* Tarjetas de Métricas de Precios */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-bunny-paper/60 border border-bunny-border rounded-xl p-3 text-center">
                <span className="text-xs text-bunny-text-muted font-medium block">Último Precio</span>
                <span className="text-base font-bold text-bunny-cocoa">
                  {formatCurrencyCLP(analysis.lastPurchasePrice)}
                </span>
              </div>
              <div className="bg-bunny-paper/60 border border-bunny-border rounded-xl p-3 text-center">
                <span className="text-xs text-bunny-text-muted font-medium block">Precio Promedio</span>
                <span className="text-base font-bold text-bunny-primary-dark">
                  {formatCurrencyCLP(analysis.averagePurchasePrice)}
                </span>
              </div>
              <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3 text-center">
                <span className="text-xs text-emerald-800 font-medium block">Precio Mínimo</span>
                <span className="text-base font-bold text-emerald-700">
                  {formatCurrencyCLP(analysis.minPurchasePrice)}
                </span>
              </div>
              <div className="bg-rose-50/70 border border-rose-200 rounded-xl p-3 text-center">
                <span className="text-xs text-rose-800 font-medium block">Precio Máximo</span>
                <span className="text-base font-bold text-bunny-danger">
                  {formatCurrencyCLP(analysis.maxPurchasePrice)}
                </span>
              </div>
            </div>

            {/* Tabla de Histórico de Compras */}
            <div>
              <h5 className="text-xs font-bold text-bunny-text-muted uppercase tracking-wider mb-2">
                Historial Cronológico de Compras:
              </h5>
              {analysis.purchaseHistory.length === 0 ? (
                <Alert variant="info">
                  Aún no hay compras registradas en el historial para este producto.
                </Alert>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-bunny-border">
                  <table className="w-full text-left text-sm border-collapse">
                    <thead>
                      <tr className="bg-bunny-paper/70 border-b border-bunny-border text-xs font-semibold text-bunny-text-muted uppercase">
                        <th className="py-2.5 px-3">Fecha Compra</th>
                        <th className="py-2.5 px-3">Cantidad</th>
                        <th className="py-2.5 px-3">Precio Unitario</th>
                        <th className="py-2.5 px-3">Variación</th>
                        <th className="py-2.5 px-3">Total Pagado</th>
                        <th className="py-2.5 px-3">Referencia / Proveedor</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-bunny-border/60">
                      {analysis.purchaseHistory.map((h, i) => {
                        const isUp = h.variationFromPrevious > 0;
                        const isDown = h.variationFromPrevious < 0;

                        return (
                          <tr key={h.movementId} className="hover:bg-bunny-blush/20 transition-colors">
                            <td className="py-2.5 px-3 text-xs text-bunny-text-muted whitespace-nowrap">
                              {h.purchaseDate ? new Date(h.purchaseDate).toLocaleDateString('es-CL') : '—'}
                            </td>
                            <td className="py-2.5 px-3 text-xs font-medium text-bunny-cocoa">
                              {h.purchaseQuantity} {h.purchaseUnit}
                            </td>
                            <td className="py-2.5 px-3 text-xs font-semibold text-bunny-cocoa">
                              {formatCurrencyCLP(h.unitPurchasePrice)}
                            </td>
                            <td className="py-2.5 px-3">
                              {i === analysis.purchaseHistory.length - 1 ? (
                                <span className="text-bunny-text-muted text-xs">—</span>
                              ) : isUp ? (
                                <Badge variant="danger" className="text-[10px]">
                                  ▲ +{h.variationFromPrevious.toFixed(1)}%
                                </Badge>
                              ) : isDown ? (
                                <Badge variant="success" className="text-[10px]">
                                  ▼ {h.variationFromPrevious.toFixed(1)}%
                                </Badge>
                              ) : (
                                <Badge variant="neutral" className="text-[10px]">
                                  = 0%
                                </Badge>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-xs font-bold text-bunny-cocoa">
                              {formatCurrencyCLP(h.totalPaid)}
                            </td>
                            <td className="py-2.5 px-3 text-xs text-bunny-text-muted">
                              {h.reference || '—'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
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

export default ProductPriceAnalysisModal;
