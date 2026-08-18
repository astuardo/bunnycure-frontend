import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container, Row, Col, Card, Button, Table, Badge, Form, Alert, Spinner, Nav } from 'react-bootstrap';
import { format, isValid } from 'date-fns';
import { es } from 'date-fns/locale';
import DashboardLayout from '../../components/common/DashboardLayout';
import StampCard from '../../components/customers/StampCard';
import NailGalleryTab from '../../components/customers/nailProfile/NailGalleryTab';
import { useCustomersStore } from '../../stores/customersStore';
import { useAppointmentsStore } from '../../stores/appointmentsStore';
import { useGiftCardsStore } from '../../stores/giftcardsStore';
import { useToast } from '../../hooks/useToast';
import { Customer } from '../../types/customer.types';
import { Appointment, AppointmentStatus } from '../../types/appointment.types';
import { GiftCard } from '../../types/giftcard.types';
import {
  downloadGiftCardPng,
  printOrDownloadGiftCardPdf,
  sendGiftCardWhatsApp,
  toWhatsAppPhone,
} from '../../utils/giftcardRenderer';
import { normalizeGiftCardPublicUrl } from '../../utils/giftcardUrl';
import { customersApi } from '../../api/customers.api';

export default function CustomerDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();

  const { 
    customers, 
    loading: customersLoading, 
    fetchCustomers,
    adjustCustomerLoyalty 
  } = useCustomersStore();

  const { appointments, isLoading: appointmentsLoading, fetchAppointments } = useAppointmentsStore();
  const { giftCards, loading: giftCardsLoading, fetchGiftCards } = useGiftCardsStore();

  const [directCustomer, setDirectCustomer] = useState<Customer | null>(null);
  const [directCustomerLoading, setDirectCustomerLoading] = useState(false);
  const [notesDraft, setNotesDraft] = useState('');
  const [editingNotes, setEditingNotes] = useState(false);
  const [activeTab, setActiveTab] = useState<'appointments' | 'gallery' | 'giftcards'>('appointments');

  const parseDateSafe = (value: unknown): Date | null => {
    if (!value) return null;
    const date = new Date(value as string | number | Date);
    return isValid(date) ? date : null;
  };

  const formatDateSafe = (value: unknown, pattern: string = 'dd/MM/yyyy'): string => {
    const date = parseDateSafe(value);
    if (!date) return 'No tiene';
    return format(date, pattern, { locale: es });
  };

  useEffect(() => {
    if (id) {
      const cId = Number(id);
      if (Number.isFinite(cId)) {
        setDirectCustomerLoading(true);
        customersApi.getById(cId)
          .then((res) => setDirectCustomer(res))
          .catch((err) => console.error('Error cargando cliente por ID:', err))
          .finally(() => setDirectCustomerLoading(false));
      }
      fetchCustomers();
      fetchAppointments();
      fetchGiftCards();
    }
  }, [id, fetchCustomers, fetchAppointments, fetchGiftCards]);

  const customerId = Number(id);
  const storeCustomer = useMemo<Customer | null>(() => {
    if (!Number.isFinite(customerId)) return null;
    return customers.find((c) => c.id === customerId) ?? null;
  }, [customers, customerId]);

  const customer = useMemo<Customer | null>(() => {
    if (storeCustomer) return storeCustomer;
    if (directCustomer) return directCustomer;
    return null;
  }, [storeCustomer, directCustomer]);

  const customerAppointments = useMemo<Appointment[]>(() => {
    if (!customer) return [];
    const safeTimestamp = (value: unknown): number => {
      const date = parseDateSafe(value);
      return date ? date.getTime() : Number.NEGATIVE_INFINITY;
    };
    return appointments
      .filter((apt) => apt.customer.id === customer.id)
      .slice()
      .sort((a, b) => safeTimestamp(b.appointmentDate) - safeTimestamp(a.appointmentDate));
  }, [appointments, customer]);

  const customerGiftCards = useMemo<GiftCard[]>(() => {
    if (!customer) return [];
    const customerPhoneNormalized = toWhatsAppPhone(customer.phone);
    return giftCards.filter((gc) => {
      const isBeneficiaryId = gc.beneficiaryCustomerId === customer.id;
      const isBeneficiaryPhone = Boolean(customerPhoneNormalized && toWhatsAppPhone(gc.beneficiaryPhone) === customerPhoneNormalized);
      const isBuyerPhone = Boolean(customerPhoneNormalized && toWhatsAppPhone(gc.buyerPhone || '') === customerPhoneNormalized);
      return isBeneficiaryId || isBeneficiaryPhone || isBuyerPhone;
    });
  }, [giftCards, customer]);

  const activeCustomerGiftCards = useMemo(() => {
    return customerGiftCards.filter((gc) => gc.status === 'ACTIVE' || gc.status === 'PARTIAL');
  }, [customerGiftCards]);

  const totalAppointments = customerAppointments.length;
  const completedAppointments = customerAppointments.filter((a) => a.status === AppointmentStatus.COMPLETED).length;
  const cancelledAppointments = customerAppointments.filter((a) => a.status === AppointmentStatus.CANCELLED).length;
  const lastAppointment = customerAppointments[0];

  const handleSaveNotes = () => {
    if (!customer) return;
    // TODO: Implementar actualización de notas en el backend
    toast.info('Notas guardadas localmente');
    setEditingNotes(false);
  };

  const handleLoyaltyAdjust = async (delta: number) => {
    if (!customer) return;
    const confirmMsg = delta > 0 
      ? `¿Deseas agregar ${delta} sello(s) manualmente a ${customer.fullName}?` 
      : `¿Deseas quitar ${Math.abs(delta)} sello(s) a ${customer.fullName}?`;
    
    if (window.confirm(confirmMsg)) {
      const updated = await adjustCustomerLoyalty(customer.id, delta);
      if (updated) {
        setDirectCustomer(updated);
      }
    }
  };

  const getStatusBadge = (status: AppointmentStatus) => {
    const variants: Record<AppointmentStatus, string> = {
      PENDING: 'warning',
      CONFIRMED: 'info',
      COMPLETED: 'success',
      CANCELLED: 'danger',
    };
    const labels: Record<AppointmentStatus, string> = {
      PENDING: 'Pendiente',
      CONFIRMED: 'Confirmada',
      COMPLETED: 'Completada',
      CANCELLED: 'Cancelada',
    };
    return <Badge bg={variants[status]}>{labels[status]}</Badge>;
  };

  const getAppointmentServiceLabel = (apt: Appointment) => {
    const services = apt.services && apt.services.length > 0 ? apt.services : [apt.service];
    return services.map((service) => service.name).join(' + ');
  };

  if ((customersLoading || appointmentsLoading || directCustomerLoading) && !customer) {
    return (
      <DashboardLayout>
        <Container fluid className="bunny-page text-center py-5">
          <Spinner animation="border" />
          <p className="mt-3">Cargando información del cliente...</p>
        </Container>
      </DashboardLayout>
    );
  }

  if (!customer) {
    return (
      <DashboardLayout>
        <Container fluid className="bunny-page">
          <Alert variant="danger">
            Cliente no encontrado
          </Alert>
          <Button variant="primary" onClick={() => navigate('/customers')}>
            Volver a Clientes
          </Button>
        </Container>
      </DashboardLayout>
    );
  }

  const displayedNotes = notesDraft || customer.notes || '';

  return (
    <DashboardLayout>
      <Container fluid className="bunny-page">
        <Row className="mb-4">
          <Col>
            <div className="d-flex justify-content-between align-items-center">
              <div>
                <h2>👤 {customer.fullName}</h2>
                <p className="text-muted mb-0">Detalles del cliente</p>
              </div>
              <Button variant="outline-secondary" onClick={() => navigate('/customers')}>
                ← Volver
              </Button>
            </div>
          </Col>
        </Row>

        <Row>
          <Col md={4}>
            <Card className="mb-4">
              <Card.Header>
                <h5 className="mb-0">Información de Contacto</h5>
              </Card.Header>
              <Card.Body>
                <div className="mb-3">
                  <strong>🪪 RUT:</strong>
                  <p className="mb-0">{customer.rut?.trim() ? customer.rut.trim() : 'No tiene'}</p>
                </div>
                <div className="mb-3">
                  <strong>📧 Email:</strong>
                  <p className="mb-0">{customer.email?.trim() ? customer.email.trim() : 'No tiene'}</p>
                </div>
                <div className="mb-3">
                  <strong>📱 Teléfono:</strong>
                  <p className="mb-0">{customer.phone?.trim() ? customer.phone.trim() : 'No tiene'}</p>
                </div>
                <div className="mb-3">
                  <strong>🚨 Teléfono de Emergencia:</strong>
                  <p className="mb-0">{customer.emergencyPhone?.trim() ? customer.emergencyPhone.trim() : 'No tiene'}</p>
                </div>
                <div className="mb-3">
                  <strong>📸 Instagram:</strong>
                  <div>
                    {customer.instagram?.trim() ? (
                      <a
                        href={`https://instagram.com/${customer.instagram.replace(/^@/, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-decoration-none fw-semibold text-primary"
                      >
                        @{customer.instagram.replace(/^@/, '')}
                      </a>
                    ) : (
                      <p className="mb-0">No tiene</p>
                    )}
                  </div>
                </div>
                <div className="mb-3">
                  <strong>🚻 Género:</strong>
                  <p className="mb-0">{customer.gender?.trim() ? customer.gender.trim() : 'No especificado'}</p>
                </div>
                <div className="mb-3">
                  <strong>🎂 Fecha de Nacimiento:</strong>
                  <p className="mb-0">{customer.birthDate ? formatDateSafe(customer.birthDate) : 'No tiene'}</p>
                </div>
                <div className="mb-3">
                  <strong>📅 Cliente desde:</strong>
                  <p className="mb-0">{customer.createdAt ? formatDateSafe(customer.createdAt) : 'No tiene'}</p>
                </div>
                <div className="mb-3">
                  <strong>🔔 Notificaciones:</strong>
                  <p className="mb-0">
                    <Badge bg="info" className="text-dark">
                      {customer.notificationPreference || 'WHATSAPP'}
                    </Badge>
                  </p>
                </div>
                <div className="mb-0">
                  <strong>🩺 Notas de Salud / Alergias:</strong>
                  <p className="mb-0 text-muted small">
                    {customer.healthNotes?.trim() ? customer.healthNotes.trim() : 'Sin observaciones de salud registradas'}
                  </p>
                </div>
              </Card.Body>
            </Card>

            <Card className="mb-4">
              <Card.Header>
                <h5 className="mb-0">Estadísticas</h5>
              </Card.Header>
              <Card.Body>
                <div className="d-flex justify-content-between mb-2">
                  <span>Total de Citas:</span>
                  <strong>{totalAppointments}</strong>
                </div>
                <div className="d-flex justify-content-between mb-2">
                  <span>Completadas:</span>
                  <strong className="text-success">{completedAppointments}</strong>
                </div>
                <div className="d-flex justify-content-between mb-2">
                  <span>Canceladas:</span>
                  <strong className="text-danger">{cancelledAppointments}</strong>
                </div>
                {lastAppointment && (
                  <div className="mt-3 pt-3 border-top">
                    <small className="text-muted">Última visita:</small>
                    <p className="mb-0">
                      {formatDateSafe(lastAppointment.appointmentDate)}
                    </p>
                  </div>
                )}
              </Card.Body>
            </Card>

            <Card>
              <Card.Header className="d-flex justify-content-between align-items-center">
                <h5 className="mb-0">Notas</h5>
                {!editingNotes && (
                  <Button
                    size="sm"
                    variant="link"
                    onClick={() => {
                      setNotesDraft(customer.notes || '');
                      setEditingNotes(true);
                    }}
                  >
                    ✏️ Editar
                  </Button>
                )}
              </Card.Header>
              <Card.Body>
                {editingNotes ? (
                  <>
                    <Form.Control
                      as="textarea"
                      rows={4}
                      value={notesDraft}
                      onChange={(e) => setNotesDraft(e.target.value)}
                      placeholder="Agregar notas sobre el cliente..."
                    />
                    <div className="mt-2 d-flex gap-2">
                      <Button size="sm" variant="primary" onClick={handleSaveNotes}>
                        Guardar
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          setEditingNotes(false);
                          setNotesDraft(customer.notes || '');
                        }}
                      >
                        Cancelar
                      </Button>
                    </div>
                  </>
                ) : (
                  <p className="mb-0">{displayedNotes || 'Sin notas'}</p>
                )}
              </Card.Body>
            </Card>
          </Col>

          <Col md={8}>
            {/* Pestañas de Navegación de la Ficha */}
            <Nav variant="pills" className="mb-3 gap-2 flex-wrap">
              <Nav.Item>
                <Nav.Link
                  active={activeTab === 'appointments'}
                  onClick={() => setActiveTab('appointments')}
                  className="d-flex align-items-center gap-2"
                  style={{
                    borderRadius: '10px',
                    fontWeight: 600,
                    background: activeTab === 'appointments' ? '#8c2a3e' : '#fff',
                    color: activeTab === 'appointments' ? '#fff' : '#5c3d2e',
                    border: '1px solid #eed0c5',
                  }}
                >
                  <span>📋 Historial & Citas</span>
                  <Badge bg={activeTab === 'appointments' ? 'light' : 'secondary'} text={activeTab === 'appointments' ? 'dark' : undefined}>
                    {customerAppointments.length}
                  </Badge>
                </Nav.Link>
              </Nav.Item>

              <Nav.Item>
                <Nav.Link
                  active={activeTab === 'gallery'}
                  onClick={() => setActiveTab('gallery')}
                  className="d-flex align-items-center gap-2"
                  style={{
                    borderRadius: '10px',
                    fontWeight: 600,
                    background: activeTab === 'gallery' ? '#8c2a3e' : '#fff',
                    color: activeTab === 'gallery' ? '#fff' : '#5c3d2e',
                    border: '1px solid #eed0c5',
                  }}
                >
                  <span>💅 Galería de Diseños &amp; Ficha Técnica</span>
                </Nav.Link>
              </Nav.Item>

              <Nav.Item>
                <Nav.Link
                  active={activeTab === 'giftcards'}
                  onClick={() => setActiveTab('giftcards')}
                  className="d-flex align-items-center gap-2"
                  style={{
                    borderRadius: '10px',
                    fontWeight: 600,
                    background: activeTab === 'giftcards' ? '#8c2a3e' : '#fff',
                    color: activeTab === 'giftcards' ? '#fff' : '#5c3d2e',
                    border: '1px solid #eed0c5',
                  }}
                >
                  <span>🎁 GiftCards</span>
                  {customerGiftCards.length > 0 && (
                    <Badge bg={activeTab === 'giftcards' ? 'light' : 'primary'} text={activeTab === 'giftcards' ? 'dark' : undefined}>
                      {customerGiftCards.length}
                    </Badge>
                  )}
                </Nav.Link>
              </Nav.Item>
            </Nav>

            {/* Vista: Galería de Diseños & Ficha Técnica */}
            {activeTab === 'gallery' && (
              <NailGalleryTab
                customerId={customer.id}
                customerName={customer.fullName}
              />
            )}

            {/* Vista: Historial & Citas */}
            {activeTab === 'appointments' && (
              <>
                <StampCard 
                  customerId={customer.id}
                  loyaltyStamps={customer.loyaltyStamps} 
                  totalCompletedVisits={customer.totalCompletedVisits} 
                  currentRewardIndex={customer.currentRewardIndex}
                  onAdjust={handleLoyaltyAdjust}
                />

                <Card>
                  <Card.Header>
                    <h5 className="mb-0">Historial de Citas</h5>
                  </Card.Header>
                  <Card.Body>
                    {customerAppointments.length === 0 ? (
                      <Alert variant="info">
                        Este cliente aún no tiene citas registradas.
                      </Alert>
                    ) : (
                      <div className="table-responsive">
                        <Table hover>
                          <thead>
                            <tr>
                              <th>Fecha</th>
                              <th>Hora</th>
                              <th>Servicio</th>
                              <th>Estado</th>
                              <th>Notas</th>
                            </tr>
                          </thead>
                          <tbody>
                            {customerAppointments.map((apt) => (
                              <tr key={apt.id}>
                                <td>{formatDateSafe(apt.appointmentDate)}</td>
                                <td>{apt.appointmentTime}</td>
                                <td>{getAppointmentServiceLabel(apt)}</td>
                                <td>{getStatusBadge(apt.status)}</td>
                                <td>
                                  {apt.notes ? (
                                    <span className="text-muted small">
                                      {apt.notes.length > 50 ? `${apt.notes.substring(0, 50)}...` : apt.notes}
                                    </span>
                                  ) : (
                                    '-'
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </Table>
                      </div>
                    )}
                  </Card.Body>
                </Card>
              </>
            )}

            {/* Vista: GiftCards */}
            {activeTab === 'giftcards' && (
              <Card className="mb-4">
                <Card.Header className="d-flex justify-content-between align-items-center">
                  <div className="d-flex align-items-center gap-2">
                    <h5 className="mb-0">🎁 GiftCards del Cliente</h5>
                    <Badge bg={activeCustomerGiftCards.length > 0 ? 'success' : 'secondary'}>
                      {activeCustomerGiftCards.length} activa{activeCustomerGiftCards.length !== 1 ? 's' : ''}
                    </Badge>
                  </div>
                  <Button
                    size="sm"
                    variant="outline-primary"
                    onClick={() => navigate('/giftcards/generar')}
                  >
                    + Emitir GiftCard
                  </Button>
                </Card.Header>
                <Card.Body>
                  {giftCardsLoading ? (
                    <div className="text-center py-3 text-muted">Cargando GiftCards...</div>
                  ) : customerGiftCards.length === 0 ? (
                    <div className="text-muted small py-2">
                      Esta clienta no tiene GiftCards asociadas (como beneficiaria ni compradora).
                    </div>
                  ) : (
                    <div className="table-responsive">
                      <Table hover size="sm" className="align-middle mb-0">
                        <thead>
                          <tr>
                            <th>Código</th>
                            <th>Rol</th>
                            <th>Estado</th>
                            <th>Servicios Disponibles</th>
                            <th>Vence</th>
                            <th className="text-end">Acciones</th>
                          </tr>
                        </thead>
                        <tbody>
                          {customerGiftCards.map((gc) => {
                            const isBeneficiary = toWhatsAppPhone(gc.beneficiaryPhone) === toWhatsAppPhone(customer.phone);
                            const remainingServices = gc.items.map(
                              (item) => `${item.serviceName} (${item.remainingQuantity}/${item.quantity})`
                            ).join(', ');
                            const publicUrl = normalizeGiftCardPublicUrl(gc.publicUrl, gc.code);

                            return (
                              <tr key={gc.id}>
                                <td>
                                  <strong>{gc.code}</strong>
                                  <br />
                                  <small className="text-muted">${gc.totalAmount.toLocaleString('es-CL')}</small>
                                </td>
                                <td>
                                  <Badge bg={isBeneficiary ? 'primary' : 'info'}>
                                    {isBeneficiary ? 'Beneficiaria' : 'Compradora'}
                                  </Badge>
                                </td>
                                <td>
                                  <Badge bg={gc.status === 'ACTIVE' ? 'success' : gc.status === 'PARTIAL' ? 'warning' : 'secondary'}>
                                    {gc.status}
                                  </Badge>
                                </td>
                                <td>
                                  <small>{remainingServices || 'Sin servicios'}</small>
                                </td>
                                <td>
                                  <small>{gc.expiresOn}</small>
                                </td>
                                <td className="text-end">
                                  <div className="d-flex justify-content-end gap-1">
                                    <Button
                                      size="sm"
                                      variant="outline-secondary"
                                      title="Ver en Gestión"
                                      onClick={() => navigate(`/giftcards?search=${encodeURIComponent(gc.code)}`)}
                                    >
                                      🔍
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline-success"
                                      title="Enviar por WhatsApp"
                                      onClick={() =>
                                        sendGiftCardWhatsApp({
                                          data: {
                                            beneficiaryName: gc.beneficiaryName,
                                            code: gc.code,
                                            pin: gc.plainPin || 'No disponible',
                                            expiresOn: gc.expiresOn,
                                            publicUrl,
                                          },
                                          beneficiaryPhone: gc.beneficiaryPhone,
                                          onError: (msg) => toast.error(msg),
                                        })
                                      }
                                    >
                                      📱
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline-primary"
                                      title="Descargar Imagen PNG"
                                      onClick={async () => {
                                        try {
                                          await downloadGiftCardPng({
                                            beneficiaryName: gc.beneficiaryName,
                                            code: gc.code,
                                            pin: gc.plainPin || 'No disponible',
                                            expiresOn: gc.expiresOn,
                                            publicUrl,
                                          });
                                          toast.success('PNG descargado');
                                        } catch {
                                          toast.error('Error al descargar PNG');
                                        }
                                      }}
                                    >
                                      📥 PNG
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline-dark"
                                      title="Imprimir / Guardar PDF"
                                      onClick={async () => {
                                        try {
                                          await printOrDownloadGiftCardPdf({
                                            beneficiaryName: gc.beneficiaryName,
                                            code: gc.code,
                                            pin: gc.plainPin || 'No disponible',
                                            expiresOn: gc.expiresOn,
                                            publicUrl,
                                          });
                                        } catch {
                                          toast.error('Error al generar PDF');
                                        }
                                      }}
                                    >
                                      📄 PDF
                                    </Button>
                                    <a
                                      className="btn btn-sm btn-outline-info"
                                      href={publicUrl}
                                      target="_blank"
                                      rel="noreferrer"
                                      title="Abrir URL pública"
                                    >
                                      🌐
                                    </a>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </Table>
                    </div>
                  )}
                </Card.Body>
              </Card>
            )}
          </Col>
        </Row>
      </Container>
    </DashboardLayout>
  );
}
