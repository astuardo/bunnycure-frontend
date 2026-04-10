/**
 * Página de detalles ampliados del cliente.
 * Muestra historial, estadísticas y permite edición de notas.
 */

import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container, Row, Col, Card, Button, Table, Badge, Form, Alert, Spinner } from 'react-bootstrap';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import DashboardLayout from '../../components/common/DashboardLayout';
import { useCustomersStore } from '../../stores/customersStore';
import { useAppointmentsStore } from '../../stores/appointmentsStore';
import { useToast } from '../../hooks/useToast';

export default function CustomerDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  
  const { customers, loading: customersLoading, fetchCustomers } = useCustomersStore();
  const { appointments, isLoading: appointmentsLoading, fetchAppointments } = useAppointmentsStore();

  const [customer, setCustomer] = useState<any>(null);
  const [customerAppointments, setCustomerAppointments] = useState<any[]>([]);
  const [notes, setNotes] = useState('');
  const [editingNotes, setEditingNotes] = useState(false);

  useEffect(() => {
    if (id) {
      fetchCustomers();
      fetchAppointments();
    }
  }, [id, fetchCustomers, fetchAppointments]);

  useEffect(() => {
    if (customers.length > 0 && id) {
      const found = customers.find((c: any) => c.id === parseInt(id));
      if (found) {
        setCustomer(found);
        setNotes(found.notes || '');
      }
    }
  }, [customers, id]);

  useEffect(() => {
    if (appointments.length > 0 && customer) {
      const customerApts = appointments.filter((apt: any) => apt.customer.id === customer.id);
      setCustomerAppointments(customerApts);
    }
  }, [appointments, customer]);

  const handleSaveNotes = async () => {
    if (!customer) return;
    try {
      // TODO: Implementar actualización de notas en el backend
      toast.info('Notas guardadas localmente');
      setEditingNotes(false);
    } catch (err: any) {
      toast.error('Error al guardar las notas');
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: any = {
      PENDING: 'warning',
      CONFIRMED: 'info',
      COMPLETED: 'success',
      CANCELLED: 'danger',
    };
    return <Badge bg={variants[status] || 'secondary'}>{status}</Badge>;
  };

  const getAppointmentServiceLabel = (apt: any) => {
    const services = apt.services && apt.services.length > 0 ? apt.services : [apt.service];
    return services.map((service: any) => service.name).join(' + ');
  };

  if (customersLoading || appointmentsLoading) {
    return (
      <DashboardLayout>
        <Container fluid className="text-center py-5">
          <Spinner animation="border" />
          <p className="mt-3">Cargando información del cliente...</p>
        </Container>
      </DashboardLayout>
    );
  }

  if (!customer) {
    return (
      <DashboardLayout>
        <Container fluid>
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

  // Calcular estadísticas
  const totalAppointments = customerAppointments.length;
  const completedAppointments = customerAppointments.filter((a: any) => a.status === 'COMPLETED').length;
  const cancelledAppointments = customerAppointments.filter((a: any) => a.status === 'CANCELLED').length;
  const lastAppointment = customerAppointments.length > 0 
    ? customerAppointments.sort((a: any, b: any) => 
        new Date(b.appointmentDate).getTime() - new Date(a.appointmentDate).getTime()
      )[0]
    : null;

  return (
    <DashboardLayout>
      <Container fluid>
        {/* Header */}
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
          {/* Columna izquierda - Info básica */}
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
                    <p className="mb-0">{format(new Date(customer.birthDate), 'dd/MM/yyyy', { locale: es })}</p>
                  </div>
                )}
                <div className="mb-3">
                  <strong>📅 Cliente desde:</strong>
                  <p className="mb-0">{format(new Date(customer.createdAt), 'dd/MM/yyyy', { locale: es })}</p>
                </div>
              </Card.Body>
            </Card>

            {/* Estadísticas */}
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
                      {format(new Date(lastAppointment.appointmentDate), 'dd/MM/yyyy', { locale: es })}
                    </p>
                  </div>
                )}
              </Card.Body>
            </Card>

            {/* Notas */}
            <Card>
              <Card.Header className="d-flex justify-content-between align-items-center">
                <h5 className="mb-0">Notas</h5>
                {!editingNotes && (
                  <Button size="sm" variant="link" onClick={() => setEditingNotes(true)}>
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
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Agregar notas sobre el cliente..."
                    />
                    <div className="mt-2 d-flex gap-2">
                      <Button size="sm" variant="primary" onClick={handleSaveNotes}>
                        Guardar
                      </Button>
                      <Button size="sm" variant="secondary" onClick={() => {
                        setEditingNotes(false);
                        setNotes(customer.notes || '');
                      }}>
                        Cancelar
                      </Button>
                    </div>
                  </>
                ) : (
                  <p className="mb-0">{notes || 'Sin notas'}</p>
                )}
              </Card.Body>
            </Card>
          </Col>

          {/* Columna derecha - Historial */}
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
                        {customerAppointments
                          .sort((a: any, b: any) => 
                            new Date(b.appointmentDate).getTime() - new Date(a.appointmentDate).getTime()
                          )
                          .map((apt: any) => (
                            <tr key={apt.id}>
                              <td>
                                {format(new Date(apt.appointmentDate), 'dd/MM/yyyy', { locale: es })}
                              </td>
                              <td>{apt.appointmentTime}</td>
                              <td>{getAppointmentServiceLabel(apt)}</td>
                              <td>{getStatusBadge(apt.status)}</td>
                              <td>
                                {apt.notes ? (
                                  <span className="text-muted small">{apt.notes.substring(0, 50)}...</span>
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
