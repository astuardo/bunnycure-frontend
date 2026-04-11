/**
 * Página de detalles ampliados del cliente.
 * Muestra historial, estadísticas y permite edición de notas.
 */

import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container, Row, Col, Card, Button, Table, Badge, Form, Alert, Spinner } from 'react-bootstrap';
import { format, isValid } from 'date-fns';
import { es } from 'date-fns/locale';
import DashboardLayout from '../../components/common/DashboardLayout';
import { useCustomersStore } from '../../stores/customersStore';
import { useAppointmentsStore } from '../../stores/appointmentsStore';
import { useToast } from '../../hooks/useToast';
import { Customer } from '../../types/customer.types';
import { Appointment, AppointmentStatus } from '../../types/appointment.types';

type CustomerWithCreatedAt = Customer & { createdAt?: string };

export default function CustomerDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();

  const { customers, loading: customersLoading, fetchCustomers } = useCustomersStore();
  const { appointments, isLoading: appointmentsLoading, fetchAppointments } = useAppointmentsStore();

  const [notesDraft, setNotesDraft] = useState('');
  const [editingNotes, setEditingNotes] = useState(false);

  const parseDateSafe = (value: unknown): Date | null => {
    if (!value) return null;
    const date = new Date(value as string | number | Date);
    return isValid(date) ? date : null;
  };

  const formatDateSafe = (value: unknown, pattern: string = 'dd/MM/yyyy'): string => {
    const date = parseDateSafe(value);
    if (!date) return '-';
    return format(date, pattern, { locale: es });
  };

  useEffect(() => {
    if (id) {
      fetchCustomers();
      fetchAppointments();
    }
  }, [id, fetchCustomers, fetchAppointments]);

  const customerId = Number(id);
  const customer = useMemo<CustomerWithCreatedAt | null>(() => {
    if (!Number.isFinite(customerId)) return null;
    return (customers.find((c) => c.id === customerId) as CustomerWithCreatedAt | undefined) ?? null;
  }, [customers, customerId]);

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

  if (customersLoading || appointmentsLoading) {
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
                  <strong>📧 Email:</strong>
                  <p className="mb-0">{customer.email || 'No especificado'}</p>
                </div>
                <div className="mb-3">
                  <strong>📱 Teléfono:</strong>
                  <p className="mb-0">{customer.phone}</p>
                </div>
                {customer.birthDate && (
                  <div className="mb-3">
                    <strong>🎂 Fecha de Nacimiento:</strong>
                    <p className="mb-0">{formatDateSafe(customer.birthDate)}</p>
                  </div>
                )}
                <div className="mb-3">
                  <strong>📅 Cliente desde:</strong>
                  <p className="mb-0">{formatDateSafe(customer.createdAt)}</p>
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
          </Col>
        </Row>
      </Container>
    </DashboardLayout>
  );
}
