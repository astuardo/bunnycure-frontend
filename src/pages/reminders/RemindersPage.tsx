/**
 * Página de Gestión de Recordatorios
 * Dashboard para ver y enviar recordatorios de citas (Automatizado + Contingencia Manual WhatsApp)
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Container, Row, Col, Card, Table, Button, Badge, Spinner, Form, Nav } from 'react-bootstrap';
import { FaBell, FaClock, FaCheckCircle, FaPaperPlane, FaWhatsapp } from 'react-icons/fa';
import { FiSearch, FiRefreshCw, FiCalendar } from 'react-icons/fi';
import DashboardLayout from '../../components/common/DashboardLayout';
import { useAppointmentsStore } from '../../stores/appointmentsStore';
import { remindersApi, ReminderStats } from '../../api/reminders.api';
import { appointmentsApi } from '../../api/appointments.api';
import { useToast } from '../../hooks/useToast';
import { format, isToday, isTomorrow, parseISO, isValid } from 'date-fns';
import { es } from 'date-fns/locale';
import { Appointment, AppointmentStatus } from '../../types/appointment.types';
import { matchRutSearch } from '../../utils/rutUtils';

const statusColors: Record<AppointmentStatus, string> = {
  CONFIRMED: 'primary',
  PENDING: 'warning',
  COMPLETED: 'success',
  CANCELLED: 'danger',
  RESCHEDULE_REQUESTED: 'warning',
};

const statusLabels: Record<AppointmentStatus, string> = {
  CONFIRMED: 'Confirmada',
  PENDING: 'Pendiente',
  COMPLETED: 'Completada',
  CANCELLED: 'Cancelada',
  RESCHEDULE_REQUESTED: 'Reprogramar',
};

const getAppointmentServiceLabel = (apt: Appointment) => {
  const services = apt.services && apt.services.length > 0 ? apt.services : [apt.service];
  return services.map((service) => service.name).join(' + ');
};

type ReminderTab = 'TODAY' | 'TOMORROW' | 'UPCOMING' | 'ALL_PENDING';

export default function RemindersPage() {
  const toast = useToast();
  const { appointments, isLoading, fetchAppointments } = useAppointmentsStore();
  const [stats, setStats] = useState<ReminderStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [sendingBulk, setSendingBulk] = useState(false);
  const [sendingIds, setSendingIds] = useState<Set<number>>(new Set());

  const [activeTab, setActiveTab] = useState<ReminderTab>('TODAY');
  const [searchQuery, setSearchQuery] = useState('');

  const loadStats = useCallback(async () => {
    setLoadingStats(true);
    try {
      const data = await remindersApi.getStats();
      setStats(data);
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoadingStats(false);
    }
  }, []);

  const loadData = useCallback(async () => {
    await fetchAppointments();
    await loadStats();
  }, [fetchAppointments, loadStats]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Citas activas futuras o de hoy
  const allActiveAppointments = useMemo(() => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    return appointments.filter((apt) => {
      const isActiveStatus = apt.status === 'PENDING' || apt.status === 'CONFIRMED';
      if (!isActiveStatus) return false;
      try {
        const aptDate = parseISO(apt.appointmentDate);
        return isValid(aptDate) && aptDate >= todayStart;
      } catch {
        return false;
      }
    }).sort((a, b) => {
      const dateCompare = new Date(a.appointmentDate).getTime() - new Date(b.appointmentDate).getTime();
      if (dateCompare !== 0) return dateCompare;
      return a.appointmentTime.localeCompare(b.appointmentTime);
    });
  }, [appointments]);

  // Citas pendientes de recordatorio
  const pendingReminders = useMemo(() => {
    return allActiveAppointments.filter((apt) => !apt.reminderSent);
  }, [allActiveAppointments]);

  // Citas de Hoy
  const todayAppointments = useMemo(() => {
    return allActiveAppointments.filter((apt) => {
      try {
        return isToday(parseISO(apt.appointmentDate));
      } catch {
        return false;
      }
    });
  }, [allActiveAppointments]);

  // Citas de Mañana
  const tomorrowAppointments = useMemo(() => {
    return allActiveAppointments.filter((apt) => {
      try {
        return isTomorrow(parseISO(apt.appointmentDate));
      } catch {
        return false;
      }
    });
  }, [allActiveAppointments]);

  // Citas según la pestaña seleccionada
  const tabAppointments = useMemo(() => {
    let list: Appointment[] = [];
    switch (activeTab) {
      case 'TODAY':
        list = todayAppointments;
        break;
      case 'TOMORROW':
        list = tomorrowAppointments;
        break;
      case 'UPCOMING':
        list = allActiveAppointments;
        break;
      case 'ALL_PENDING':
      default:
        list = pendingReminders;
        break;
    }

    if (!searchQuery.trim()) return list;

    const q = searchQuery.trim().toLowerCase();
    return list.filter((apt) => {
      const customerMatch = (apt.customer?.fullName || '').toLowerCase().includes(q);
      const phoneMatch = (apt.customer?.phone || '').includes(q);
      const rutMatch = apt.customer?.rut ? matchRutSearch(apt.customer.rut, q) : false;
      const serviceMatch = getAppointmentServiceLabel(apt).toLowerCase().includes(q);
      return customerMatch || phoneMatch || rutMatch || serviceMatch;
    });
  }, [activeTab, todayAppointments, tomorrowAppointments, allActiveAppointments, pendingReminders, searchQuery]);

  const handleSendBulk = async () => {
    setSendingBulk(true);
    try {
      await remindersApi.sendTodayReminders();
      toast.success('✅ Recordatorios automáticos de hoy enviados exitosamente');
      await loadData();
    } catch (error) {
      console.error('Error sending bulk reminders:', error);
      toast.error('❌ Error al enviar recordatorios masivos');
    } finally {
      setSendingBulk(false);
    }
  };

  const handleSendSingleBackend = async (appointmentId: number) => {
    setSendingIds((prev) => new Set(prev).add(appointmentId));
    try {
      const response = await remindersApi.sendReminderForAppointment(appointmentId);
      if (response.success) {
        toast.success(response.message);
        await loadData();
      } else {
        toast.error(response.message);
      }
    } catch (error) {
      console.error('Error sending reminder:', error);
      // Intento con endpoint alternativo si falla el admin
      try {
        await appointmentsApi.sendWhatsAppReminder(appointmentId);
        toast.success('✅ Recordatorio enviado exitosamente');
        await loadData();
      } catch {
        toast.error('❌ No se pudo enviar el recordatorio automático');
      }
    } finally {
      setSendingIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(appointmentId);
        return newSet;
      });
    }
  };

  const handleSendManualWhatsApp = (apt: Appointment) => {
    if (!apt.customer?.phone) {
      toast.error('La clienta no tiene teléfono registrado');
      return;
    }

    const cleanPhone = apt.customer.phone.replace(/\D/g, '');
    const phoneWithCode = cleanPhone.startsWith('56') ? cleanPhone : `56${cleanPhone}`;
    const serviceName = getAppointmentServiceLabel(apt);
    const dateFormatted = formatAppointmentDateTime(apt);

    const message =
      `¡Hola ${apt.customer.fullName}! 🐰💅 Te recordamos tu cita de manicure agendada para el *${dateFormatted}* (${serviceName}) en *BunnyCure*.\n\n` +
      `Por favor confírmanos tu asistencia respondiendo a este mensaje. ✨\n` +
      `¡Te esperamos con mucho cariño! 💕`;

    const url = `https://wa.me/${phoneWithCode}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
    toast.info(`Abriendo WhatsApp para ${apt.customer.fullName}`);
  };

  const formatAppointmentDateTime = (apt: Appointment) => {
    try {
      const date = format(parseISO(apt.appointmentDate), "EEEE d 'de' MMMM", { locale: es });
      return `${date} - ${apt.appointmentTime} hrs`;
    } catch {
      return `${apt.appointmentDate} - ${apt.appointmentTime} hrs`;
    }
  };

  return (
    <DashboardLayout>
      <Container fluid className="bunny-page">
        <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-3">
          <div>
            <h2 className="mb-1 fw-bold" style={{ color: '#422314' }}>
              <FaBell className="me-2 text-danger" />
              Gestión de Recordatorios
            </h2>
            <p className="text-muted mb-0">
              Notifica a tus clientas de forma automática o mediante WhatsApp directo en 1-clic
            </p>
          </div>
          <div className="d-flex gap-2">
            <Button
              variant="outline-secondary"
              size="sm"
              onClick={() => loadData()}
              disabled={isLoading || loadingStats}
              style={{ borderRadius: '10px' }}
            >
              <FiRefreshCw className={isLoading ? 'spinner-border spinner-border-sm' : ''} /> Actualizar
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleSendBulk}
              disabled={sendingBulk || todayAppointments.filter((a) => !a.reminderSent).length === 0}
              style={{
                background: '#8c2a3e',
                borderColor: '#8c2a3e',
                borderRadius: '10px',
                fontWeight: 600,
                padding: '8px 16px',
              }}
            >
              {sendingBulk ? (
                <>
                  <Spinner animation="border" size="sm" className="me-2" />
                  Enviando...
                </>
              ) : (
                <>
                  <FaPaperPlane className="me-2" />
                  Enviar Automático (Citas de Hoy)
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Tarjetas KPI */}
        <Row className="g-3 mb-4">
          <Col xs={12} sm={6} md={3}>
            <Card className="border-0 shadow-sm h-100" style={{ borderRadius: '14px', background: '#fff' }}>
              <Card.Body className="d-flex align-items-center">
                <div className="bg-warning bg-opacity-10 rounded p-3 me-3 text-warning">
                  <FaClock size={28} />
                </div>
                <div>
                  <div className="text-muted small fw-semibold">Pendientes Hoy</div>
                  <h3 className="mb-0 fw-bold" style={{ color: '#422314' }}>
                    {todayAppointments.filter((a) => !a.reminderSent).length}
                  </h3>
                </div>
              </Card.Body>
            </Card>
          </Col>

          <Col xs={12} sm={6} md={3}>
            <Card className="border-0 shadow-sm h-100" style={{ borderRadius: '14px', background: '#fff' }}>
              <Card.Body className="d-flex align-items-center">
                <div className="bg-info bg-opacity-10 rounded p-3 me-3 text-info">
                  <FiCalendar size={28} />
                </div>
                <div>
                  <div className="text-muted small fw-semibold">Citas Mañana</div>
                  <h3 className="mb-0 fw-bold" style={{ color: '#422314' }}>
                    {tomorrowAppointments.length}
                  </h3>
                </div>
              </Card.Body>
            </Card>
          </Col>

          <Col xs={12} sm={6} md={3}>
            <Card className="border-0 shadow-sm h-100" style={{ borderRadius: '14px', background: '#fff' }}>
              <Card.Body className="d-flex align-items-center">
                <div className="bg-success bg-opacity-10 rounded p-3 me-3 text-success">
                  <FaCheckCircle size={28} />
                </div>
                <div>
                  <div className="text-muted small fw-semibold">Enviados Hoy (Backend)</div>
                  <h3 className="mb-0 fw-bold" style={{ color: '#14532d' }}>
                    {loadingStats ? <Spinner animation="border" size="sm" /> : stats?.sentToday ?? todayAppointments.filter((a) => a.reminderSent).length}
                  </h3>
                </div>
              </Card.Body>
            </Card>
          </Col>

          <Col xs={12} sm={6} md={3}>
            <Card className="border-0 shadow-sm h-100" style={{ borderRadius: '14px', background: '#fff' }}>
              <Card.Body className="d-flex align-items-center">
                <div className="bg-danger bg-opacity-10 rounded p-3 me-3 text-danger">
                  <FaBell size={28} />
                </div>
                <div>
                  <div className="text-muted small fw-semibold">Total Próximas</div>
                  <h3 className="mb-0 fw-bold" style={{ color: '#8c2a3e' }}>
                    {allActiveAppointments.length}
                  </h3>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        {/* Pestañas Rápidas y Buscador */}
        <Card className="border-0 shadow-sm mb-4" style={{ borderRadius: '14px', background: '#fff' }}>
          <Card.Body className="p-3">
            <Row className="g-3 align-items-center">
              <Col xs={12} md={7}>
                <Nav variant="pills" className="gap-2 flex-wrap">
                  <Nav.Item>
                    <Nav.Link
                      active={activeTab === 'TODAY'}
                      onClick={() => setActiveTab('TODAY')}
                      style={{
                        borderRadius: '10px',
                        fontWeight: 600,
                        background: activeTab === 'TODAY' ? '#8c2a3e' : '#fff',
                        color: activeTab === 'TODAY' ? '#fff' : '#5c3d2e',
                        border: '1px solid #eed0c5',
                        fontSize: '13.5px',
                      }}
                    >
                      📅 Citas de Hoy ({todayAppointments.length})
                    </Nav.Link>
                  </Nav.Item>
                  <Nav.Item>
                    <Nav.Link
                      active={activeTab === 'TOMORROW'}
                      onClick={() => setActiveTab('TOMORROW')}
                      style={{
                        borderRadius: '10px',
                        fontWeight: 600,
                        background: activeTab === 'TOMORROW' ? '#8c2a3e' : '#fff',
                        color: activeTab === 'TOMORROW' ? '#fff' : '#5c3d2e',
                        border: '1px solid #eed0c5',
                        fontSize: '13.5px',
                      }}
                    >
                      🌅 Citas de Mañana ({tomorrowAppointments.length})
                    </Nav.Link>
                  </Nav.Item>
                  <Nav.Item>
                    <Nav.Link
                      active={activeTab === 'ALL_PENDING'}
                      onClick={() => setActiveTab('ALL_PENDING')}
                      style={{
                        borderRadius: '10px',
                        fontWeight: 600,
                        background: activeTab === 'ALL_PENDING' ? '#8c2a3e' : '#fff',
                        color: activeTab === 'ALL_PENDING' ? '#fff' : '#5c3d2e',
                        border: '1px solid #eed0c5',
                        fontSize: '13.5px',
                      }}
                    >
                      ⏳ Todas las Pendientes ({pendingReminders.length})
                    </Nav.Link>
                  </Nav.Item>
                  <Nav.Item>
                    <Nav.Link
                      active={activeTab === 'UPCOMING'}
                      onClick={() => setActiveTab('UPCOMING')}
                      style={{
                        borderRadius: '10px',
                        fontWeight: 600,
                        background: activeTab === 'UPCOMING' ? '#8c2a3e' : '#fff',
                        color: activeTab === 'UPCOMING' ? '#fff' : '#5c3d2e',
                        border: '1px solid #eed0c5',
                        fontSize: '13.5px',
                      }}
                    >
                      🗓️ Todas ({allActiveAppointments.length})
                    </Nav.Link>
                  </Nav.Item>
                </Nav>
              </Col>

              <Col xs={12} md={5}>
                <div className="position-relative">
                  <Form.Control
                    type="text"
                    size="sm"
                    placeholder="Buscar por clienta, RUT, teléfono o servicio..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{ borderRadius: '8px', borderColor: '#eed0c5', paddingLeft: '32px' }}
                  />
                  <FiSearch className="position-absolute text-muted" style={{ top: '10px', left: '10px' }} />
                </div>
              </Col>
            </Row>
          </Card.Body>
        </Card>

        {/* Tabla de Citas */}
        <Card className="border-0 shadow-sm" style={{ borderRadius: '14px', background: '#fff', overflow: 'hidden' }}>
          <Card.Header className="bg-transparent border-0 pt-3 px-3 px-md-4">
            <h5 className="mb-0 fw-bold" style={{ color: '#422314', fontSize: '1rem' }}>
              Listado de Citas ({tabAppointments.length})
            </h5>
          </Card.Header>

          <Card.Body className="p-0">
            {isLoading ? (
              <div className="text-center py-5">
                <Spinner animation="border" variant="danger" />
                <p className="text-muted mt-2 small">Cargando citas...</p>
              </div>
            ) : tabAppointments.length === 0 ? (
              <div className="text-center py-5 px-3">
                <FaCheckCircle size={40} className="text-success opacity-50 mb-2" />
                <h6 className="fw-bold" style={{ color: '#422314' }}>
                  No hay citas en este filtro
                </h6>
                <p className="text-muted small mb-0">
                  Todas las clientas de esta sección están al día o no tienen citas agendadas.
                </p>
              </div>
            ) : (
              <div className="table-responsive">
                <Table hover className="align-middle mb-0">
                  <thead style={{ background: '#fdf4f2' }}>
                    <tr>
                      <th className="ps-3 ps-md-4">Fecha y Hora</th>
                      <th>Clienta</th>
                      <th>Servicio</th>
                      <th>Estado Cita</th>
                      <th>Recordatorio</th>
                      <th className="text-end pe-3 pe-md-4">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tabAppointments.map((apt) => {
                      const isPending = !apt.reminderSent;
                      return (
                        <tr key={apt.id}>
                          <td className="ps-3 ps-md-4">
                            <div className="fw-bold" style={{ color: '#422314', fontSize: '14px' }}>
                              {apt.appointmentTime} hrs
                            </div>
                            <small className="text-muted" style={{ fontSize: '12px' }}>
                              {formatAppointmentDateTime(apt)}
                            </small>
                          </td>

                          <td>
                            <div className="fw-semibold" style={{ color: '#422314' }}>
                              {apt.customer?.fullName || 'Clienta'}
                            </div>
                            <small className="text-muted d-block" style={{ fontSize: '12px' }}>
                              {apt.customer?.phone || 'Sin teléfono'} {apt.customer?.rut ? `• ${apt.customer.rut}` : ''}
                            </small>
                          </td>

                          <td>
                            <span style={{ fontSize: '13.5px' }}>{getAppointmentServiceLabel(apt)}</span>
                          </td>

                          <td>
                            <Badge bg={statusColors[apt.status] || 'secondary'} style={{ fontSize: '11px' }}>
                              {statusLabels[apt.status] || apt.status}
                            </Badge>
                          </td>

                          <td>
                            {apt.reminderSent ? (
                              <Badge bg="success" style={{ fontSize: '11px' }}>
                                <FaCheckCircle className="me-1" /> Enviado
                              </Badge>
                            ) : (
                              <Badge bg="warning" text="dark" style={{ fontSize: '11px' }}>
                                <FaClock className="me-1" /> Pendiente
                              </Badge>
                            )}
                          </td>

                          <td className="text-end pe-3 pe-md-4">
                            <div className="d-flex justify-content-end gap-1 flex-wrap">
                              {/* Botón 1: Automático Backend */}
                              <Button
                                variant={isPending ? 'primary' : 'outline-secondary'}
                                size="sm"
                                onClick={() => handleSendSingleBackend(apt.id)}
                                disabled={sendingIds.has(apt.id)}
                                title="Enviar recordatorio automático vía Backend"
                                style={{
                                  borderRadius: '8px',
                                  fontSize: '12px',
                                  background: isPending ? '#8c2a3e' : undefined,
                                  borderColor: isPending ? '#8c2a3e' : undefined,
                                }}
                              >
                                {sendingIds.has(apt.id) ? (
                                  <Spinner animation="border" size="sm" />
                                ) : (
                                  <>
                                    <FaPaperPlane className="me-1" /> Auto
                                  </>
                                )}
                              </Button>

                              {/* Botón 2: Contingencia Manual WhatsApp */}
                              <Button
                                variant="outline-success"
                                size="sm"
                                onClick={() => handleSendManualWhatsApp(apt)}
                                title="Abrir chat de WhatsApp con recordatorio pre-cargado"
                                style={{ borderRadius: '8px', fontSize: '12px' }}
                              >
                                <FaWhatsapp className="me-1" /> WhatsApp
                              </Button>
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
      </Container>
    </DashboardLayout>
  );
}
