import { useState, useMemo, useCallback } from 'react';
import { Row, Col, Card, Badge, Button, Form, Table, Spinner, Accordion } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import {
  FaWhatsapp,
  FaCopy,
  FaEye,
  FaCheckCircle,
  FaClock,
  FaTimes,
  FaCommentDots,
  FaInfoCircle,
} from 'react-icons/fa';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Customer } from '@/types/customer.types';
import { Appointment } from '@/types/appointment.types';
import { ServiceCatalog } from '@/types/service.types';
import {
  InactiveCustomer,
  InactivityRange,
  ContactStatusFilter,
  ReactivationFilterOptions,
} from '@/types/reactivation.types';
import {
  computeInactiveCustomers,
  computeSummaryMetrics,
  filterInactiveCustomers,
  recordCustomerContact,
  buildReactivationMessage,
  buildReactivationWhatsAppUrl,
  BUNNYCURE_OFFICIAL_PHONE,
  clearCustomerContact,
} from '@/utils/reactivationUtils';
import ReactivationMessageModal from './ReactivationMessageModal';
import { useToast } from '@/hooks/useToast';

interface CustomerReactivationTabProps {
  customers: Customer[];
  appointments: Appointment[];
  services: ServiceCatalog[];
  loading?: boolean;
}

export default function CustomerReactivationTab({
  customers,
  appointments,
  services,
  loading = false,
}: CustomerReactivationTabProps) {
  const navigate = useNavigate();
  const toast = useToast();

  // Filtros
  const [inactivityRange, setInactivityRange] = useState<InactivityRange>('ALL_20_PLUS');
  const [selectedServiceId, setSelectedServiceId] = useState<number | 'ALL'>('ALL');
  const [contactStatus, setContactStatus] = useState<ContactStatusFilter>('ALL');
  const [search, setSearch] = useState('');

  // Control modal de personalización
  const [modalItem, setModalItem] = useState<InactiveCustomer | null>(null);
  const [showModal, setShowModal] = useState(false);

  // Forzar re-render tras registrar contacto
  const [contactCounter, setContactCounter] = useState(0);

  // 1. Calcular lista base de inactivas
  const allInactive = useMemo(() => {
    if (contactCounter < 0) return [];
    return computeInactiveCustomers(customers, appointments);
  }, [customers, appointments, contactCounter]);

  // 2. Calcular métricas KPI
  const metrics = useMemo(() => {
    return computeSummaryMetrics(allInactive);
  }, [allInactive]);

  // 3. Filtrar según opciones
  const filters: ReactivationFilterOptions = useMemo(
    () => ({
      inactivityRange,
      serviceId: selectedServiceId,
      contactStatus,
      search,
    }),
    [inactivityRange, selectedServiceId, contactStatus, search]
  );

  const filteredInactive = useMemo(() => {
    return filterInactiveCustomers(allInactive, filters);
  }, [allInactive, filters]);

  // Envío WhatsApp 1-clic directo
  const handleQuickWhatsApp = useCallback(
    (item: InactiveCustomer) => {
      if (item.isContactedRecently) {
        const confirmSend = window.confirm(
          `⚠️ ${item.customer.fullName} ya fue contactada hace ${item.daysSinceLastContact} día(s).\n¿Deseas volver a enviarle un mensaje por WhatsApp?`
        );
        if (!confirmSend) return;
      }

      // Grabar contacto
      recordCustomerContact(item.customer.id, item.lastServiceName, 'WHATSAPP');
      setContactCounter((prev) => prev + 1);

      // Armar mensaje sugerido
      const message = buildReactivationMessage({
        customer: item.customer,
        lastServiceName: item.lastServiceName,
        daysSinceLast: item.daysSinceLastAppointment,
        tone: item.daysSinceLastAppointment >= 45 ? 'SPECIAL_OFFER' : item.daysSinceLastAppointment >= 30 ? 'MISS_YOU' : 'MAINTENANCE',
        businessPhone: BUNNYCURE_OFFICIAL_PHONE,
      });

      const url = buildReactivationWhatsAppUrl(item.customer.phone, message);
      window.open(url, '_blank', 'noopener,noreferrer');
      toast.success(`Abriendo WhatsApp para ${item.customer.fullName}`);
    },
    [toast]
  );

  // Copiar mensaje rápido al portapapeles
  const handleQuickCopy = useCallback(
    async (item: InactiveCustomer) => {
      const message = buildReactivationMessage({
        customer: item.customer,
        lastServiceName: item.lastServiceName,
        daysSinceLast: item.daysSinceLastAppointment,
        tone: item.daysSinceLastAppointment >= 45 ? 'SPECIAL_OFFER' : item.daysSinceLastAppointment >= 30 ? 'MISS_YOU' : 'MAINTENANCE',
        businessPhone: BUNNYCURE_OFFICIAL_PHONE,
      });

      try {
        await navigator.clipboard.writeText(message);
        toast.success(`Mensaje copiado para ${item.customer.fullName}`);
      } catch {
        toast.error('Error al copiar al portapapeles');
      }
    },
    [toast]
  );

  const handleOpenCustomizeModal = (item: InactiveCustomer) => {
    setModalItem(item);
    setShowModal(true);
  };

  const handleResetContact = (customerId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    clearCustomerContact(customerId);
    setContactCounter((prev) => prev + 1);
    toast.info('Estado de contacto restablecido a disponible');
  };

  const getInactivityBadge = (days: number) => {
    if (days >= 45) {
      return <Badge bg="danger" className="px-2 py-1">🚨 {days} días (Crítica)</Badge>;
    }
    if (days >= 30) {
      return <Badge bg="warning" text="dark" className="px-2 py-1">⚠️ {days} días (Seguimiento)</Badge>;
    }
    return <Badge bg="info" className="px-2 py-1">💅 {days} días (Mantención)</Badge>;
  };

  return (
    <div className="reactivation-module">
      {/* KPI Stats Cards */}
      <Row className="g-3 mb-4">
        <Col xs={6} md={3} lg={2}>
          <Card
            className={`h-100 border-0 shadow-sm cursor-pointer ${inactivityRange === 'ALL_20_PLUS' ? 'ring-2 ring-primary' : ''}`}
            style={{ background: '#f8fafc', cursor: 'pointer' }}
            onClick={() => setInactivityRange('ALL_20_PLUS')}
          >
            <Card.Body className="p-3">
              <div className="text-muted small fw-semibold">Total Inactivas</div>
              <div className="fs-3 fw-bold text-dark">{metrics.totalInactive20Plus}</div>
              <small className="text-muted">≥20 días sin agendar</small>
            </Card.Body>
          </Card>
        </Col>

        <Col xs={6} md={3} lg={2}>
          <Card
            className="h-100 border-0 shadow-sm"
            style={{ background: '#f0f9ff', cursor: 'pointer' }}
            onClick={() => setInactivityRange('20_TO_29')}
          >
            <Card.Body className="p-3">
              <div className="text-primary small fw-semibold">20 - 29 Días</div>
              <div className="fs-3 fw-bold text-primary">{metrics.maintenance20To29}</div>
              <small className="text-muted">Ventana de mantención</small>
            </Card.Body>
          </Card>
        </Col>

        <Col xs={6} md={3} lg={2}>
          <Card
            className="h-100 border-0 shadow-sm"
            style={{ background: '#fffbeb', cursor: 'pointer' }}
            onClick={() => setInactivityRange('30_TO_44')}
          >
            <Card.Body className="p-3">
              <div className="text-warning small fw-semibold">30 - 44 Días</div>
              <div className="fs-3 fw-bold text-warning">{metrics.followUp30To44}</div>
              <small className="text-muted">Alerta seguimiento</small>
            </Card.Body>
          </Card>
        </Col>

        <Col xs={6} md={3} lg={3}>
          <Card
            className="h-100 border-0 shadow-sm"
            style={{ background: '#fff1f2', cursor: 'pointer' }}
            onClick={() => setInactivityRange('45_PLUS')}
          >
            <Card.Body className="p-3">
              <div className="text-danger small fw-semibold">45+ Días (Críticas)</div>
              <div className="fs-3 fw-bold text-danger">{metrics.critical45Plus}</div>
              <small className="text-muted">Alto riesgo de fuga</small>
            </Card.Body>
          </Card>
        </Col>

        <Col xs={12} md={12} lg={3}>
          <Card className="h-100 border-0 shadow-sm" style={{ background: '#f0fdf4' }}>
            <Card.Body className="p-3">
              <div className="text-success small fw-semibold">Contactadas Recientemente</div>
              <div className="fs-3 fw-bold text-success">{metrics.contactedRecently}</div>
              <small className="text-muted">En los últimos 7 días</small>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Banner de Ayuda / Info de Plantilla Oficial */}
      <Accordion className="mb-4 shadow-sm">
        <Accordion.Item eventKey="0" className="border-0">
          <Accordion.Header>
            <div className="d-flex align-items-center gap-2">
              <FaInfoCircle className="text-primary" />
              <span className="fw-semibold">Ver Plantilla Oficial Meta WhatsApp Cloud API (+56 9 8887 3031)</span>
            </div>
          </Accordion.Header>
          <Accordion.Body className="bg-light">
            <Row className="g-3">
              <Col md={7}>
                <h6 className="fw-bold mb-2">📋 Configuración para Meta Business Manager:</h6>
                <ul className="small text-muted mb-2">
                  <li><strong>Nombre de plantilla:</strong> <code>bunnycure_reactivacion_clienta</code></li>
                  <li><strong>Categoría:</strong> MARKETING | <strong>Idioma:</strong> Español (es)</li>
                  <li><strong>Encabezado:</strong> <code>🐰💅 ¡Te extrañamos en BunnyCure!</code></li>
                  <li><strong>Número de atención oficial:</strong> <code>+56 9 8887 3031</code></li>
                </ul>
                <div className="p-3 bg-white rounded border small font-monospace">
                  ¡Hola &#123;&#123;1&#125;&#125;! 🌸<br /><br />
                  Hace ya unas semanas desde tu último servicio de &#123;&#123;2&#125;&#125; en BunnyCure. Sabemos lo importante que es mantener tus uñitas sanas, bellas y con un cuidado impecable ✨<br /><br />
                  Ya estás en la fecha ideal para tu mantención o para renovar tu diseño favorito 💅💖<br /><br />
                  ¿Te gustaría que te reservemos un espacio esta semana? Puedes responder directamente a este chat (+56988873031) para coordinar tu cita encantadas 🥰
                </div>
              </Col>
              <Col md={5}>
                <h6 className="fw-bold mb-2">⚡ Automatización &amp; Control Anti-Spam:</h6>
                <p className="small text-muted mb-2">
                  El sistema registra automáticamente la fecha y hora de cada envío para evitar contactar a una misma clienta más de una vez por semana.
                </p>
                <div className="alert alert-info py-2 px-3 small mb-0">
                  💡 <strong>Exclusión automática activa:</strong> Cualquier clienta que ya cuente con una cita próxima confirmada o pendiente no figurará en esta lista.
                </div>
              </Col>
            </Row>
          </Accordion.Body>
        </Accordion.Item>
      </Accordion>

      {/* Barra de Filtros */}
      <Card className="mb-4 border-0 shadow-sm">
        <Card.Body className="p-3">
          <Row className="g-3 align-items-center">
            {/* Rango de Inactividad */}
            <Col md={3}>
              <Form.Group>
                <Form.Label className="small fw-semibold mb-1">📅 Días de Inactividad:</Form.Label>
                <Form.Select
                  size="sm"
                  value={inactivityRange}
                  onChange={(e) => setInactivityRange(e.target.value as InactivityRange)}
                >
                  <option value="ALL_20_PLUS">Todos los Inactivos (≥20 días)</option>
                  <option value="20_TO_29">20 - 29 días (Mantención Ideal)</option>
                  <option value="30_TO_44">30 - 44 días (Seguimiento)</option>
                  <option value="45_PLUS">45+ días (Crítico / Fuga)</option>
                </Form.Select>
              </Form.Group>
            </Col>

            {/* Servicio Previo */}
            <Col md={3}>
              <Form.Group>
                <Form.Label className="small fw-semibold mb-1">💅 Servicio Previo:</Form.Label>
                <Form.Select
                  size="sm"
                  value={selectedServiceId}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSelectedServiceId(val === 'ALL' ? 'ALL' : Number(val));
                  }}
                >
                  <option value="ALL">Todos los servicios</option>
                  {services.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>

            {/* Estado Anti-Spam */}
            <Col md={3}>
              <Form.Group>
                <Form.Label className="small fw-semibold mb-1">🛡️ Estado Anti-Spam:</Form.Label>
                <Form.Select
                  size="sm"
                  value={contactStatus}
                  onChange={(e) => setContactStatus(e.target.value as ContactStatusFilter)}
                >
                  <option value="ALL">Todas las clientas</option>
                  <option value="UNCONTACTED">🟢 Solo disponibles (Sin contactar)</option>
                  <option value="CONTACTED_RECENTLY">🟡 Contactadas recientemente (&lt;7d)</option>
                </Form.Select>
              </Form.Group>
            </Col>

            {/* Búsqueda por Texto */}
            <Col md={3}>
              <Form.Group>
                <Form.Label className="small fw-semibold mb-1">🔍 Buscar Clienta:</Form.Label>
                <div className="position-relative">
                  <Form.Control
                    type="text"
                    size="sm"
                    placeholder="Nombre, teléfono o RUT..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                  {search && (
                    <Button
                      variant="link"
                      size="sm"
                      className="position-absolute end-0 top-50 translate-middle-y text-muted p-1 text-decoration-none"
                      onClick={() => setSearch('')}
                    >
                      <FaTimes />
                    </Button>
                  )}
                </div>
              </Form.Group>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Lista de Resultados */}
      <Card className="border-0 shadow-sm">
        <Card.Header className="bg-white py-3 d-flex justify-content-between align-items-center">
          <div className="d-flex align-items-center gap-2">
            <h5 className="mb-0 fs-6 fw-bold">Clientas Inactivas para Reactivación</h5>
            <Badge bg="secondary" pill>
              {filteredInactive.length} resultado(s)
            </Badge>
          </div>
          {(inactivityRange !== 'ALL_20_PLUS' || selectedServiceId !== 'ALL' || contactStatus !== 'ALL' || search) && (
            <Button
              variant="outline-secondary"
              size="sm"
              onClick={() => {
                setInactivityRange('ALL_20_PLUS');
                setSelectedServiceId('ALL');
                setContactStatus('ALL');
                setSearch('');
              }}
              className="py-0 px-2 small"
            >
              Limpiar Filtros
            </Button>
          )}
        </Card.Header>

        <Card.Body className="p-0">
          {loading ? (
            <div className="text-center py-5">
              <Spinner animation="border" variant="primary" />
              <p className="mt-2 text-muted small">Cargando historial de citas y clientes...</p>
            </div>
          ) : filteredInactive.length === 0 ? (
            <div className="text-center py-5">
              <FaCheckCircle className="text-success fs-1 mb-2" />
              <p className="text-muted mb-1 fw-semibold">No hay clientas inactivas que coincidan con los filtros.</p>
              <small className="text-muted">¡Excelente trabajo manteniendo a las clientas agendadas!</small>
            </div>
          ) : (
            <>
              {/* Vista Desktop: Tabla */}
              <div className="d-none d-md-block">
                <Table responsive hover className="mb-0 align-middle">
                  <thead className="table-light small">
                    <tr>
                      <th>Clienta / Contacto</th>
                      <th>Último Servicio Realizado</th>
                      <th className="text-center">Días Inactiva</th>
                      <th>Estado Anti-Spam</th>
                      <th className="text-end">Acciones Rápidas</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredInactive.map((item) => (
                      <tr key={item.customer.id}>
                        {/* Clienta */}
                        <td>
                          <div className="fw-semibold text-dark">{item.customer.fullName}</div>
                          <div className="small text-muted d-flex gap-2">
                            <span>📱 {item.customer.phone || 'Sin teléfono'}</span>
                            {item.customer.rut && <span>• RUT: {item.customer.rut}</span>}
                          </div>
                          {item.customer.instagram && (
                            <div className="small text-primary">
                              📸 {item.customer.instagram.startsWith('@') ? item.customer.instagram : `@${item.customer.instagram}`}
                            </div>
                          )}
                        </td>

                        {/* Último Servicio */}
                        <td>
                          <div className="fw-semibold small text-truncate" style={{ maxWidth: '220px' }}>
                            {item.lastServiceName}
                          </div>
                          <div className="small text-muted">
                            {item.lastAppointmentDate
                              ? `Atendida el ${format(item.lastAppointmentDate, 'dd/MM/yyyy', { locale: es })}`
                              : 'Registrada sin cita previa'}
                          </div>
                          <small className="text-muted">Visitas completadas: {item.totalCompletedVisits}</small>
                        </td>

                        {/* Días Inactiva */}
                        <td className="text-center">{getInactivityBadge(item.daysSinceLastAppointment)}</td>

                        {/* Estado Anti-Spam */}
                        <td>
                          {item.isContactedRecently ? (
                            <div>
                              <Badge bg="warning" text="dark" className="d-inline-flex align-items-center gap-1">
                                <FaClock /> Hace {item.daysSinceLastContact}d
                              </Badge>
                              <div className="mt-1">
                                <button
                                  type="button"
                                  className="btn btn-link p-0 text-muted"
                                  style={{ fontSize: '0.72rem' }}
                                  onClick={(e) => handleResetContact(item.customer.id, e)}
                                >
                                  Restablecer
                                </button>
                              </div>
                            </div>
                          ) : (
                            <Badge bg="success" className="d-inline-flex align-items-center gap-1">
                              <FaCheckCircle /> Disponible
                            </Badge>
                          )}
                        </td>

                        {/* Acciones */}
                        <td className="text-end">
                          <div className="d-inline-flex gap-1">
                            <Button
                              variant="success"
                              size="sm"
                              onClick={() => handleQuickWhatsApp(item)}
                              title="Enviar mensaje WhatsApp en 1-clic"
                              className="d-inline-flex align-items-center gap-1 fw-semibold"
                            >
                              <FaWhatsapp />
                              <span>WhatsApp</span>
                            </Button>

                            <Button
                              variant="outline-primary"
                              size="sm"
                              onClick={() => handleOpenCustomizeModal(item)}
                              title="Previsualizar o personalizar mensaje"
                            >
                              <FaCommentDots />
                            </Button>

                            <Button
                              variant="outline-secondary"
                              size="sm"
                              onClick={() => handleQuickCopy(item)}
                              title="Copiar mensaje al portapapeles"
                            >
                              <FaCopy />
                            </Button>

                            <Button
                              variant="outline-dark"
                              size="sm"
                              onClick={() => navigate(`/customers/${item.customer.id}`)}
                              title="Ver ficha completa de cliente"
                            >
                              <FaEye />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>

              {/* Vista Móvil: Tarjetas */}
              <div className="d-md-none p-3">
                {filteredInactive.map((item) => (
                  <Card key={item.customer.id} className="mb-3 border shadow-sm">
                    <Card.Body className="p-3">
                      <div className="d-flex justify-content-between align-items-start mb-2">
                        <div>
                          <h6 className="fw-bold mb-0">{item.customer.fullName}</h6>
                          <small className="text-muted">📱 {item.customer.phone}</small>
                        </div>
                        <div>{getInactivityBadge(item.daysSinceLastAppointment)}</div>
                      </div>

                      <div className="p-2 mb-2 rounded bg-light small">
                        <div><strong>Último Servicio:</strong> {item.lastServiceName}</div>
                        <div className="text-muted">
                          {item.lastAppointmentDate
                            ? `Fecha: ${format(item.lastAppointmentDate, 'dd/MM/yyyy', { locale: es })}`
                            : 'Sin citas previas'}
                        </div>
                      </div>

                      <div className="d-flex justify-content-between align-items-center mb-3">
                        <small className="text-muted">Anti-Spam:</small>
                        {item.isContactedRecently ? (
                          <Badge bg="warning" text="dark">
                            Contactada hace {item.daysSinceLastContact}d
                          </Badge>
                        ) : (
                          <Badge bg="success">Disponible</Badge>
                        )}
                      </div>

                      <div className="d-grid gap-2">
                        <Button
                          variant="success"
                          size="sm"
                          onClick={() => handleQuickWhatsApp(item)}
                          className="d-flex align-items-center justify-content-center gap-2 fw-semibold"
                        >
                          <FaWhatsapp className="fs-5" /> Enviar WhatsApp (1-clic)
                        </Button>
                        <div className="d-flex gap-2">
                          <Button
                            variant="outline-primary"
                            size="sm"
                            className="flex-fill"
                            onClick={() => handleOpenCustomizeModal(item)}
                          >
                            <FaCommentDots className="me-1" /> Personalizar
                          </Button>
                          <Button
                            variant="outline-secondary"
                            size="sm"
                            className="flex-fill"
                            onClick={() => handleQuickCopy(item)}
                          >
                            <FaCopy className="me-1" /> Copiar
                          </Button>
                          <Button
                            variant="outline-dark"
                            size="sm"
                            onClick={() => navigate(`/customers/${item.customer.id}`)}
                          >
                            <FaEye />
                          </Button>
                        </div>
                      </div>
                    </Card.Body>
                  </Card>
                ))}
              </div>
            </>
          )}
        </Card.Body>
      </Card>

      {/* Modal de Personalización de Mensajes */}
      <ReactivationMessageModal
        show={showModal}
        onHide={() => setShowModal(false)}
        inactiveItem={modalItem}
        onContactRecorded={() => setContactCounter((prev) => prev + 1)}
      />
    </div>
  );
}
