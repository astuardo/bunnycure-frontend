import React, { useEffect, useState } from 'react';
import { Modal, Table, Badge, Spinner, Row, Col, Alert } from 'react-bootstrap';
import { FiTrendingUp, FiTrendingDown, FiMinus } from 'react-icons/fi';
import { inventoryApi } from '@/api/inventory.api';
import { ProductPriceAnalysis } from '@/types/inventory.types';
import { useToast } from '@/hooks/useToast';
import { formatCurrencyCLP } from '@/utils/formatters';

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
  }, [show, productId]);

  if (!show || !productId) return null;

  const renderTrendBadge = (trend: string, varPct: number) => {
    if (trend === 'UP') {
      return (
        <Badge bg="danger" className="d-inline-flex align-items-center gap-1 p-2">
          <FiTrendingUp /> +{varPct.toFixed(1)}% Más Caro
        </Badge>
      );
    }
    if (trend === 'DOWN') {
      return (
        <Badge bg="success" className="d-inline-flex align-items-center gap-1 p-2">
          <FiTrendingDown /> {varPct.toFixed(1)}% Más Barato
        </Badge>
      );
    }
    if (trend === 'EQUAL') {
      return (
        <Badge bg="secondary" className="d-inline-flex align-items-center gap-1 p-2">
          <FiMinus /> Sin Cambio de Precio
        </Badge>
      );
    }
    return <Badge bg="info" className="p-2">Primer Registro</Badge>;
  };

  return (
    <Modal show={show} onHide={onHide} size="lg" centered>
      <Modal.Header closeButton style={{ background: '#fdf4f2', borderBottom: '1px solid #eed0c5' }}>
        <Modal.Title style={{ color: '#422314', fontSize: '1.15rem', fontWeight: 700 }}>
          📈 Análisis de Variación de Precios de Compra
        </Modal.Title>
      </Modal.Header>

      <Modal.Body className="p-3">
        {loading ? (
          <div className="text-center py-5">
            <Spinner animation="border" variant="primary" />
            <p className="mt-2 text-muted small">Cargando análisis de precios...</p>
          </div>
        ) : !analysis ? (
          <p className="text-muted text-center py-4">No se encontraron datos del producto.</p>
        ) : (
          <>
            <div className="d-flex justify-content-between align-items-center mb-3">
              <div>
                <h5 className="mb-0 fw-bold text-dark">{analysis.productName}</h5>
                <small className="text-muted">Total compras registradas: {analysis.totalPurchasesCount}</small>
              </div>
              <div>{renderTrendBadge(analysis.trend, analysis.priceVariationPercentage)}</div>
            </div>

            {/* Tarjetas de Métricas de Precios */}
            <Row className="g-2 mb-3">
              <Col sm={3}>
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '10px', textAlign: 'center' }}>
                  <div className="text-muted small">Último Precio</div>
                  <div className="fw-bold fs-6 text-dark">{formatCurrencyCLP(analysis.lastPurchasePrice)}</div>
                </div>
              </Col>
              <Col sm={3}>
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '10px', textAlign: 'center' }}>
                  <div className="text-muted small">Precio Promedio</div>
                  <div className="fw-bold fs-6 text-primary">{formatCurrencyCLP(analysis.averagePurchasePrice)}</div>
                </div>
              </Col>
              <Col sm={3}>
                <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px', padding: '10px', textAlign: 'center' }}>
                  <div className="text-muted small">Precio Mínimo</div>
                  <div className="fw-bold fs-6 text-success">{formatCurrencyCLP(analysis.minPurchasePrice)}</div>
                </div>
              </Col>
              <Col sm={3}>
                <div style={{ background: '#fff1f2', border: '1px solid #fecdd3', borderRadius: '10px', padding: '10px', textAlign: 'center' }}>
                  <div className="text-muted small">Precio Máximo</div>
                  <div className="fw-bold fs-6 text-danger">{formatCurrencyCLP(analysis.maxPurchasePrice)}</div>
                </div>
              </Col>
            </Row>

            {/* Tabla de Histórico de Compras */}
            <h6 className="fw-bold text-dark mb-2">Historial Cronológico de Compras:</h6>
            {analysis.purchaseHistory.length === 0 ? (
              <Alert variant="secondary" className="small">
                Aún no hay compras registradas en el historial para este producto.
              </Alert>
            ) : (
              <div className="table-responsive">
                <Table hover size="sm" className="mb-0 align-middle" style={{ fontSize: '0.88rem' }}>
                  <thead className="table-light">
                    <tr>
                      <th>Fecha Compra</th>
                      <th>Cantidad</th>
                      <th>Precio Unitario</th>
                      <th>Variación</th>
                      <th>Total Pagado</th>
                      <th>Referencia / Proveedor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analysis.purchaseHistory.map((h, i) => {
                      const isUp = h.variationFromPrevious > 0;
                      const isDown = h.variationFromPrevious < 0;

                      return (
                        <tr key={h.movementId}>
                          <td>
                            <small className="text-muted">
                              {h.purchaseDate ? new Date(h.purchaseDate).toLocaleDateString('es-CL') : '-'}
                            </small>
                          </td>
                          <td>
                            {h.purchaseQuantity} {h.purchaseUnit}
                          </td>
                          <td className="fw-semibold text-dark">{formatCurrencyCLP(h.unitPurchasePrice)}</td>
                          <td>
                            {i === analysis.purchaseHistory.length - 1 ? (
                              <span className="text-muted small">-</span>
                            ) : isUp ? (
                              <Badge bg="danger" style={{ fontSize: '0.72rem' }}>
                                ▲ +{h.variationFromPrevious.toFixed(1)}%
                              </Badge>
                            ) : isDown ? (
                              <Badge bg="success" style={{ fontSize: '0.72rem' }}>
                                ▼ {h.variationFromPrevious.toFixed(1)}%
                              </Badge>
                            ) : (
                              <Badge bg="secondary" style={{ fontSize: '0.72rem' }}>
                                = 0%
                              </Badge>
                            )}
                          </td>
                          <td className="fw-bold text-dark">{formatCurrencyCLP(h.totalPaid)}</td>
                          <td className="text-muted small">{h.reference || '-'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </Table>
              </div>
            )}
          </>
        )}
      </Modal.Body>

      <Modal.Footer>
        <button className="btn btn-secondary" onClick={onHide}>
          Cerrar
        </button>
      </Modal.Footer>
    </Modal>
  );
};

export default ProductPriceAnalysisModal;
