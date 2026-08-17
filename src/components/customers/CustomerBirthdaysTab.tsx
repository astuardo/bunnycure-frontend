import React, { useState, useMemo } from 'react';
import { Row, Col, Card, Badge, Button, Form, Table, Spinner } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { FaWhatsapp, FaEye, FaCheckCircle, FaSearch, FaTimes, FaBirthdayCake } from 'react-icons/fa';
import { FiClock, FiGift, FiRefreshCw } from 'react-icons/fi';
import { Customer } from '../../types/customer.types';
import { BirthdayCustomer } from '../../types/birthday.types';
import {
  computeBirthdayCustomers,
  recordBirthdayGreeting,
  clearBirthdayGreeting,
  buildBirthdayGreetingMessage,
  buildBirthdayWhatsAppUrl,
} from '../../utils/birthdayUtils';
import { BirthdayMessageModal } from './BirthdayMessageModal';
import { useToast } from '../../hooks/useToast';

interface CustomerBirthdaysTabProps {
  customers: Customer[];
  loading?: boolean;
}

const MONTHS = [
  { value: 0, label: '📅 Todos los meses' },
  { value: 1, label: 'Enero' },
  { value: 2, label: 'Febrero' },
  { value: 3, label: 'Marzo' },
  { value: 4, label: 'Abril' },
  { value: 5, label: 'Mayo' },
  { value: 6, label: 'Junio' },
  { value: 7, label: 'Julio' },
  { value: 8, label: 'Agosto' },
  { value: 9, label: 'Septiembre' },
  { value: 10, label: 'Octubre' },
  { value: 11, label: 'Noviembre' },
  { value: 12, label: 'Diciembre' },
];

export const CustomerBirthdaysTab: React.FC<CustomerBirthdaysTabProps> = ({ customers, loading = false }) => {
  const navigate = useNavigate();
  const toast = useToast();

  const currentMonthNumber = new Date().getMonth() + 1;
  const [selectedMonth, setSelectedMonth] = useState<number>(currentMonthNumber);
  const [quickFilter, setQuickFilter] = useState<'ALL' | 'TODAY' | 'NEXT_7_DAYS' | 'THIS_MONTH'>('THIS_MONTH');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomerForModal, setSelectedCustomerForModal] = useState<BirthdayCustomer | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Computar todas las cumpleañeras
  const { birthdayCustomers, metrics } = useMemo(() => {
    return computeBirthdayCustomers(customers);
  }, [customers, refreshTrigger]);

  // Filtrado reactivo según mes, filtro rápido y buscador
  const filteredCustomers = useMemo(() => {
    return birthdayCustomers.filter((bc) => {
      // 1. Filtro por Mes
      if (selectedMonth > 0 && bc.birthMonthNumber !== selectedMonth) {
        return false;
      }

      // 2. Filtro Rápido
      if (quickFilter === 'TODAY' && !bc.isToday) return false;
      if (quickFilter === 'NEXT_7_DAYS' && !bc.isNext7Days) return false;
      if (quickFilter === 'THIS_MONTH' && !bc.isThisMonth) return false;

      // 3. Buscador de Texto
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const name = (bc.customer.fullName || '').toLowerCase();
        const rut = ((bc.customer as any).rut || '').toLowerCase();
        const phone = (bc.customer.phone || '').toLowerCase();
        return name.includes(q) || rut.includes(q) || phone.includes(q);
      }

      return true;
    });
  }, [birthdayCustomers, selectedMonth, quickFilter, searchQuery]);

  const handleOpenModal = (bc: BirthdayCustomer) => {
    setSelectedCustomerForModal(bc);
    setShowModal(true);
  };

  const handleDirectWhatsApp = (bc: BirthdayCustomer) => {
    if (!bc.customer.phone) {
      toast.error('La clienta no tiene un teléfono registrado');
      return;
    }
    const name = bc.customer.fullName || 'Clienta';
    const message = buildBirthdayGreetingMessage(name, 'DISCOUNT');
    const url = buildBirthdayWhatsAppUrl(bc.customer.phone, message);

    recordBirthdayGreeting(bc.customer.id);
    window.open(url, '_blank', 'noopener,noreferrer');
    toast.success(`🎂 Saludo de cumpleaños enviado a ${name}`);
    setRefreshTrigger((prev) => prev + 1);
  };

  const handleResetGreeting = (bc: BirthdayCustomer) => {
    clearBirthdayGreeting(bc.customer.id);
    toast.info(`Estado de saludo restablecido para ${bc.customer.fullName}`);
    setRefreshTrigger((prev) => prev + 1);
  };

  if (loading) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" style={{ color: '#8c2a3e' }} />
        <p className="mt-3 text-muted">Cargando clientas y fechas de cumpleaños...</p>
      </div>
    );
  }

  return (
    <div className="customer-birthdays-tab">
      {/* ══ 1. Tarjetas KPI Resumen de Cumpleaños ══════════════════════════ */}
      <Row className="g-3 mb-4">
        <Col xs={6} md={3}>
          <Card className="border-0 shadow-sm h-100" style={{ borderRadius: '14px', background: '#fff', borderLeft: '4px solid #8c2a3e' }}>
            <Card.Body className="p-3">
              <div className="d-flex justify-content-between align-items-center mb-1">
                <span style={{ fontSize: '12px', color: '#8c6052', fontWeight: 600 }}>CUMPLE ESTE MES</span>
                <FaBirthdayCake style={{ color: '#8c2a3e' }} />
              </div>
              <h3 className="fw-bold mb-0" style={{ color: '#422314' }}>
                {metrics.totalThisMonth}
              </h3>
              <small className="text-muted" style={{ fontSize: '11px' }}>
                {MONTHS.find((m) => m.value === currentMonthNumber)?.label}
              </small>
            </Card.Body>
          </Card>
        </Col>

        <Col xs={6} md={3}>
          <Card
            className="border-0 shadow-sm h-100"
            style={{
              borderRadius: '14px',
              background: metrics.totalToday > 0 ? '#fff5f7' : '#fff',
              borderLeft: '4px solid #e11d48',
            }}
          >
            <Card.Body className="p-3">
              <div className="d-flex justify-content-between align-items-center mb-1">
                <span style={{ fontSize: '12px', color: '#e11d48', fontWeight: 700 }}>¡CUMPLEN HOY! 🎉</span>
                <FiGift style={{ color: '#e11d48' }} />
              </div>
              <h3 className="fw-bold mb-0" style={{ color: '#be123c' }}>
                {metrics.totalToday}
              </h3>
              <small style={{ color: '#e11d48', fontSize: '11px', fontWeight: 600 }}>
                {metrics.totalToday > 0 ? '¡Saludar ahora!' : 'Ninguna hoy'}
              </small>
            </Card.Body>
          </Card>
        </Col>

        <Col xs={6} md={3}>
          <Card className="border-0 shadow-sm h-100" style={{ borderRadius: '14px', background: '#fff', borderLeft: '4px solid #d97706' }}>
            <Card.Body className="p-3">
              <div className="d-flex justify-content-between align-items-center mb-1">
                <span style={{ fontSize: '12px', color: '#d97706', fontWeight: 600 }}>PRÓXIMOS 7 DÍAS</span>
                <FiClock style={{ color: '#d97706' }} />
              </div>
              <h3 className="fw-bold mb-0" style={{ color: '#b45309' }}>
                {metrics.totalNext7Days}
              </h3>
              <small className="text-muted" style={{ fontSize: '11px' }}>
                Para agendar turnos
              </small>
            </Card.Body>
          </Card>
        </Col>

        <Col xs={6} md={3}>
          <Card className="border-0 shadow-sm h-100" style={{ borderRadius: '14px', background: '#fff', borderLeft: '4px solid #16a34a' }}>
            <Card.Body className="p-3">
              <div className="d-flex justify-content-between align-items-center mb-1">
                <span style={{ fontSize: '12px', color: '#16a34a', fontWeight: 600 }}>SALUDADAS ESTE AÑO</span>
                <FaCheckCircle style={{ color: '#16a34a' }} />
              </div>
              <h3 className="fw-bold mb-0" style={{ color: '#15803d' }}>
                {metrics.totalGreetedThisYear}
              </h3>
              <small className="text-muted" style={{ fontSize: '11px' }}>
                {new Date().getFullYear()}
              </small>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* ══ 2. Barra de Filtros y Buscador ═════════════════════════════════ */}
      <Card className="border-0 shadow-sm mb-4" style={{ borderRadius: '14px', background: '#fff' }}>
        <Card.Body className="p-3">
          <Row className="g-2 align-items-center">
            <Col xs={12} md={3}>
              <Form.Select
                size="sm"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                style={{ borderRadius: '8px', borderColor: '#eed0c5', fontWeight: 600, color: '#422314' }}
              >
                {MONTHS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </Form.Select>
            </Col>

            <Col xs={12} md={5}>
              <div className="d-flex gap-1 flex-wrap">
                <Button
                  size="sm"
                  variant={quickFilter === 'THIS_MONTH' ? 'primary' : 'outline-secondary'}
                  onClick={() => {
                    setQuickFilter('THIS_MONTH');
                    setSelectedMonth(currentMonthNumber);
                  }}
                  style={{
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontWeight: 600,
                    background: quickFilter === 'THIS_MONTH' ? '#8c2a3e' : 'transparent',
                    borderColor: '#8c2a3e',
                    color: quickFilter === 'THIS_MONTH' ? '#fff' : '#8c2a3e',
                  }}
                >
                  🎂 Este Mes
                </Button>
                <Button
                  size="sm"
                  variant={quickFilter === 'TODAY' ? 'danger' : 'outline-danger'}
                  onClick={() => {
                    setQuickFilter('TODAY');
                    setSelectedMonth(0);
                  }}
                  style={{ borderRadius: '8px', fontSize: '12px', fontWeight: 600 }}
                >
                  🎉 Cumplen Hoy ({metrics.totalToday})
                </Button>
                <Button
                  size="sm"
                  variant={quickFilter === 'NEXT_7_DAYS' ? 'warning' : 'outline-warning'}
                  onClick={() => {
                    setQuickFilter('NEXT_7_DAYS');
                    setSelectedMonth(0);
                  }}
                  style={{ borderRadius: '8px', fontSize: '12px', fontWeight: 600 }}
                >
                  ⏳ 7 Días
                </Button>
                <Button
                  size="sm"
                  variant={quickFilter === 'ALL' ? 'secondary' : 'outline-secondary'}
                  onClick={() => {
                    setQuickFilter('ALL');
                    setSelectedMonth(0);
                  }}
                  style={{ borderRadius: '8px', fontSize: '12px' }}
                >
                  Todos
                </Button>
              </div>
            </Col>

            <Col xs={12} md={4}>
              <div className="position-relative">
                <Form.Control
                  type="text"
                  size="sm"
                  placeholder="Buscar clienta, RUT, teléfono..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ borderRadius: '8px', borderColor: '#eed0c5', paddingLeft: '32px' }}
                />
                <FaSearch
                  style={{
                    position: 'absolute',
                    left: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#8c6052',
                    fontSize: '12px',
                  }}
                />
                {searchQuery && (
                  <FaTimes
                    onClick={() => setSearchQuery('')}
                    style={{
                      position: 'absolute',
                      right: '10px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: '#8c6052',
                      cursor: 'pointer',
                      fontSize: '12px',
                    }}
                  />
                )}
              </div>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* ══ 3. Listado de Cumpleañeras ══════════════════════════════════════ */}
      <Card className="border-0 shadow-sm" style={{ borderRadius: '14px', background: '#fff', overflow: 'hidden' }}>
        <Card.Header className="py-2.5 px-3 bg-transparent border-0 d-flex justify-content-between align-items-center">
          <div className="d-flex align-items-center gap-2">
            <FaBirthdayCake style={{ color: '#8c2a3e' }} />
            <span className="fw-bold" style={{ color: '#422314', fontSize: '0.95rem' }}>
              Cumpleañeras ({filteredCustomers.length})
            </span>
          </div>
          {metrics.totalWithoutBirthDate > 0 && (
            <small style={{ color: '#8c6052', fontSize: '11px' }}>
              ℹ️ {metrics.totalWithoutBirthDate} clientas sin fecha de nacimiento en su ficha
            </small>
          )}
        </Card.Header>

        <div className="table-responsive">
          <Table hover className="align-middle mb-0" style={{ fontSize: '13px' }}>
            <thead style={{ background: '#fdf4f2', color: '#8c6052', borderBottom: '1px solid #eed0c5' }}>
              <tr>
                <th className="ps-3">Clienta</th>
                <th>Fecha de Cumpleaños</th>
                <th>Edad a Cumplir</th>
                <th>Estado</th>
                <th>Saludo {new Date().getFullYear()}</th>
                <th className="text-end pe-3">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-5 text-muted">
                    <FaBirthdayCake size={32} className="mb-2 text-muted opacity-50" />
                    <div>No hay cumpleañeras registradas con los filtros seleccionados.</div>
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((bc) => (
                  <tr key={bc.customer.id} style={{ background: bc.isToday ? '#fff8f9' : 'transparent' }}>
                    <td className="ps-3">
                      <div className="fw-bold" style={{ color: '#422314' }}>
                        {bc.customer.fullName}
                      </div>
                      <small className="text-muted" style={{ fontSize: '11px' }}>
                        {(bc.customer as any).rut ? `RUT: ${(bc.customer as any).rut} • ` : ''}
                        📱 {bc.customer.phone || 'Sin teléfono'}
                      </small>
                    </td>

                    <td>
                      <div className="fw-semibold" style={{ color: '#8c2a3e' }}>
                        {bc.formattedBirthDay}
                      </div>
                      <small className="text-muted" style={{ fontSize: '11px' }}>
                        {bc.birthDate}
                      </small>
                    </td>

                    <td>
                      {bc.ageToTurn ? (
                        <Badge bg="light" text="dark" style={{ border: '1px solid #eed0c5', fontWeight: 600 }}>
                          {bc.ageToTurn} años
                        </Badge>
                      ) : (
                        <span className="text-muted">-</span>
                      )}
                    </td>

                    <td>
                      {bc.isToday ? (
                        <Badge bg="danger" className="animate-pulse" style={{ fontSize: '11px', padding: '5px 8px' }}>
                          🎉 ¡CUMPLE HOY!
                        </Badge>
                      ) : bc.isNext7Days ? (
                        <Badge bg="warning" text="dark" style={{ fontSize: '11px', padding: '5px 8px' }}>
                          En {bc.daysUntilBirthday} día(s)
                        </Badge>
                      ) : bc.isThisMonth ? (
                        <Badge bg="light" text="dark" style={{ border: '1px solid #eed0c5' }}>
                          Este mes
                        </Badge>
                      ) : (
                        <span className="text-muted small">Mes {bc.birthMonthNumber}</span>
                      )}
                    </td>

                    <td>
                      {bc.alreadyGreetedThisYear ? (
                        <div className="d-flex align-items-center gap-1">
                          <Badge bg="success" style={{ fontSize: '10px' }}>
                            <FaCheckCircle className="me-1" /> Saludada
                          </Badge>
                          <Button
                            variant="link"
                            size="sm"
                            className="p-0 text-muted ms-1"
                            title="Restablecer para volver a enviar"
                            onClick={() => handleResetGreeting(bc)}
                            style={{ fontSize: '11px' }}
                          >
                            <FiRefreshCw />
                          </Button>
                        </div>
                      ) : (
                        <Badge bg="secondary" style={{ fontSize: '10px', opacity: 0.6 }}>
                          Pendiente
                        </Badge>
                      )}
                    </td>

                    <td className="text-end pe-3">
                      <div className="d-flex gap-1 justify-content-end align-items-center">
                        <Button
                          size="sm"
                          variant="success"
                          onClick={() => handleDirectWhatsApp(bc)}
                          disabled={!bc.customer.phone}
                          style={{
                            borderRadius: '8px',
                            background: '#25D366',
                            borderColor: '#25D366',
                            fontWeight: 600,
                            fontSize: '12px',
                            padding: '5px 10px',
                          }}
                        >
                          <FaWhatsapp className="me-1" /> Saludar
                        </Button>

                        <Button
                          size="sm"
                          variant="outline-secondary"
                          onClick={() => handleOpenModal(bc)}
                          title="Personalizar mensaje y regalo"
                          style={{ borderRadius: '8px', fontSize: '12px', padding: '5px 8px' }}
                        >
                          <FiGift />
                        </Button>

                        <Button
                          size="sm"
                          variant="light"
                          onClick={() => navigate(`/customers/${bc.customer.id}`)}
                          title="Ver Ficha Completa"
                          style={{ borderRadius: '8px', fontSize: '12px', padding: '5px 8px', border: '1px solid #eed0c5' }}
                        >
                          <FaEye />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </Table>
        </div>
      </Card>

      {/* Modal de Saludo Personalizado */}
      <BirthdayMessageModal
        show={showModal}
        onHide={() => setShowModal(false)}
        birthdayCustomer={selectedCustomerForModal}
        onGreetingSent={() => setRefreshTrigger((p) => p + 1)}
      />
    </div>
  );
};

export default CustomerBirthdaysTab;
