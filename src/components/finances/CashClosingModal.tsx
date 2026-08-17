import React, { useState, useMemo } from 'react';
import { Modal, Button, Badge, Form, Row, Col, Card } from 'react-bootstrap';
import {
  FiDollarSign,
  FiPrinter,
  FiDownload,
  FiCalendar,
  FiCheckCircle,
  FiTrendingUp,
  FiFileText,
  FiLayers,
  FiCreditCard,
  FiPercent,
  FiClock,
} from 'react-icons/fi';
import { format, subDays, subMonths } from 'date-fns';
import { useAppointmentsStore } from '../../stores/appointmentsStore';
import { CashClosingPeriodType } from '../../types/cashClosing.types';
import { calculateCashClosing, exportCashClosingToCSV } from '../../utils/cashClosingUtils';

interface CashClosingModalProps {
  show: boolean;
  onHide: () => void;
}

const formatCurrency = (val: number) => `$${val.toLocaleString('es-CL')}`;

export const CashClosingModal: React.FC<CashClosingModalProps> = ({ show, onHide }) => {
  const { appointments } = useAppointmentsStore();

  const [periodType, setPeriodType] = useState<CashClosingPeriodType>('DAILY');
  const [selectedDateStr, setSelectedDateStr] = useState<string>(() => format(new Date(), 'yyyy-MM-dd'));
  const [selectedMonthStr, setSelectedMonthStr] = useState<string>(() => format(new Date(), 'yyyy-MM'));

  // Fecha de referencia según el tipo de período
  const targetDate = useMemo(() => {
    if (periodType === 'DAILY') {
      const [y, m, d] = selectedDateStr.split('-').map(Number);
      return new Date(y, m - 1, d);
    } else {
      const [y, m] = selectedMonthStr.split('-').map(Number);
      return new Date(y, m - 1, 1);
    }
  }, [periodType, selectedDateStr, selectedMonthStr]);

  // Cálculo en vivo del Cierre de Caja
  const summary = useMemo(() => {
    return calculateCashClosing(appointments, targetDate, periodType);
  }, [appointments, targetDate, periodType]);

  // Accesos rápidos de fecha
  const setQuickToday = () => {
    setPeriodType('DAILY');
    setSelectedDateStr(format(new Date(), 'yyyy-MM-dd'));
  };

  const setQuickYesterday = () => {
    setPeriodType('DAILY');
    setSelectedDateStr(format(subDays(new Date(), 1), 'yyyy-MM-dd'));
  };

  const setQuickThisMonth = () => {
    setPeriodType('MONTHLY');
    setSelectedMonthStr(format(new Date(), 'yyyy-MM'));
  };

  const setQuickLastMonth = () => {
    setPeriodType('MONTHLY');
    setSelectedMonthStr(format(subMonths(new Date(), 1), 'yyyy-MM'));
  };

  const handleExportCSV = () => {
    exportCashClosingToCSV(summary);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <Modal show={show} onHide={onHide} size="xl" centered scrollable dialogClassName="cash-closing-modal-dialog">
      <Modal.Header closeButton style={{ background: '#fdf4f2', borderBottom: '1px solid #eed0c5' }}>
        <div className="d-flex align-items-center gap-2">
          <div
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              background: '#8c2a3e',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '20px',
            }}
          >
            <FiDollarSign />
          </div>
          <div>
            <Modal.Title style={{ color: '#422314', fontSize: '1.2rem', fontWeight: 700 }}>
              Cierre de Caja & Finanzas del Salón
            </Modal.Title>
            <small style={{ color: '#8c6052', fontSize: '0.85rem' }}>
              Resumen contable de atenciones, métodos de pago, costos y boletas
            </small>
          </div>
        </div>
      </Modal.Header>

      <Modal.Body className="p-3 p-md-4" style={{ background: '#fff9f8' }}>
        {/* Barra de Filtros y Tipo de Período */}
        <Card className="border-0 shadow-sm mb-4" style={{ borderRadius: '14px', background: '#fff' }}>
          <Card.Body className="p-3">
            <Row className="g-3 align-items-center">
              <Col xs={12} md={5}>
                <div className="d-flex gap-2">
                  <Button
                    size="sm"
                    variant={periodType === 'DAILY' ? 'primary' : 'outline-secondary'}
                    onClick={() => setPeriodType('DAILY')}
                    style={{
                      borderRadius: '8px',
                      background: periodType === 'DAILY' ? '#8c2a3e' : 'transparent',
                      borderColor: '#8c2a3e',
                      color: periodType === 'DAILY' ? '#fff' : '#8c2a3e',
                      fontWeight: 600,
                    }}
                  >
                    <FiCalendar className="me-1" /> Cierre Diario
                  </Button>
                  <Button
                    size="sm"
                    variant={periodType === 'MONTHLY' ? 'primary' : 'outline-secondary'}
                    onClick={() => setPeriodType('MONTHLY')}
                    style={{
                      borderRadius: '8px',
                      background: periodType === 'MONTHLY' ? '#8c2a3e' : 'transparent',
                      borderColor: '#8c2a3e',
                      color: periodType === 'MONTHLY' ? '#fff' : '#8c2a3e',
                      fontWeight: 600,
                    }}
                  >
                    <FiLayers className="me-1" /> Cierre Mensual
                  </Button>
                </div>
              </Col>

              <Col xs={12} md={4}>
                {periodType === 'DAILY' ? (
                  <Form.Control
                    type="date"
                    size="sm"
                    value={selectedDateStr}
                    onChange={(e) => setSelectedDateStr(e.target.value)}
                    style={{ borderRadius: '8px', borderColor: '#eed0c5' }}
                  />
                ) : (
                  <Form.Control
                    type="month"
                    size="sm"
                    value={selectedMonthStr}
                    onChange={(e) => setSelectedMonthStr(e.target.value)}
                    style={{ borderRadius: '8px', borderColor: '#eed0c5' }}
                  />
                )}
              </Col>

              <Col xs={12} md={3} className="text-md-end">
                <div className="d-flex gap-1 justify-content-md-end flex-wrap">
                  {periodType === 'DAILY' ? (
                    <>
                      <Button size="sm" variant="light" onClick={setQuickToday} style={{ fontSize: '11px', border: '1px solid #eed0c5' }}>
                        Hoy
                      </Button>
                      <Button size="sm" variant="light" onClick={setQuickYesterday} style={{ fontSize: '11px', border: '1px solid #eed0c5' }}>
                        Ayer
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button size="sm" variant="light" onClick={setQuickThisMonth} style={{ fontSize: '11px', border: '1px solid #eed0c5' }}>
                        Este Mes
                      </Button>
                      <Button size="sm" variant="light" onClick={setQuickLastMonth} style={{ fontSize: '11px', border: '1px solid #eed0c5' }}>
                        Mes Anterior
                      </Button>
                    </>
                  )}
                </div>
              </Col>
            </Row>
          </Card.Body>
        </Card>

        {/* Encabezado del Período */}
        <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
          <div>
            <h5 className="mb-0 fw-bold" style={{ color: '#422314' }}>
              📊 Informe de {summary.dateFormattedLabel}
            </h5>
            <small style={{ color: '#8c6052' }}>
              {summary.completedAppointments} cita(s) completada(s) de {summary.totalAppointments} agendada(s)
            </small>
          </div>
          <div className="d-flex gap-2">
            <Button
              size="sm"
              variant="outline-dark"
              onClick={handlePrint}
              style={{ borderRadius: '8px', borderColor: '#c9a898', fontWeight: 600 }}
            >
              <FiPrinter className="me-1" /> Imprimir / PDF
            </Button>
            <Button
              size="sm"
              variant="success"
              onClick={handleExportCSV}
              style={{ borderRadius: '8px', background: '#2e7d32', borderColor: '#2e7d32', fontWeight: 600 }}
            >
              <FiDownload className="me-1" /> Exportar Excel (.csv)
            </Button>
          </div>
        </div>

        {/* Tarjetas KPI de Resumen Financiero */}
        <Row className="g-3 mb-4">
          <Col xs={6} lg={3}>
            <Card className="h-100 border-0 shadow-sm" style={{ borderRadius: '14px', background: '#fff', borderLeft: '4px solid #8c2a3e' }}>
              <Card.Body className="p-3">
                <div className="d-flex justify-content-between align-items-center mb-1">
                  <span style={{ fontSize: '12px', color: '#8c6052', fontWeight: 600 }}>INGRESOS TOTALES</span>
                  <FiDollarSign style={{ color: '#8c2a3e' }} />
                </div>
                <h4 className="fw-bold mb-0" style={{ color: '#422314' }}>
                  {formatCurrency(summary.grossRevenue)}
                </h4>
                <small className="text-success fw-bold" style={{ fontSize: '11px' }}>
                  {summary.completedAppointments} citas pagadas
                </small>
              </Card.Body>
            </Card>
          </Col>

          <Col xs={6} lg={3}>
            <Card className="h-100 border-0 shadow-sm" style={{ borderRadius: '14px', background: '#fff', borderLeft: '4px solid #2e7d32' }}>
              <Card.Body className="p-3">
                <div className="d-flex justify-content-between align-items-center mb-1">
                  <span style={{ fontSize: '12px', color: '#2e7d32', fontWeight: 600 }}>UTILIDAD NETA ESTIMADA</span>
                  <FiTrendingUp style={{ color: '#2e7d32' }} />
                </div>
                <h4 className="fw-bold mb-0" style={{ color: '#1b5e20' }}>
                  {formatCurrency(summary.netProfit)}
                </h4>
                <small className="text-muted" style={{ fontSize: '11px' }}>
                  Margen Bruto: <strong>{summary.grossMarginPercentage}%</strong>
                </small>
              </Card.Body>
            </Card>
          </Col>

          <Col xs={6} lg={3}>
            <Card className="h-100 border-0 shadow-sm" style={{ borderRadius: '14px', background: '#fff', borderLeft: '4px solid #d97706' }}>
              <Card.Body className="p-3">
                <div className="d-flex justify-content-between align-items-center mb-1">
                  <span style={{ fontSize: '12px', color: '#d97706', fontWeight: 600 }}>COSTO DE INSUMOS</span>
                  <FiPercent style={{ color: '#d97706' }} />
                </div>
                <h4 className="fw-bold mb-0" style={{ color: '#92400e' }}>
                  {formatCurrency(summary.estimatedSuppliesCost)}
                </h4>
                <small className="text-muted" style={{ fontSize: '11px' }}>
                  Deducido en recetas
                </small>
              </Card.Body>
            </Card>
          </Col>

          <Col xs={6} lg={3}>
            <Card className="h-100 border-0 shadow-sm" style={{ borderRadius: '14px', background: '#fff', borderLeft: '4px solid #0284c7' }}>
              <Card.Body className="p-3">
                <div className="d-flex justify-content-between align-items-center mb-1">
                  <span style={{ fontSize: '12px', color: '#0284c7', fontWeight: 600 }}>BOLETAS EMITIDAS</span>
                  <FiFileText style={{ color: '#0284c7' }} />
                </div>
                <h4 className="fw-bold mb-0" style={{ color: '#0369a1' }}>
                  {summary.invoicesCount}{' '}
                  <span style={{ fontSize: '13px', fontWeight: 500, color: '#64748b' }}>
                    / {summary.completedAppointments}
                  </span>
                </h4>
                <small className="text-muted" style={{ fontSize: '11px' }}>
                  Total: {formatCurrency(summary.invoicesTotalAmount)}
                </small>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        {/* Desglose de Métodos de Pago */}
        <Card className="border-0 shadow-sm mb-4" style={{ borderRadius: '14px', background: '#fff' }}>
          <Card.Header className="py-2 px-3 bg-transparent border-0 d-flex align-items-center gap-2">
            <FiCreditCard style={{ color: '#8c2a3e' }} />
            <span className="fw-bold" style={{ color: '#422314', fontSize: '0.95rem' }}>
              Desglose por Método de Pago
            </span>
          </Card.Header>
          <Card.Body className="p-3 pt-0">
            {summary.paymentBreakdown.length === 0 ? (
              <p className="text-muted mb-0 small">No hay transacciones registradas en este período.</p>
            ) : (
              <Row className="g-3">
                {summary.paymentBreakdown.map((item) => (
                  <Col xs={12} sm={6} md={3} key={item.methodName}>
                    <div
                      className="p-2.5 rounded-3"
                      style={{
                        background: '#fdf6f3',
                        border: '1px solid #eed0c5',
                        borderRadius: '10px',
                        padding: '10px 12px',
                      }}
                    >
                      <div className="d-flex justify-content-between align-items-center mb-1">
                        <span className="fw-semibold" style={{ fontSize: '13px', color: '#422314' }}>
                          {item.methodName}
                        </span>
                        <Badge bg="light" text="dark" style={{ border: '1px solid #eed0c5', fontSize: '10px' }}>
                          {item.percentage}%
                        </Badge>
                      </div>
                      <div className="d-flex justify-content-between align-items-baseline">
                        <span className="fw-bold" style={{ fontSize: '14px', color: '#8c2a3e' }}>
                          {formatCurrency(item.totalAmount)}
                        </span>
                        <small style={{ color: '#8c6052', fontSize: '11px' }}>{item.count} cita(s)</small>
                      </div>
                    </div>
                  </Col>
                ))}
              </Row>
            )}
          </Card.Body>
        </Card>

        {/* Tabla de Detalle de Citas del Cierre */}
        <Card className="border-0 shadow-sm" style={{ borderRadius: '14px', background: '#fff', overflow: 'hidden' }}>
          <Card.Header className="py-2.5 px-3 bg-transparent border-0 d-flex justify-content-between align-items-center">
            <div className="d-flex align-items-center gap-2">
              <FiClock style={{ color: '#8c2a3e' }} />
              <span className="fw-bold" style={{ color: '#422314', fontSize: '0.95rem' }}>
                Detalle de Citas Atendidas ({summary.transactions.length})
              </span>
            </div>
            <span className="badge" style={{ background: '#fae6e2', color: '#8c2a3e', fontSize: '11px' }}>
              Ticket Promedio: {formatCurrency(summary.averageTicket)}
            </span>
          </Card.Header>
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0" style={{ fontSize: '13px' }}>
              <thead style={{ background: '#fdf4f2', color: '#8c6052', borderBottom: '1px solid #eed0c5' }}>
                <tr>
                  <th className="ps-3">Hora / Fecha</th>
                  <th>Clienta</th>
                  <th>Servicios</th>
                  <th>Método de Pago</th>
                  <th className="text-center">Boleta</th>
                  <th className="text-end">Insumos ($)</th>
                  <th className="text-end pe-3">Valor Cita ($)</th>
                </tr>
              </thead>
              <tbody>
                {summary.transactions.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-4 text-muted">
                      No hay citas completadas en el período seleccionado.
                    </td>
                  </tr>
                ) : (
                  summary.transactions.map((tx) => (
                    <tr key={tx.appointmentId}>
                      <td className="ps-3 fw-semibold" style={{ color: '#422314', whiteSpace: 'nowrap' }}>
                        {tx.appointmentTime}
                        {periodType === 'MONTHLY' && (
                          <div style={{ fontSize: '11px', color: '#8c6052' }}>{tx.appointmentDate}</div>
                        )}
                      </td>
                      <td>
                        <div className="fw-bold" style={{ color: '#422314' }}>
                          {tx.customerName}
                        </div>
                        {tx.customerRut && (
                          <small className="text-muted" style={{ fontSize: '11px' }}>
                            RUT: {tx.customerRut}
                          </small>
                        )}
                      </td>
                      <td>
                        <div style={{ maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {tx.serviceNames.join(' + ')}
                        </div>
                      </td>
                      <td>
                        <Badge bg="light" text="dark" style={{ border: '1px solid #eed0c5', fontWeight: 500 }}>
                          {tx.paymentMethod}
                        </Badge>
                      </td>
                      <td className="text-center">
                        {tx.hasInvoice ? (
                          <Badge bg="success" style={{ fontSize: '10px' }}>
                            <FiCheckCircle className="me-1" /> SÍ
                          </Badge>
                        ) : (
                          <Badge bg="secondary" style={{ fontSize: '10px', opacity: 0.6 }}>
                            NO
                          </Badge>
                        )}
                      </td>
                      <td className="text-end text-muted" style={{ fontSize: '12px' }}>
                        {formatCurrency(tx.estimatedMaterialsCost)}
                      </td>
                      <td className="text-end pe-3 fw-bold" style={{ color: '#8c2a3e' }}>
                        {formatCurrency(tx.totalPrice)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </Modal.Body>

      <Modal.Footer style={{ background: '#fdf4f2', borderTop: '1px solid #eed0c5' }}>
        <div className="d-flex justify-content-between align-items-center w-100 flex-wrap gap-2">
          <small style={{ color: '#8c6052' }}>
            BunnyCure POS &copy; {new Date().getFullYear()} &bull; Todos los valores calculados con reglas de negocio oficiales.
          </small>
          <Button variant="secondary" onClick={onHide} style={{ borderRadius: '8px' }}>
            Cerrar
          </Button>
        </div>
      </Modal.Footer>
    </Modal>
  );
};
