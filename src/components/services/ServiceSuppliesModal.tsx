import React, { useEffect, useState } from 'react';
import { Modal, Button, Table, Form, Row, Col, Badge, Alert, Spinner } from 'react-bootstrap';
import { FiPlus, FiTrash2, FiInfo } from 'react-icons/fi';
import { Product } from '@/types/inventory.types';
import { ServiceCatalog } from '@/types/service.types';
import { inventoryApi } from '@/api/inventory.api';
import { useToast } from '@/hooks/useToast';
import { formatCurrencyCLP } from '@/utils/formatters';

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
  }, [show, service]);

  const handleAddRow = () => {
    if (products.length === 0) {
      toast.error('No hay productos creados en el inventario');
      return;
    }
    // Pick the first product not already in rows
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

  // Cost calculation
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

    // Check for duplicate products
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
    <Modal show={show} onHide={onHide} size="lg" centered>
      <Modal.Header closeButton style={{ background: '#fdf4f2', borderBottom: '1px solid #eed0c5' }}>
        <Modal.Title style={{ color: '#422314', fontSize: '1.15rem', fontWeight: 700 }}>
          🧪 Insumos y Receta: {service.name}
        </Modal.Title>
      </Modal.Header>

      <Modal.Body className="p-3">
        <Alert variant="info" className="py-2 px-3 mb-3 d-flex align-items-center gap-2 small">
          <FiInfo size={18} className="flex-shrink-0" />
          <div>
            Define qué insumos y cantidades en <strong>unidad de consumo</strong> (ej. <em>ml, gr, unidades</em>)
            se utilizarán por defecto en cada atención de este servicio.
          </div>
        </Alert>

        {loading ? (
          <div className="text-center py-4">
            <Spinner animation="border" variant="primary" />
            <p className="mt-2 text-muted small">Cargando insumos...</p>
          </div>
        ) : (
          <>
            {/* Métricas de Costo y Margen */}
            <Row className="g-2 mb-3">
              <Col sm={4}>
                <div
                  style={{
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '10px',
                    padding: '10px',
                    textAlign: 'center',
                  }}
                >
                  <div className="text-muted small">Precio Venta Servicio</div>
                  <div className="fw-bold fs-6 text-dark">{formatCurrencyCLP(servicePrice)}</div>
                </div>
              </Col>
              <Col sm={4}>
                <div
                  style={{
                    background: '#fff1f2',
                    border: '1px solid #fecdd3',
                    borderRadius: '10px',
                    padding: '10px',
                    textAlign: 'center',
                  }}
                >
                  <div className="text-muted small">Costo Total Insumos</div>
                  <div className="fw-bold fs-6 text-danger">{formatCurrencyCLP(Math.round(totalMaterialsCost))}</div>
                </div>
              </Col>
              <Col sm={4}>
                <div
                  style={{
                    background: '#f0fdf4',
                    border: '1px solid #bbf7d0',
                    borderRadius: '10px',
                    padding: '10px',
                    textAlign: 'center',
                  }}
                >
                  <div className="text-muted small">Margen de Ganancia</div>
                  <div className="fw-bold fs-6 text-success">
                    {formatCurrencyCLP(Math.round(grossMargin))} ({grossMarginPct.toFixed(1)}%)
                  </div>
                </div>
              </Col>
            </Row>

            {/* Tabla de Insumos */}
            <div className="table-responsive mb-3">
              <Table hover className="mb-0 align-middle" style={{ fontSize: '0.9rem' }}>
                <thead className="table-light">
                  <tr>
                    <th style={{ width: '45%' }}>Producto (Inventario)</th>
                    <th style={{ width: '25%' }}>Cantidad Usada</th>
                    <th style={{ width: '20%' }}>Costo Estimado</th>
                    <th style={{ width: '10%', textAlign: 'center' }}>Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="text-center py-4 text-muted">
                        No hay insumos asignados a este servicio aún. Haz clic en <strong>"+ Agregar Insumo"</strong>.
                      </td>
                    </tr>
                  ) : (
                    calculatedItems.map((item, idx) => (
                      <tr key={idx}>
                        <td>
                          <Form.Select
                            size="sm"
                            value={item.productId}
                            onChange={(e) => handleProductChange(idx, Number(e.target.value))}
                          >
                            {products.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name} ({p.stockConsumptionUnit} {p.consumptionUnit} disponibles)
                              </option>
                            ))}
                          </Form.Select>
                          <small className="text-muted d-block mt-1">
                            Costo unitario: {formatCurrencyCLP(item.unitCost)} / {item.product?.consumptionUnit}
                          </small>
                        </td>
                        <td>
                          <div className="d-flex align-items-center gap-1">
                            <Form.Control
                              type="number"
                              size="sm"
                              step="0.01"
                              min="0.0001"
                              value={item.quantity}
                              onChange={(e) => handleQuantityChange(idx, parseFloat(e.target.value) || 0)}
                              style={{ width: '90px' }}
                            />
                            <Badge bg="secondary" style={{ fontSize: '0.75rem' }}>
                              {item.product?.consumptionUnit || 'unidades'}
                            </Badge>
                          </div>
                        </td>
                        <td>
                          <span className="fw-semibold text-dark">
                            {formatCurrencyCLP(Math.round(item.totalCost))}
                          </span>
                        </td>
                        <td className="text-center">
                          <Button
                            variant="outline-danger"
                            size="sm"
                            onClick={() => handleRemoveRow(idx)}
                            title="Eliminar insumo"
                          >
                            <FiTrash2 />
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </Table>
            </div>

            <Button
              variant="outline-primary"
              size="sm"
              onClick={handleAddRow}
              className="d-flex align-items-center gap-1 mb-2"
            >
              <FiPlus /> Agregar Insumo
            </Button>
          </>
        )}
      </Modal.Body>

      <Modal.Footer>
        <Button variant="secondary" onClick={onHide} disabled={saving}>
          Cancelar
        </Button>
        <Button variant="primary" onClick={handleSave} disabled={saving || loading}>
          {saving ? 'Guardando...' : 'Guardar Receta'}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default ServiceSuppliesModal;
