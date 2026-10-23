/**
 * Página de Calendario
 * Vista mensual tipo grid con indicadores de citas (dots)
 * Basado en el diseño del sistema BunnyCure
 */

import { useEffect, useState, useMemo } from 'react';
import { 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  format, 
  isValid,
  isSameDay, 
  isToday, 
  isSameMonth,
  addMonths,
  subMonths,
  startOfWeek,
  endOfWeek
} from 'date-fns';
import { es } from 'date-fns/locale';
import { FaChevronLeft, FaChevronRight, FaWhatsapp, FaBell, FaEnvelope, FaHistory } from 'react-icons/fa';
import { FiCalendar, FiSlash, FiPlus } from 'react-icons/fi';
import { useNavigate, useSearchParams } from 'react-router-dom';
import DashboardLayout from '../../components/common/DashboardLayout';
import { RANGE_PAGE_SIZE, useAppointmentsStore } from '../../stores/appointmentsStore';
import { Appointment, AppointmentStatus } from '../../types/appointment.types';
import { appointmentsApi } from '../../api/appointments.api';
import { AppointmentNotificationsModal } from '../../components/appointments/AppointmentNotificationsModal';
import { useToast } from '../../hooks/useToast';
import { useCalendarDisplayConfig } from '@/hooks/useCalendarDisplayConfig';
import { getDayDotColors } from '@/utils/calendarDisplay';
import { 
  settingsApi, 
  loadCachedUnavailabilities, 
  loadCachedUnavailabilityColors, 
  loadCachedUnavailabilityNotifications 
} from '../../api/settings.api';
import { ScheduleUnavailabilitySection } from '../../components/settings/ScheduleUnavailabilitySection';
import {
  ScheduleUnavailability,
  UnavailabilityColorConfig,
  UnavailabilityNotificationConfig,
} from '../../types/unavailability.types';
import {
  isDateBlockedFullDay,
  getDateUnavailabilities,
} from '../../utils/unavailabilityUtils';
import { Button, Badge, Card, Spinner, Alert, Modal } from '@/components/ui';
import './CalendarPage.css';

interface CalendarDayCell {
  date: Date;
  isToday: boolean;
  isSelected: boolean;
  isOutsideMonth: boolean;
  appointmentCount: number;
  appointments: Appointment[];
  dotColors: string[];
  isFullDayBlocked: boolean;
  blockReason?: string;
  isTimeSlotBlocked: boolean;
  timeSlotBlocks: ScheduleUnavailability[];
}

const statusColors: Record<AppointmentStatus, string> = {
  CONFIRMED: '#0d6efd',
  PENDING: '#ffc107',
  COMPLETED: '#198754',
  CANCELLED: '#dc3545',
  RESCHEDULE_REQUESTED: '#fd7e14',
};

const statusLabels: Record<AppointmentStatus, string> = {
  CONFIRMED: 'Confirmada',
  PENDING: 'Pendiente',
  COMPLETED: 'Completada',
  CANCELLED: 'Cancelada',
  RESCHEDULE_REQUESTED: 'Reprogramar',
};

const weekDayNames = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

const getAppointmentServiceLabel = (apt: Appointment) => {
  const services = apt.services && apt.services.length > 0 ? apt.services : [apt.service];
  return services.map((service) => service.name).join(' + ');
};

export default function CalendarPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const toast = useToast();
  const { appointments, isLoading, fetchAppointments } = useAppointmentsStore();
  const calendarDisplayConfig = useCalendarDisplayConfig();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showBlocksModal, setShowBlocksModal] = useState(false);
  const [unavailabilities, setUnavailabilities] = useState<ScheduleUnavailability[]>(loadCachedUnavailabilities);
  const [unavailabilityColors, setUnavailabilityColors] = useState<UnavailabilityColorConfig>(loadCachedUnavailabilityColors);
  const [unavailabilityNotifications, setUnavailabilityNotifications] = useState<UnavailabilityNotificationConfig>(loadCachedUnavailabilityNotifications);
  const [openDropdownAptId, setOpenDropdownAptId] = useState<number | null>(null);

  const todayStr = useMemo(() => format(new Date(), 'yyyy-MM-dd'), []);

  // Citas de las semanas visibles del mes en pantalla; se vuelven a pedir al cambiar de mes
  const visibleRange = useMemo(
    () => ({
      startDate: format(startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 1 }), 'yyyy-MM-dd'),
      endDate: format(endOfWeek(endOfMonth(currentMonth), { weekStartsOn: 1 }), 'yyyy-MM-dd'),
    }),
    [currentMonth]
  );
  useEffect(() => {
    fetchAppointments({ ...visibleRange, size: RANGE_PAGE_SIZE }).catch(() => {});
  }, [fetchAppointments, visibleRange]);

  useEffect(() => {
    settingsApi.getAll()
      .then((data) => {
        if (data.unavailabilities && data.unavailabilities.length > 0) {
          setUnavailabilities(data.unavailabilities);
        }
        if (data.unavailabilityColors) {
          setUnavailabilityColors(data.unavailabilityColors);
        }
        if (data.unavailabilityNotifications) {
          setUnavailabilityNotifications(data.unavailabilityNotifications);
        }
      })
      .catch((err: unknown) => console.error('Error cargando configuraciones de calendario:', err));
  }, []);

  // Si viene con parámetro ?date=YYYY-MM-DD
  useEffect(() => {
    const dateParam = searchParams.get('date');
    if (dateParam) {
      const parsed = new Date(`${dateParam}T00:00:00`);
      if (isValid(parsed)) {
        setSelectedDate(parsed);
        setCurrentMonth(parsed);
      }
    }

    if (searchParams.get('manageBlocks') === '1' || searchParams.get('block') === '1') {
      setShowBlocksModal(true);
    }
  }, [searchParams]);

  // Cerrar dropdown al hacer click afuera
  useEffect(() => {
    const handleClickOutside = () => setOpenDropdownAptId(null);
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  const activeUnavailabilitiesCount = useMemo(() => {
    return unavailabilities.length;
  }, [unavailabilities]);

  const handleUnavailabilitiesChange = async (updated: ScheduleUnavailability[]) => {
    setUnavailabilities(updated);
    try {
      await settingsApi.saveAll({ unavailabilities: updated });
      toast.success('Bloqueos guardados');
    } catch {
      toast.error('Error al guardar bloqueos');
    }
  };

  const handleColorsChange = async (updated: UnavailabilityColorConfig) => {
    setUnavailabilityColors(updated);
    try {
      await settingsApi.saveAll({ unavailabilityColors: updated });
      toast.success('Colores guardados');
    } catch {
      toast.error('Error al guardar colores');
    }
  };

  const handleNotificationsChange = async (updated: UnavailabilityNotificationConfig) => {
    setUnavailabilityNotifications(updated);
    try {
      await settingsApi.saveAll({ unavailabilityNotifications: updated });
      toast.success('Notificaciones guardadas');
    } catch {
      toast.error('Error al guardar notificaciones');
    }
  };

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

  const [selectedNotificationsApt, setSelectedNotificationsApt] = useState<Appointment | null>(null);

  // Generar celdas del calendario
  const calendarCells = useMemo((): CalendarDayCell[] => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    
    const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });
    
    return days.map(day => {
      const dayAppointments = appointments.filter(apt => {
        const aptDateStr = apt.appointmentDate;
        let aptDate: Date;
        
        if (aptDateStr.includes('T')) {
          aptDate = new Date(aptDateStr);
        } else {
          aptDate = new Date(aptDateStr + 'T00:00:00');
        }
        
        return isSameDay(aptDate, day);
      });
      
      const fullDayBlock = isDateBlockedFullDay(day, unavailabilities);
      const dayBlocks = getDateUnavailabilities(day, unavailabilities);
      const slotBlocks = dayBlocks.filter(b => b.type === 'TIME_SLOT');

      return {
        date: day,
        isToday: isToday(day),
        isSelected: selectedDate ? isSameDay(day, selectedDate) : false,
        isOutsideMonth: !isSameMonth(day, currentMonth),
        appointmentCount: dayAppointments.length,
        appointments: dayAppointments,
        dotColors: getDayDotColors(dayAppointments, calendarDisplayConfig),
        isFullDayBlocked: fullDayBlock.blocked,
        blockReason: fullDayBlock.reason,
        isTimeSlotBlocked: slotBlocks.length > 0,
        timeSlotBlocks: slotBlocks,
      };
    });
  }, [currentMonth, appointments, selectedDate, calendarDisplayConfig, unavailabilities]);

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
        return a.appointmentTime.localeCompare(b.appointmentTime);
      });
  }, [appointments, selectedDate]);

  const selectedDayUnavailabilities = useMemo(() => {
    if (!selectedDate) return [];
    return getDateUnavailabilities(selectedDate, unavailabilities);
  }, [selectedDate, unavailabilities]);

  // Citas del mes en curso / seleccionado
  const currentMonthAppointments = useMemo(() => {
    return appointments.filter(apt => {
      const aptDateStr = apt.appointmentDate;
      if (!aptDateStr) return false;
      const aptDate = aptDateStr.includes('T') ? new Date(aptDateStr) : new Date(aptDateStr + 'T00:00:00');
      return isValid(aptDate) && isSameMonth(aptDate, currentMonth);
    });
  }, [appointments, currentMonth]);

  const monthConfirmed = useMemo(() => currentMonthAppointments.filter(a => a.status === 'CONFIRMED').length, [currentMonthAppointments]);
  const monthPending = useMemo(() => currentMonthAppointments.filter(a => a.status === 'PENDING').length, [currentMonthAppointments]);
  const monthCompleted = useMemo(() => currentMonthAppointments.filter(a => a.status === 'COMPLETED').length, [currentMonthAppointments]);
  const monthCancelled = useMemo(() => currentMonthAppointments.filter(a => a.status === 'CANCELLED').length, [currentMonthAppointments]);

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
        <div className="text-center py-16">
          <Spinner size="lg" className="border-bunny-primary mx-auto" />
          <p className="mt-3 text-bunny-text-muted text-sm">Cargando calendario...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 lg:p-8 space-y-5 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-bunny-cocoa mb-1">
              📅 Calendario de Citas
            </h1>
            <p className="text-bunny-text-muted text-sm">Vista mensual de todas las citas programadas</p>
            <div className="calendar-time-legend mt-2 flex flex-wrap gap-2 text-xs">
              <span className="flex items-center gap-1"><i style={{ background: calendarDisplayConfig.morning.color }} /> {calendarDisplayConfig.morning.start}–{calendarDisplayConfig.morning.end}</span>
              <span className="flex items-center gap-1"><i style={{ background: calendarDisplayConfig.afternoon.color }} /> {calendarDisplayConfig.afternoon.start}–{calendarDisplayConfig.afternoon.end}</span>
              <span className="flex items-center gap-1"><i style={{ background: calendarDisplayConfig.night.color }} /> {calendarDisplayConfig.night.start}–{calendarDisplayConfig.night.end}</span>
              <span className="flex items-center gap-1 rounded px-1.5 py-0.5 border" style={{ background: unavailabilityColors.fullDayColor, borderColor: '#f87171', color: '#991b1b', fontWeight: 600 }}>
                <i style={{ background: '#f87171' }} /> Día Cerrado
              </span>
              <span className="flex items-center gap-1 rounded px-1.5 py-0.5 border" style={{ background: unavailabilityColors.timeSlotColor, borderColor: '#f59e0b', color: '#92400e', fontWeight: 600 }}>
                <i style={{ background: '#f59e0b' }} /> Horario Bloqueado
              </span>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap items-center">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowBlocksModal(true)}
              className="flex items-center gap-2 border-rose-300 text-rose-700 hover:bg-rose-50 font-semibold text-xs py-2 px-3 shadow-sm"
            >
              <FiSlash /> Bloquear Agenda ({activeUnavailabilitiesCount})
            </Button>
            {Object.entries(statusLabels).map(([status, label]) => (
              <span
                key={status}
                style={{
                  backgroundColor: statusColors[status as AppointmentStatus],
                  color: 'white',
                  padding: '6px 10px',
                  borderRadius: '8px',
                  fontSize: '11px',
                  fontWeight: 600,
                }}
              >
                {label}
              </span>
            ))}
          </div>
        </div>

        {/* Calendario */}
        <Card className="border border-bunny-border shadow-sm bg-white overflow-hidden">
          <Card.Body className="p-3.5 sm:p-4">
            {/* Navegación del mes */}
            <div className="calendar-header mb-3">
              <div className="month-navigation flex items-center gap-3">
                <button 
                  type="button"
                  className="nav-button p-2 rounded-lg border border-bunny-border hover:bg-bunny-paper transition-colors" 
                  onClick={handlePrevMonth}
                  aria-label="Mes anterior"
                >
                  <FaChevronLeft size={13} />
                </button>
                
                <h3 className="month-title text-base sm:text-lg font-bold text-bunny-dark capitalize m-0">
                  {format(currentMonth, 'MMMM yyyy', { locale: es })}
                </h3>
                
                <button 
                  type="button"
                  className="nav-button p-2 rounded-lg border border-bunny-border hover:bg-bunny-paper transition-colors" 
                  onClick={handleNextMonth}
                  aria-label="Mes siguiente"
                >
                  <FaChevronRight size={13} />
                </button>
              </div>
              
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleToday}
                className="text-xs"
              >
                Hoy
              </Button>
            </div>

            {/* Cabecera de días de la semana */}
            <div className="month-week-header mb-1">
              {weekDayNames.map(day => (
                <div key={day} className="text-center font-bold text-xs text-bunny-dark/70 py-1">{day}</div>
              ))}
            </div>

            {/* Grid de días */}
            <div className="month-grid">
              {calendarCells.map((cell, idx) => {
                let cellCustomStyle: React.CSSProperties = {};
                if (!cell.isSelected) {
                  if (cell.isFullDayBlocked) {
                    cellCustomStyle = {
                      backgroundColor: unavailabilityColors.fullDayColor,
                      borderColor: '#f87171',
                    };
                  } else if (cell.isTimeSlotBlocked) {
                    cellCustomStyle = {
                      backgroundColor: unavailabilityColors.timeSlotColor,
                      borderColor: '#f59e0b',
                    };
                  }
                }

                return (
                  <div key={idx} onClick={() => handleDayClick(cell)}>
                    <div
                      className={`month-day-card ${
                        cell.isSelected ? 'is-selected' :
                        cell.isToday ? 'is-today' :
                        cell.isOutsideMonth ? 'is-outside' : ''
                      }`}
                      style={cellCustomStyle}
                    >
                      <div className="month-day-number text-xs font-semibold">
                        {format(cell.date, 'd')}
                      </div>

                      {/* Tag de Día Completo Bloqueado */}
                      {cell.isFullDayBlocked && (
                        <div className="month-day-block-tag text-[9px]" title={`Cerrado: ${cell.blockReason}`}>
                          🚫 {cell.blockReason}
                        </div>
                      )}

                      {/* Tag de Horario Parcial Bloqueado */}
                      {!cell.isFullDayBlocked && cell.isTimeSlotBlocked && (
                        <div
                          className="month-day-slot-tag text-[9px]"
                          title={cell.timeSlotBlocks.map(b => `${b.startTime}-${b.endTime}: ${b.reason}`).join(' | ')}
                        >
                          ⏰ {cell.timeSlotBlocks[0]?.reason}
                        </div>
                      )}
                      
                      {/* Indicadores de citas (dots) */}
                      {cell.appointmentCount > 0 && (
                        <div className="month-day-dots">
                          {cell.dotColors.map((color, i) => (
                            <span key={i} className="month-day-dot" style={{ backgroundColor: color }}></span>
                          ))}
                        </div>
                      )}
                      
                      {/* Label de cantidad */}
                      {cell.appointmentCount > 0 && (
                        <div className="month-day-mini-label text-[9px]">
                          {cell.appointmentCount === 1 
                            ? '1 cita' 
                            : `${cell.appointmentCount} citas`}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card.Body>
        </Card>

        {/* Citas del día seleccionado */}
        {selectedDate && (
          <Card className="border border-bunny-border shadow-sm bg-white overflow-hidden">
            <Card.Header className="bg-bunny-paper border-b border-bunny-border py-3 px-4 flex justify-between items-center flex-wrap gap-2">
              <span className="font-bold text-sm sm:text-base text-bunny-text">
                Citas del día: {format(selectedDate, 'EEEE dd/MM/yyyy', { locale: es })}
              </span>
              {isDateBlockedFullDay(selectedDate, unavailabilities).blocked ? (
                <Badge variant="danger" className="py-1 px-2.5 font-bold flex items-center gap-1 text-xs">
                  🚫 Día Cerrado ({isDateBlockedFullDay(selectedDate, unavailabilities).reason || 'Bloqueado'}) - No disponible
                </Badge>
              ) : format(selectedDate, 'yyyy-MM-dd') < todayStr ? (
                <Badge variant="secondary" className="py-1 px-2.5 font-medium flex items-center gap-1 text-xs">
                  ⏳ Fecha Pasada (No disponible para agendar)
                </Badge>
              ) : (
                <Button
                  variant="primary"
                  size="sm"
                  className="flex items-center gap-1 bg-bunny-primary hover:bg-bunny-dark text-white font-semibold text-xs py-1.5 px-3"
                  onClick={() => navigate(`/appointments?create=1&date=${format(selectedDate, 'yyyy-MM-dd')}`)}
                >
                  <FiPlus /> Agendar Cita en este día
                </Button>
              )}
            </Card.Header>

            {/* Alertas de Bloqueos para el día seleccionado */}
            {selectedDayUnavailabilities.length > 0 && (
              <div className="p-3 pb-1 space-y-2">
                {selectedDayUnavailabilities.map((u) => (
                  <Alert
                    key={u.id}
                    variant={u.type === 'FULL_DAY' ? 'danger' : 'warning'}
                    className="flex items-center justify-between py-2 px-3 text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{u.type === 'FULL_DAY' ? '🚫' : '⏰'}</span>
                      <div>
                        <div className="font-bold">
                          {u.type === 'FULL_DAY'
                            ? 'Día Completo Cerrado / No Disponible'
                            : `Horario Bloqueado: ${u.startTime} a ${u.endTime} hrs`}
                        </div>
                        <small className="text-bunny-text-muted">{u.reason}</small>
                      </div>
                    </div>
                    <Badge variant={u.type === 'FULL_DAY' ? 'danger' : 'warning'}>
                      {u.type === 'FULL_DAY' ? 'CERRADO' : 'BLOQUEO'}
                    </Badge>
                  </Alert>
                ))}
              </div>
            )}
            
            {selectedDayAppointments.length === 0 ? (
              <Card.Body className="p-6 text-center text-bunny-text-muted/70 text-sm">
                No hay citas programadas para este día
              </Card.Body>
            ) : (
              <Card.Body className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs sm:text-sm">
                    <thead className="bg-bunny-paper border-b border-bunny-border text-bunny-text-muted font-semibold uppercase text-xs">
                      <tr>
                        <th className="py-3 px-4">Hora</th>
                        <th className="py-3 px-4">Cliente</th>
                        <th className="py-3 px-4">Servicio</th>
                        <th className="py-3 px-4">Estado</th>
                        <th className="py-3 px-4 text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-bunny-border">
                      {selectedDayAppointments.map(apt => (
                        <tr key={apt.id} className="hover:bg-bunny-paper/60 transition-colors">
                          <td className="py-3 px-4 font-bold text-bunny-text">
                            {apt.appointmentTime}
                          </td>
                          <td className="py-3 px-4">
                            <div>
                              <button
                                type="button"
                                onClick={() => navigate(`/customers/${apt.customer.id}`)}
                                className="font-bold text-bunny-dark hover:underline text-left block"
                              >
                                {apt.customer.fullName}
                              </button>
                              <small className="text-bunny-text-muted/70 block text-xs">
                                🪪 {apt.customer.rut?.trim() ? apt.customer.rut.trim() : 'No tiene'}
                              </small>
                            </div>
                          </td>
                          <td className="py-3 px-4 font-medium text-bunny-text">{getAppointmentServiceLabel(apt)}</td>
                          <td className="py-3 px-4">
                            <span className={`status-badge ${apt.status}`}>
                              {statusLabels[apt.status]}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex gap-1.5 justify-end items-center relative">
                              {/* Dropdown de notificaciones y WhatsApp */}
                              <div className="relative">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setOpenDropdownAptId(openDropdownAptId === apt.id ? null : apt.id);
                                  }}
                                  className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100 transition-colors"
                                  title="Acciones y notificaciones"
                                >
                                  📧
                                </button>
                                {openDropdownAptId === apt.id && (
                                  <div
                                    onClick={(e) => e.stopPropagation()}
                                    className="absolute right-0 top-full mt-1 w-52 bg-white rounded-xl shadow-lg border border-bunny-border py-1.5 z-50 text-xs"
                                  >
                                    <button
                                      type="button"
                                      className="w-full text-left px-3 py-1.5 hover:bg-bunny-paper flex items-center gap-2 text-bunny-text"
                                      onClick={() => {
                                        setOpenDropdownAptId(null);
                                        handleSendNotification(apt.id);
                                      }}
                                    >
                                      <FaBell className="text-amber-500" /> Enviar Notificación
                                    </button>
                                    <button
                                      type="button"
                                      className="w-full text-left px-3 py-1.5 hover:bg-bunny-paper flex items-center gap-2 text-bunny-text"
                                      onClick={() => {
                                        setOpenDropdownAptId(null);
                                        handleSendWhatsAppConfirmation(apt.id);
                                      }}
                                    >
                                      <FaWhatsapp className="text-emerald-500" /> Confirmar por WhatsApp
                                    </button>
                                    <button
                                      type="button"
                                      className="w-full text-left px-3 py-1.5 hover:bg-bunny-paper flex items-center gap-2 text-bunny-text"
                                      onClick={() => {
                                        setOpenDropdownAptId(null);
                                        handleSendWhatsAppReminder(apt.id);
                                      }}
                                    >
                                      <FaEnvelope className="text-sky-500" /> Recordatorio WhatsApp
                                    </button>
                                    <div className="border-t border-bunny-border my-1"></div>
                                    <button
                                      type="button"
                                      className="w-full text-left px-3 py-1.5 hover:bg-bunny-paper flex items-center gap-2 text-bunny-text"
                                      onClick={() => {
                                        setOpenDropdownAptId(null);
                                        setSelectedNotificationsApt(apt);
                                      }}
                                    >
                                      <FaHistory className="text-sky-600" /> Historial de Mensajes
                                    </button>
                                    <div className="border-t border-bunny-border my-1"></div>
                                    <button
                                      type="button"
                                      className="w-full text-left px-3 py-1.5 hover:bg-bunny-paper flex items-center gap-2 text-bunny-text"
                                      onClick={() => {
                                        setOpenDropdownAptId(null);
                                        handleWhatsAppHandoff(apt.id);
                                      }}
                                    >
                                      <FaWhatsapp className="text-emerald-500" /> Traspaso a Humano
                                    </button>
                                  </div>
                                )}
                              </div>
                              
                              {/* Botón ver detalles */}
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => navigate('/appointments')}
                                className="text-xs"
                              >
                                Ver detalles
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card.Body>
            )}
          </Card>
        )}

        {/* Resumen estadístico del mes en curso */}
        <Card className="border border-bunny-border shadow-sm bg-white overflow-hidden">
          <Card.Body className="p-4">
            <div className="flex justify-between items-center mb-3">
              <h6 className="font-bold text-sm text-bunny-text mb-0">
                📊 Resumen del Mes ({format(currentMonth, 'MMMM yyyy', { locale: es })})
              </h6>
              <Badge variant="secondary" className="text-xs">
                Total Histórico: {appointments.length} citas
              </Badge>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center">
              <div className="p-2.5 rounded-xl bg-bunny-paper border border-bunny-border">
                <div className="text-2xl font-bold text-bunny-text">{currentMonthAppointments.length}</div>
                <div className="text-xs text-bunny-text-muted mt-0.5">Citas del Mes</div>
              </div>
              <div className="p-2.5 rounded-xl bg-sky-50 border border-sky-100">
                <div className="text-2xl font-bold text-sky-700">{monthConfirmed}</div>
                <div className="text-xs text-sky-600 mt-0.5">Confirmadas</div>
              </div>
              <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-100">
                <div className="text-2xl font-bold text-amber-700">{monthPending}</div>
                <div className="text-xs text-amber-600 mt-0.5">Pendientes</div>
              </div>
              <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-100">
                <div className="text-2xl font-bold text-emerald-700">{monthCompleted}</div>
                <div className="text-xs text-emerald-600 mt-0.5">Completadas</div>
              </div>
              <div className="p-2.5 rounded-xl bg-rose-50 border border-bunny-border col-span-2 sm:col-span-1">
                <div className="text-2xl font-bold text-rose-700">{monthCancelled}</div>
                <div className="text-xs text-rose-600 mt-0.5">Canceladas</div>
              </div>
            </div>
          </Card.Body>
        </Card>

        {/* Modal de Bloqueos de Agenda */}
        <Modal 
          show={showBlocksModal} 
          onHide={() => {
            setShowBlocksModal(false);
            if (searchParams.get('manageBlocks') || searchParams.get('block')) {
              const nextParams = new URLSearchParams(searchParams);
              nextParams.delete('manageBlocks');
              nextParams.delete('block');
              setSearchParams(nextParams);
            }
          }} 
          size="lg" 
          centered
        >
          <Modal.Header closeButton className="bg-bunny-creamy/30 border-b border-bunny-accent/40">
            <Modal.Title>
              <div className="flex items-center gap-2 text-bunny-dark text-base sm:text-lg font-bold">
                <FiCalendar /> Gestión de Bloqueos de Agenda y Días No Laborables
              </div>
            </Modal.Title>
          </Modal.Header>
          <Modal.Body className="p-3 bg-white">
            <ScheduleUnavailabilitySection
              unavailabilities={unavailabilities}
              colors={unavailabilityColors}
              notifications={unavailabilityNotifications}
              onUnavailabilitiesChange={handleUnavailabilitiesChange}
              onColorsChange={handleColorsChange}
              onNotificationsChange={handleNotificationsChange}
            />
          </Modal.Body>
        </Modal>

        {/* Modal de Historial de Mensajes / Entregas */}
        <AppointmentNotificationsModal
          show={selectedNotificationsApt !== null}
          appointmentId={selectedNotificationsApt?.id ?? null}
          customerName={selectedNotificationsApt?.customer?.fullName}
          customerPhone={selectedNotificationsApt?.customer?.phone}
          onClose={() => setSelectedNotificationsApt(null)}
        />
      </div>
    </DashboardLayout>
  );
}
