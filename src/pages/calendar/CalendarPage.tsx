/**
 * Página de Calendario
 * Vista mensual tipo grid con indicadores de citas (dots)
 * Basado en el diseño del sistema monolito
 */

import { useEffect, useState, useMemo } from 'react';
import { Container, Card, Badge, Spinner, Button, Table, Dropdown } from 'react-bootstrap';
import { 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  format, 
  isSameDay, 
  isToday, 
  isSameMonth,
  addMonths,
  subMonths,
  startOfWeek,
  endOfWeek
} from 'date-fns';
import { es } from 'date-fns/locale';
import { FaChevronLeft, FaChevronRight, FaWhatsapp, FaBell, FaEnvelope } from 'react-icons/fa';
import DashboardLayout from '../../components/common/DashboardLayout';
import { useAppointmentsStore } from '../../stores/appointmentsStore';
import { Appointment, AppointmentStatus } from '../../types/appointment.types';
import { appointmentsApi } from '../../api/appointments.api';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../../hooks/useToast';
import './CalendarPage.css';

interface CalendarDayCell {
  date: Date;
  isToday: boolean;
  isSelected: boolean;
  isOutsideMonth: boolean;
  appointmentCount: number;
  appointments: Appointment[];
}

const statusColors: Record<AppointmentStatus, string> = {
  CONFIRMED: '#0d6efd',
  PENDING: '#ffc107',
  COMPLETED: '#198754',
  CANCELLED: '#dc3545',
};

const statusLabels: Record<AppointmentStatus, string> = {
  CONFIRMED: 'Confirmada',
  PENDING: 'Pendiente',
  COMPLETED: 'Completada',
  CANCELLED: 'Cancelada',
};

const weekDayNames = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

export default function CalendarPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const { appointments, isLoading, fetchAppointments } = useAppointmentsStore();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  // Handlers para notificaciones y WhatsApp
  const handleSendNotification = async (id: number) => {
    try {
      await appointmentsApi.sendNotification(id);
      toast.success('📧 Notificación enviada correctamente');
    } catch (err: unknown) {
      const error = err as { message?: string };
      toast.error(error.message || 'Error al enviar notificación');
    }
  };

  const handleWhatsAppHandoff = async (id: number) => {
    try {
      const url = await appointmentsApi.whatsappHandoff(id);
      window.open(url, '_blank');
      toast.success('✅ Abriendo WhatsApp para traspaso');
    } catch (err: unknown) {
      const error = err as { message?: string };
      toast.error(error.message || 'Error al generar handoff');
    }
  };

  const handleSendWhatsAppConfirmation = async (id: number) => {
    try {
      await appointmentsApi.sendWhatsAppConfirmation(id);
      toast.success('✅ Confirmación enviada por WhatsApp');
    } catch (err: unknown) {
      const error = err as { message?: string };
      toast.error(error.message || 'Error al enviar confirmación');
    }
  };

  const handleSendWhatsAppReminder = async (id: number) => {
    try {
      await appointmentsApi.sendWhatsAppReminder(id);
      toast.success('✅ Recordatorio enviado por WhatsApp');
    } catch (err: unknown) {
      const error = err as { message?: string };
      toast.error(error.message || 'Error al enviar recordatorio');
    }
  };

  // Generar celdas del calendario
  const calendarCells = useMemo((): CalendarDayCell[] => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    
    // Obtener el inicio y fin del calendario (incluyendo días de meses adyacentes)
    // weekStartsOn: 1 = Monday
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    
    const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });
    
    return days.map(day => {
      const dayAppointments = appointments.filter(apt => {
        // Parsear fecha del backend (puede venir como "2026-04-07" o "2026-04-07T00:00:00")
        const aptDateStr = apt.appointmentDate;
        let aptDate: Date;
        
        // Si la fecha incluye 'T', es ISO completo, sino solo fecha
        if (aptDateStr.includes('T')) {
          aptDate = new Date(aptDateStr);
        } else {
          // Agregar timezone local para evitar problemas de UTC
          aptDate = new Date(aptDateStr + 'T00:00:00');
        }
        
        return isSameDay(aptDate, day);
      });
      
      return {
        date: day,
        isToday: isToday(day),
        isSelected: selectedDate ? isSameDay(day, selectedDate) : false,
        isOutsideMonth: !isSameMonth(day, currentMonth),
        appointmentCount: dayAppointments.length,
        appointments: dayAppointments,
      };
    });
  }, [currentMonth, appointments, selectedDate]);

  // Citas del día seleccionado
  const selectedDayAppointments = useMemo(() => {
    if (!selectedDate) return [];
    
    return appointments
      .filter(apt => {
        const aptDateStr = apt.appointmentDate;
        let aptDate: Date;
        
        if (aptDateStr.includes('T')) {
          aptDate = new Date(aptDateStr);
        } else {
          aptDate = new Date(aptDateStr + 'T00:00:00');
        }
        
        return isSameDay(aptDate, selectedDate);
      })
      .sort((a, b) => {
        // Ordenar por hora
        return a.appointmentTime.localeCompare(b.appointmentTime);
      });
  }, [appointments, selectedDate]);

  const handlePrevMonth = () => {
    setCurrentMonth(prev => subMonths(prev, 1));
    setSelectedDate(null);
  };

  const handleNextMonth = () => {
    setCurrentMonth(prev => addMonths(prev, 1));
    setSelectedDate(null);
  };

  const handleToday = () => {
    setCurrentMonth(new Date());
    setSelectedDate(new Date());
  };

  const handleDayClick = (cell: CalendarDayCell) => {
    setSelectedDate(cell.date);
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <Container fluid className="py-4">
          <div className="text-center py-5">
            <Spinner animation="border" variant="primary" />
            <p className="mt-3 text-muted">Cargando calendario...</p>
          </div>
        </Container>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <Container fluid className="py-4">
        {/* Header */}
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div>
            <h2 className="mb-1">📅 Calendario de Citas</h2>
            <p className="text-muted mb-0">Vista mensual de todas las citas programadas</p>
          </div>
          <div className="d-flex gap-2 flex-wrap">
            {Object.entries(statusLabels).map(([status, label]) => (
              <Badge
                key={status}
                style={{
                  backgroundColor: statusColors[status as AppointmentStatus],
                  color: 'white',
                }}
              >
                {label}
              </Badge>
            ))}
          </div>
        </div>

        {/* Calendario */}
        <Card>
          <Card.Body className="p-3">
            {/* Navegación del mes */}
            <div className="calendar-header">
              <div className="month-navigation">
                <button 
                  className="nav-button" 
                  onClick={handlePrevMonth}
                  aria-label="Mes anterior"
                >
                  <FaChevronLeft />
                </button>
                
                <h3 className="month-title">
                  {format(currentMonth, 'MMMM yyyy', { locale: es })}
                </h3>
                
                <button 
                  className="nav-button" 
                  onClick={handleNextMonth}
                  aria-label="Mes siguiente"
                >
                  <FaChevronRight />
                </button>
              </div>
              
              <Button 
                variant="outline-primary" 
                size="sm"
                onClick={handleToday}
              >
                Hoy
              </Button>
            </div>

            {/* Cabecera de días de la semana */}
            <div className="month-week-header">
              {weekDayNames.map(day => (
                <div key={day}>{day}</div>
              ))}
            </div>

            {/* Grid de días */}
            <div className="month-grid">
              {calendarCells.map((cell, idx) => (
                <div key={idx} onClick={() => handleDayClick(cell)}>
                  <div
                    className={`month-day-card ${
                      cell.isSelected ? 'is-selected' :
                      cell.isToday ? 'is-today' :
                      cell.isOutsideMonth ? 'is-outside' : ''
                    }`}
                  >
                    <div className="month-day-number">
                      {format(cell.date, 'd')}
                    </div>
                    
                    {/* Indicadores de citas (dots) */}
                    {cell.appointmentCount > 0 && (
                      <div className="month-day-dots">
                        {cell.appointmentCount === 1 ? (
                          <span className="month-day-dot-fallback">•</span>
                        ) : (
                          Array.from({ length: Math.min(cell.appointmentCount, 5) }).map((_, i) => (
                            <span key={i} className="month-day-dot"></span>
                          ))
                        )}
                      </div>
                    )}
                    
                    {/* Label de cantidad */}
                    {cell.appointmentCount > 0 && (
                      <div className="month-day-mini-label">
                        {cell.appointmentCount === 1 
                          ? '1 cita' 
                          : `${cell.appointmentCount} citas`}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card.Body>
        </Card>

        {/* Citas del día seleccionado */}
        {selectedDate && (
          <Card className="mt-3 selected-day-section">
            <div className="selected-day-header">
              Citas del día: {format(selectedDate, 'EEEE dd/MM/yyyy', { locale: es })}
            </div>
            
            {selectedDayAppointments.length === 0 ? (
              <Card.Body>
                <p className="no-appointments-message">
                  No hay citas programadas para este día
                </p>
              </Card.Body>
            ) : (
              <Card.Body className="p-0">
                <Table hover responsive className="mb-0 appointments-table">
                  <thead>
                    <tr>
                      <th>Hora</th>
                      <th>Cliente</th>
                      <th>Servicio</th>
                      <th>Estado</th>
                      <th className="text-end">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedDayAppointments.map(apt => (
                      <tr key={apt.id}>
                        <td>
                          <span className="appointment-time">
                            {apt.appointmentTime}
                          </span>
                        </td>
                        <td>
                          <a
                            href="#"
                            onClick={(e) => {
                              e.preventDefault();
                              navigate(`/customers/${apt.customer.id}`);
                            }}
                            className="text-decoration-none"
                          >
                            {apt.customer.fullName}
                          </a>
                        </td>
                        <td>{apt.service.name}</td>
                        <td>
                          <span className={`status-badge ${apt.status}`}>
                            {statusLabels[apt.status]}
                          </span>
                        </td>
                        <td className="text-end">
                          <div className="d-flex gap-1 justify-content-end">
                            {/* Dropdown de notificaciones y WhatsApp */}
                            <Dropdown>
                              <Dropdown.Toggle size="sm" variant="info" id={`cal-dropdown-${apt.id}`}>
                                📧
                              </Dropdown.Toggle>
                              <Dropdown.Menu align="end">
                                <Dropdown.Item onClick={() => handleSendNotification(apt.id)}>
                                  <FaBell className="me-2" />
                                  Enviar Notificación
                                </Dropdown.Item>
                                <Dropdown.Item onClick={() => handleSendWhatsAppConfirmation(apt.id)}>
                                  <FaWhatsapp className="me-2 text-success" />
                                  Confirmar por WhatsApp
                                </Dropdown.Item>
                                <Dropdown.Item onClick={() => handleSendWhatsAppReminder(apt.id)}>
                                  <FaEnvelope className="me-2 text-primary" />
                                  Recordatorio WhatsApp
                                </Dropdown.Item>
                                <Dropdown.Divider />
                                <Dropdown.Item onClick={() => handleWhatsAppHandoff(apt.id)}>
                                  <FaWhatsapp className="me-2 text-success" />
                                  Traspaso a Humano
                                </Dropdown.Item>
                              </Dropdown.Menu>
                            </Dropdown>
                            
                            {/* Botón ver detalles */}
                            <Button
                              variant="outline-primary"
                              size="sm"
                              onClick={() => navigate('/appointments')}
                            >
                              Ver detalles
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </Card.Body>
            )}
          </Card>
        )}

        {/* Resumen estadístico */}
        <Card className="mt-3">
          <Card.Body>
            <h6 className="mb-3">📊 Resumen</h6>
            <div className="row text-center">
              <div className="col">
                <div className="h3 mb-0">{appointments.length}</div>
                <div className="small text-muted">Total Citas</div>
              </div>
              <div className="col">
                <div className="h3 mb-0">
                  {appointments.filter((a: Appointment) => a.status === 'CONFIRMED').length}
                </div>
                <div className="small text-muted">Confirmadas</div>
              </div>
              <div className="col">
                <div className="h3 mb-0">
                  {appointments.filter((a: Appointment) => a.status === 'PENDING').length}
                </div>
                <div className="small text-muted">Pendientes</div>
              </div>
              <div className="col">
                <div className="h3 mb-0">
                  {appointments.filter((a: Appointment) => a.status === 'COMPLETED').length}
                </div>
                <div className="small text-muted">Completadas</div>
              </div>
            </div>
          </Card.Body>
        </Card>
      </Container>
    </DashboardLayout>
  );
}
