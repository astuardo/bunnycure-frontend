/**
 * Página de Calendario
 * Vista mensual de todas las citas usando react-big-calendar
 */

import { useEffect, useState, useMemo } from 'react';
import { Container, Card, Badge, Spinner } from 'react-bootstrap';
import { Calendar, dateFnsLocalizer, Event } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { es } from 'date-fns/locale';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import DashboardLayout from '../../components/common/DashboardLayout';
import { useAppointmentsStore } from '../../stores/appointmentsStore';
import { Appointment, AppointmentStatus } from '../../types/appointment.types';
import { useNavigate } from 'react-router-dom';

const locales = { es };

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { locale: es }),
  getDay,
  locales,
});

interface CalendarEvent extends Event {
  resource: {
    id: number;
    status: AppointmentStatus;
    customerName: string;
    serviceName: string;
  };
}

const statusColors: Record<AppointmentStatus, string> = {
  CONFIRMED: '#0d6efd',
  PENDING: '#ffc107',
  COMPLETED: '#198754',
  CANCELLED: '#dc3545',
  NO_SHOW: '#6c757d',
};

const statusLabels: Record<AppointmentStatus, string> = {
  CONFIRMED: 'Confirmada',
  PENDING: 'Pendiente',
  COMPLETED: 'Completada',
  CANCELLED: 'Cancelada',
  NO_SHOW: 'No asistió',
};

export default function CalendarPage() {
  const navigate = useNavigate();
  const { appointments, isLoading, fetchAppointments } = useAppointmentsStore();
  const [view, setView] = useState<'month' | 'week' | 'day'>('month');

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  const events: CalendarEvent[] = useMemo(() => {
    return appointments.map((apt: Appointment) => {
      const startDate = new Date(`${apt.date}T${apt.startTime}`);
      const endDate = new Date(`${apt.date}T${apt.endTime}`);

      return {
        id: apt.id,
        title: `${apt.customer.fullName} - ${apt.service.name}`,
        start: startDate,
        end: endDate,
        resource: {
          id: apt.id,
          status: apt.status,
          customerName: apt.customer.fullName,
          serviceName: apt.service.name,
        },
      };
    });
  }, [appointments]);

  const handleSelectEvent = (event: CalendarEvent) => {
    navigate(`/appointments`);
  };

  const eventStyleGetter = (event: CalendarEvent) => {
    const backgroundColor = statusColors[event.resource.status] || '#6c757d';
    
    return {
      style: {
        backgroundColor,
        borderRadius: '5px',
        opacity: 0.9,
        color: 'white',
        border: '0',
        display: 'block',
      },
    };
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

        <Card>
          <Card.Body style={{ height: '700px' }}>
            <Calendar
              localizer={localizer}
              events={events}
              startAccessor="start"
              endAccessor="end"
              style={{ height: '100%' }}
              onSelectEvent={handleSelectEvent}
              eventPropGetter={eventStyleGetter}
              view={view}
              onView={(newView) => setView(newView as 'month' | 'week' | 'day')}
              views={['month', 'week', 'day']}
              messages={{
                next: 'Siguiente',
                previous: 'Anterior',
                today: 'Hoy',
                month: 'Mes',
                week: 'Semana',
                day: 'Día',
                agenda: 'Agenda',
                date: 'Fecha',
                time: 'Hora',
                event: 'Evento',
                noEventsInRange: 'No hay citas en este rango de fechas.',
                showMore: (total) => `+ Ver más (${total})`,
              }}
              culture="es"
            />
          </Card.Body>
        </Card>

        <div className="mt-3">
          <Card>
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
        </div>
      </Container>
    </DashboardLayout>
  );
}
