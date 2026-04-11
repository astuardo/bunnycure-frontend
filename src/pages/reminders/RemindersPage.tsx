/**
 * Página de Gestión de Recordatorios
 * Dashboard para ver y enviar recordatorios de citas
 */

import { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Button, Badge, Spinner, Alert } from 'react-bootstrap';
import { FaBell, FaClock, FaCheckCircle, FaPaperPlane } from 'react-icons/fa';
import DashboardLayout from '../../components/common/DashboardLayout';
import { useAppointmentsStore } from '../../stores/appointmentsStore';
import { remindersApi, ReminderStats } from '../../api/reminders.api';
import { useToast } from '../../hooks/useToast';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Appointment, AppointmentStatus } from '../../types/appointment.types';

const statusColors: Record<AppointmentStatus, string> = {
  CONFIRMED: 'primary',
  PENDING: 'warning',
  COMPLETED: 'success',
  CANCELLED: 'danger',
};

const statusLabels: Record<AppointmentStatus, string> = {
  CONFIRMED: 'Confirmada',
  PENDING: 'Pendiente',
  COMPLETED: 'Completada',
  CANCELLED: 'Cancelada',
};

const getAppointmentServiceLabel = (apt: Appointment) => {
  const services = apt.services && apt.services.length > 0 ? apt.services : [apt.service];
  return services.map((service) => service.name).join(' + ');
};

export default function RemindersPage() {
  const toast = useToast();
  const { appointments, isLoading, fetchAppointments } = useAppointmentsStore();
  const [stats, setStats] = useState<ReminderStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [sendingBulk, setSendingBulk] = useState(false);
  const [sendingIds, setSendingIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    await fetchAppointments();
    await loadStats();
  };

  const loadStats = async () => {
    setLoadingStats(true);
    try {
      const data = await remindersApi.getStats();
      setStats(data);
    } catch (error) {
      console.error('Error loading stats:', error);
      toast.error('Error al cargar estadísticas');
    } finally {
      setLoadingStats(false);
    }
  };

  // Filtrar citas pendientes de recordatorio (hoy y futuras, no canceladas ni completadas)
  const pendingReminders = appointments.filter(apt => {
    const isActiveStatus = apt.status === 'PENDING' || apt.status === 'CONFIRMED';
    const isFuture = new Date(apt.appointmentDate) >= new Date(new Date().setHours(0, 0, 0, 0));
    return isActiveStatus && isFuture && !apt.reminderSent;
  }).sort((a, b) => {
    const dateCompare = new Date(a.appointmentDate).getTime() - new Date(b.appointmentDate).getTime();
    if (dateCompare !== 0) return dateCompare;
    return a.appointmentTime.localeCompare(b.appointmentTime);
  });

  const handleSendBulk = async () => {
    setSendingBulk(true);
    try {
      await remindersApi.sendTodayReminders();
      toast.success('✅ Recordatorios enviados exitosamente');
      await loadData(); // Recargar datos
    } catch (error) {
      console.error('Error sending bulk reminders:', error);
      toast.error('❌ Error al enviar recordatorios');
    } finally {
      setSendingBulk(false);
    }
  };

  const handleSendSingle = async (appointmentId: number) => {
    setSendingIds(prev => new Set(prev).add(appointmentId));
    try {
      const response = await remindersApi.sendReminderForAppointment(appointmentId);
      if (response.success) {
        toast.success(response.message);
        await loadData(); // Recargar datos
      } else {
        toast.error(response.message);
      }
    } catch (error) {
      console.error('Error sending reminder:', error);
      toast.error('❌ Error al enviar recordatorio');
    } finally {
      setSendingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(appointmentId);
        return newSet;
      });
    }
  };

  const formatAppointmentDateTime = (apt: Appointment) => {
    try {
      const date = format(new Date(apt.appointmentDate), "EEEE d 'de' MMMM", { locale: es });
      return `${date} - ${apt.appointmentTime}`;
    } catch {
      return `${apt.appointmentDate} - ${apt.appointmentTime}`;
    }
  };

  return (
    <DashboardLayout>
      <Container fluid className="bunny-page">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div>
            <h2 className="mb-1">
              <FaBell className="me-2" />
              Gestión de Recordatorios
            </h2>
            <p className="text-muted mb-0">Envía recordatorios a tus clientes</p>
          </div>
          <Button
            variant="primary"
            size="lg"
            onClick={handleSendBulk}
            disabled={sendingBulk || pendingReminders.length === 0}
          >
            {sendingBulk ? (
              <>
                <Spinner animation="border" size="sm" className="me-2" />
                Enviando...
              </>
            ) : (
              <>
                <FaPaperPlane className="me-2" />
                Enviar Recordatorios de Hoy
              </>
            )}
          </Button>
        </div>

        {/* Stats Cards */}
        <Row className="mb-4">
          <Col md={4}>
            <Card>
              <Card.Body>
                <div className="d-flex align-items-center">
                  <div className="flex-shrink-0">
                    <div className="bg-warning bg-opacity-10 rounded p-3">
                      <FaClock className="text-warning" size={32} />
                    </div>
                  </div>
                  <div className="flex-grow-1 ms-3">
                    <div className="text-muted small">Pendientes de Envío</div>
                    <h3 className="mb-0">
                      {loadingStats ? (
                        <Spinner animation="border" size="sm" />
                      ) : (
                        stats?.pendingReminders ?? 0
                      )}
                    </h3>
                  </div>
                </div>
              </Card.Body>
            </Card>
          </Col>

          <Col md={4}>
            <Card>
              <Card.Body>
                <div className="d-flex align-items-center">
                  <div className="flex-shrink-0">
                    <div className="bg-success bg-opacity-10 rounded p-3">
                      <FaCheckCircle className="text-success" size={32} />
                    </div>
                  </div>
                  <div className="flex-grow-1 ms-3">
                    <div className="text-muted small">Enviados Hoy</div>
                    <h3 className="mb-0">
                      {loadingStats ? (
                        <Spinner animation="border" size="sm" />
                      ) : (
                        stats?.sentToday ?? 0
                      )}
                    </h3>
                  </div>
                </div>
              </Card.Body>
            </Card>
          </Col>

          <Col md={4}>
            <Card>
              <Card.Body>
                <div className="d-flex align-items-center">
                  <div className="flex-shrink-0">
                    <div className="bg-info bg-opacity-10 rounded p-3">
                      <FaBell className="text-info" size={32} />
                    </div>
                  </div>
                  <div className="flex-grow-1 ms-3">
                    <div className="text-muted small">Total en Lista</div>
                    <h3 className="mb-0">{pendingReminders.length}</h3>
                  </div>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        {/* Appointments Table */}
        <Card>
          <Card.Header>
            <h5 className="mb-0">Citas Pendientes de Recordatorio</h5>
          </Card.Header>
          <Card.Body>
            {isLoading ? (
              <div className="text-center py-5">
                <Spinner animation="border" />
                <p className="text-muted mt-2">Cargando citas...</p>
              </div>
            ) : pendingReminders.length === 0 ? (
              <Alert variant="info" className="mb-0">
                <FaCheckCircle className="me-2" />
                No hay citas pendientes de recordatorio en este momento.
              </Alert>
            ) : (
              <Table responsive hover>
                <thead>
                  <tr>
                    <th>Fecha y Hora</th>
                    <th>Cliente</th>
                    <th>Servicio</th>
                    <th>Estado</th>
                    <th className="text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingReminders.map((apt) => (
                    <tr key={apt.id}>
                      <td>
                        <div className="fw-semibold">
                          {formatAppointmentDateTime(apt)}
                        </div>
                      </td>
                      <td>
                        <div>{apt.customer.fullName}</div>
                        <div className="small text-muted">{apt.customer.phone}</div>
                      </td>
                      <td>{getAppointmentServiceLabel(apt)}</td>
                      <td>
                        <Badge bg={statusColors[apt.status]}>
                          {statusLabels[apt.status]}
                        </Badge>
                      </td>
                      <td className="text-center">
                        <Button
                          variant="success"
                          size="sm"
                          onClick={() => handleSendSingle(apt.id)}
                          disabled={sendingIds.has(apt.id)}
                        >
                          {sendingIds.has(apt.id) ? (
                            <>
                              <Spinner animation="border" size="sm" className="me-1" />
                              Enviando...
                            </>
                          ) : (
                            <>
                              <FaPaperPlane className="me-1" />
                              Enviar
                            </>
                          )}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </Card.Body>
        </Card>
      </Container>
    </DashboardLayout>
  );
}
