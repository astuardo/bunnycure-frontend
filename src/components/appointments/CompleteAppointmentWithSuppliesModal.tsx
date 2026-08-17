import React, { useEffect, useState } from 'react';
import { Modal, Button, Table, Form, Alert, Spinner, Row, Col, Badge } from 'react-bootstrap';
import { FiCheckCircle, FiAlertTriangle, FiPackage, FiFileText } from 'react-icons/fi';
import { FaStar, FaWhatsapp } from 'react-icons/fa';
import { inventoryApi } from '@/api/inventory.api';
import { appointmentsApi } from '@/api/appointments.api';
import { AppointmentSuppliesPreview } from '@/types/inventory.types';
import { Appointment } from '@/types/appointment.types';
import { useToast } from '@/hooks/useToast';
import { formatCurrencyCLP } from '@/utils/formatters';
import { buildGoogleReviewWhatsAppUrl } from '@/utils/appointmentUtils';

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
}

export const CompleteAppointmentWithSuppliesModal: React.FC<Props> = ({
  show,
  appointmentId,
  onHide,
  onCompleted,
}) => {
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [preview, setPreview] = useState<AppointmentSuppliesPreview | null>(null);
  const [appointmentData, setAppointmentData] = useState<Appointment | null>(null);
  const [items, setItems] = useState<EditableItem[]>([]);
  const [generateInvoice, setGenerateInvoice] = useState(true);
  const [sendGoogleReview, setSendGoogleReview] = useState(true);
  const [deductSupplies, setDeductSupplies] = useState(true);
  const [invoiceQuotaInfo, setInvoiceQuotaInfo] = useState<string | null>(null);

  useEffect(() => {
    if (!show || !appointmentId) return;

    const loadData = async () => {
      setLoading(true);
      try {
        const [previewData, quota, aptData] = await Promise.all([
          inventoryApi.getAppointmentSuppliesPreview(appointmentId),
          appointmentsApi.getInvoiceQuota().catch(() => null),
          appointmentsApi.getById(appointmentId).catch(() => null),
        ]);

        setPreview(previewData);
        setAppointmentData(aptData);
        setItems(
          previewData.supplies.map((s) => ({
            productId: s.productId,
            productName: s.productName,
            consumptionUnit: s.consumptionUnit,
            quantity: s.suggestedQuantity,
            currentStock: s.currentStock,
            unitConsumptionCost: s.unitConsumptionCost,
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
  }, [show, appointmentId]);

  const handleQuantityChange = (productId: number, newQty: number) => {
    setItems((prev) =>
      prev.map((item) =>
        item.productId === productId ? { ...item, quantity: Math.max(0, newQty) } : item
      )
    );
  };

  const handleComplete = async (shouldDeduct: boolean) => {
    if (!appointmentId) return;

    setSubmitting(true);
    try {
      await inventoryApi.completeAppointmentWithSupplies({
        appointmentId,
        generateInvoice,
        deductSupplies: shouldDeduct && deductSupplies,
        supplies: items.map((i) => ({
          productId: i.productId,
          quantity: i.quantity,
        })),
      });

      toast.success(
        shouldDeduct && items.length > 0
          ? '✅ Cita completada y stock descontado correctamente'
          : '✅ Cita marcada como completada'
      );

      // Disparo de Google Reviews si está habilitado
      if (sendGoogleReview && appointmentData?.customer) {
        const phone = appointmentData.customer.phone;
        const serviceName = preview?.serviceNames.join(' + ') || appointmentData.service?.name;
        const url = buildGoogleReviewWhatsAppUrl(phone, appointmentData.customer.fullName, serviceName);
        window.open(url, '_blank', 'noopener,noreferrer');
        toast.info(`Abriendo WhatsApp para solicitar reseña a ${appointmentData.customer.fullName}`);
      }

      onCompleted();
      onHide();
    } catch (err: unknown) {
      const error = err as { message?: string };
      toast.error(error.message || 'Error al completar la cita');
    } finally {
      setSubmitting(false);
    }
  };

  if (!show || !appointmentId) return null;

  const totalCost = items.reduce((sum, i) => sum + i.quantity * i.unitConsumptionCost, 0);
  const hasDeficit = items.some((i) => i.currentStock - i.quantity < 0);

  return (
    <Modal show={show} onHide={onHide} size="lg" centered>
      <Modal.Header closeButton style={{ background: '#f0fdf4', borderBottom: '1px solid #bbf7d0' }}>
        <Modal.Title className="d-flex align-items-center gap-2" style={{ color: '#14532d', fontSize: '1.15rem', fontWeight: 700 }}>
          <FiCheckCircle size={22} className="text-success" />
          Completar Cita #{appointmentId}
        </Modal.Title>
      </Modal.Header>

      <Modal.Body className="p-3">
        {loading ? (
          <div className="text-center py-5">
            <Spinner animation="border" variant="success" />
            <p className="mt-2 text-muted small">Cargando receta e insumos...</p>
          </div>
        ) : (
          <>
            {/* Resumen de la Cita */}
            <div
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '10px',
                padding: '12px 16px',
                marginBottom: '16px',
              }}
            >
              <Row className="gy-2">
                <Col sm={6}>
                  <div className="text-muted small">Cliente</div>
                  <div className="fw-bold text-dark">{preview?.customerName}</div>
                </Col>
                <Col sm={6}>
                  <div className="text-muted small">Servicios Realizados</div>
                  <div className="fw-semibold text-dark">
                    {preview?.serviceNames.join(' + ') || 'Servicio'}
                  </div>
                </Col>
              </Row>
            </div>

            {/* Insumos */}
            {items.length === 0 ? (
              <Alert variant="secondary" className="small py-3 px-3 mb-3">
                ℹ️ Los servicios de esta cita no tienen insumos ni receta configurada en el inventario. La cita se completará normalmente.
              </Alert>
            ) : (
              <>
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <div className="fw-bold small text-dark d-flex align-items-center gap-2">
                    <FiPackage className="text-primary" />
                    Insumos a Descontar (Ajusta las cantidades si se usó más o menos):
                  </div>
                  <Form.Check
                    type="switch"
                    id="deduct-switch"
                    label="Descontar stock"
                    checked={deductSupplies}
                    onChange={(e) => setDeductSupplies(e.target.checked)}
                    className="small fw-semibold text-secondary"
                  />
                </div>

                {hasDeficit && deductSupplies && (
                  <Alert variant="warning" className="py-2 px-3 mb-2 small d-flex align-items-center gap-2">
                    <FiAlertTriangle className="flex-shrink-0" size={18} />
                    <div>
                      <strong>Aviso de stock insuficiente:</strong> Uno o más insumos quedarán con saldo negativo para registrar el déficit y poder auditarlo.
                    </div>
                  </Alert>
                )}

                <div className="table-responsive mb-3">
                  <Table hover size="sm" className="mb-0 align-middle" style={{ fontSize: '0.88rem' }}>
                    <thead className="table-light">
                      <tr>
                        <th>Insumo</th>
                        <th style={{ width: '130px' }}>Cantidad Usada</th>
                        <th>Stock Actual</th>
                        <th>Stock Resultante</th>
                        <th className="text-end">Costo Est.</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item) => {
                        const stockAfter = item.currentStock - item.quantity;
                        const isItemDeficit = stockAfter < 0;

                        return (
                          <tr key={item.productId}>
                            <td>
                              <div className="fw-semibold text-dark">{item.productName}</div>
                              <small className="text-muted">{item.consumptionUnit}</small>
                            </td>
                            <td>
                              <Form.Control
                                type="number"
                                size="sm"
                                min={0}
                                step="any"
                                value={item.quantity}
                                onChange={(e) =>
                                  handleQuantityChange(item.productId, parseFloat(e.target.value) || 0)
                                }
                                disabled={!deductSupplies}
                                style={{ width: '100px' }}
                              />
                            </td>
                            <td className="text-muted">
                              {item.currentStock.toFixed(1)} {item.consumptionUnit}
                            </td>
                            <td>
                              <span
                                className={`fw-semibold ${
                                  isItemDeficit && deductSupplies ? 'text-danger' : 'text-success'
                                }`}
                              >
                                {deductSupplies ? stockAfter.toFixed(1) : item.currentStock.toFixed(1)}{' '}
                                {item.consumptionUnit}
                              </span>
                              {isItemDeficit && deductSupplies && (
                                <Badge bg="danger" className="ms-1 small">
                                  Déficit
                                </Badge>
                              )}
                            </td>
                            <td className="text-end text-muted">
                              {formatCurrencyCLP(item.quantity * item.unitConsumptionCost)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot className="table-light">
                      <tr>
                        <td colSpan={4} className="fw-bold text-end">
                          Costo Total de Materiales:
                        </td>
                        <td className="text-end fw-bold text-primary">
                          {formatCurrencyCLP(totalCost)}
                        </td>
                      </tr>
                    </tfoot>
                  </Table>
                </div>
              </>
            )}

            {/* Opción de Boleta */}
            <div
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '10px 14px',
                marginBottom: '10px',
              }}
            >
              <Form.Check
                type="checkbox"
                id="generate-invoice-checkbox"
                label={
                  <span className="d-flex align-items-center gap-2 small fw-semibold text-dark">
                    <FiFileText /> Generar boleta de honorarios para esta cita
                  </span>
                }
                checked={generateInvoice}
                onChange={(e) => setGenerateInvoice(e.target.checked)}
              />
              {invoiceQuotaInfo && (
                <small className="text-muted d-block mt-1 ps-4">{invoiceQuotaInfo}</small>
              )}
            </div>

            {/* Opción de Solicitud Google Reviews */}
            <div
              style={{
                background: '#fffdfb',
                border: '1px solid #fed7aa',
                borderRadius: '8px',
                padding: '10px 14px',
              }}
            >
              <Form.Check
                type="checkbox"
                id="send-google-review-checkbox"
                label={
                  <span className="d-flex align-items-center gap-2 small fw-semibold text-dark">
                    <FaStar className="text-warning" />
                    <FaWhatsapp className="text-success" />
                    Enviar solicitud de valoración en Google Reviews vía WhatsApp
                  </span>
                }
                checked={sendGoogleReview}
                onChange={(e) => setSendGoogleReview(e.target.checked)}
              />
              <small className="text-muted d-block mt-1 ps-4">
                Abre WhatsApp automáticamente con la plantilla oficial y el enlace a Google Reviews (<code>https://g.page/r/CfcuMpxkvLJ3EBM/review</code>).
              </small>
            </div>
          </>
        )}
      </Modal.Body>

      <Modal.Footer className="d-flex justify-content-between flex-wrap gap-2">
        <Button variant="secondary" onClick={onHide} disabled={submitting}>
          Cancelar
        </Button>

        <div className="d-flex gap-2">
          {items.length > 0 && deductSupplies && (
            <Button
              variant="outline-secondary"
              size="sm"
              onClick={() => handleComplete(false)}
              disabled={submitting || loading}
            >
              Completar sin descontar
            </Button>
          )}

          <Button
            variant="success"
            onClick={() => handleComplete(true)}
            disabled={submitting || loading}
            className="d-flex align-items-center gap-1"
          >
            {submitting ? 'Procesando...' : '✅ Confirmar y Completar Cita'}
          </Button>
        </div>
      </Modal.Footer>
    </Modal>
  );
};

export default CompleteAppointmentWithSuppliesModal;
