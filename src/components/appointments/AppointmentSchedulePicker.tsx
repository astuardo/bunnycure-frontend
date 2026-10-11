import React, { useState, useMemo, useRef } from 'react';
import { Form, Row, Col, Button, Badge, Alert, InputGroup } from 'react-bootstrap';
import {
  format,
  isValid,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  startOfWeek,
  endOfWeek,
  isSameMonth,
  isToday,
  addMonths,
  subMonths,
} from 'date-fns';
import { es } from 'date-fns/locale';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import { FiCalendar, FiClock, FiAlertTriangle, FiCheckCircle, FiUser } from 'react-icons/fi';
import {
  ScheduleUnavailability,
  UnavailabilityColorConfig,
  DEFAULT_UNAVAILABILITY_COLORS,
} from '../../types/unavailability.types';
import { Appointment } from '../../types/appointment.types';
import {
  isDateBlockedFullDay,
  getTimeSlotBlocksForDate,
  checkTimeSlotConflict,
  timeToMinutes,
  minutesToTime,
} from '../../utils/unavailabilityUtils';

interface AppointmentSchedulePickerProps {
  selectedDate: string; // YYYY-MM-DD
  selectedTime: string; // HH:mm
  durationMinutes?: number;
  onDateChange: (date: string) => void;
  onTimeChange: (time: string) => void;
  unavailabilities: ScheduleUnavailability[];
  unavailabilityColors?: UnavailabilityColorConfig;
  appointments?: Appointment[];
  required?: boolean;
  minDate?: string;
  allowPastDates?: boolean;
}

const COMMON_SLOTS = [
  '09:00',
  '10:00',
  '11:00',
  '12:00',
  '13:00',
  '14:00',
  '15:00',
  '16:00',
  '17:00',
  '18:00',
  '19:00',
  '20:00',
  '21:00',
];

const WEEK_DAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

export const AppointmentSchedulePicker: React.FC<AppointmentSchedulePickerProps> = ({
  selectedDate,
  selectedTime,
  durationMinutes = 60,
  onDateChange,
  onTimeChange,
  unavailabilities = [],
  unavailabilityColors = DEFAULT_UNAVAILABILITY_COLORS,
  appointments = [],
  required = true,
  minDate,
  allowPastDates = false,
}) => {
  const [showVisualCalendar, setShowVisualCalendar] = useState(true);
  const todayStr = useMemo(() => format(new Date(), 'yyyy-MM-dd'), []);
  const effectiveMinDate = minDate || (allowPastDates ? undefined : todayStr);

  // Parse current viewing month based on selected date or today
  const initialMonth = useMemo(() => {
    if (selectedDate && selectedDate.length >= 10) {
      const parsed = new Date(`${selectedDate.slice(0, 10)}T00:00:00`);
      if (isValid(parsed)) return parsed;
    }
    return new Date();
  }, [selectedDate]);

  const [currentMonth, setCurrentMonth] = useState<Date>(initialMonth);

  // Selected date status checks
  const fullDayBlock = useMemo(() => {
    if (!selectedDate) return { blocked: false };
    return isDateBlockedFullDay(selectedDate, unavailabilities);
  }, [selectedDate, unavailabilities]);

  const slotBlocks = useMemo(() => {
    if (!selectedDate) return [];
    return getTimeSlotBlocksForDate(selectedDate, unavailabilities);
  }, [selectedDate, unavailabilities]);

  // Appointments on selected date (incluyendo confirmadas, pendientes y completadas)
  const dayAppointments = useMemo(() => {
    if (!selectedDate) return [];
    return appointments.filter((apt) => {
      const aptDate = apt.appointmentDate ? apt.appointmentDate.slice(0, 10) : '';
      return (
        aptDate === selectedDate &&
        apt.status !== 'CANCELLED'
      );
    }).sort((a, b) => (a.appointmentTime || '').localeCompare(b.appointmentTime || ''));
  }, [selectedDate, appointments]);

  // Funciones de ayuda para citas del día
  const getAptDuration = (apt: Appointment): number => {
    if (apt.totalDurationMinutes && apt.totalDurationMinutes > 0) {
      return apt.totalDurationMinutes;
    }
    if (apt.services && apt.services.length > 0) {
      return apt.services.reduce((acc, s) => acc + (s.durationMinutes || 60), 0);
    }
    return apt.service?.durationMinutes || 60;
  };

  const getAptEndTime = (apt: Appointment): string => {
    if (!apt.appointmentTime) return '';
    const startMin = timeToMinutes(apt.appointmentTime);
    const dur = getAptDuration(apt);
    return minutesToTime(startMin + dur);
  };

  const getAptServicesText = (apt: Appointment): string => {
    if (apt.services && apt.services.length > 0) {
      return apt.services.map((s) => s.name).join(' + ');
    }
    return apt.service?.name || 'Servicio';
  };

  const isAptCollidingWithSelected = (apt: Appointment): boolean => {
    if (!selectedDate || !selectedTime || !apt.appointmentTime) return false;
    const startMin = timeToMinutes(selectedTime);
    const endMin = startMin + Math.max(1, durationMinutes);
    const aptStart = timeToMinutes(apt.appointmentTime);
    const aptEnd = aptStart + getAptDuration(apt);
    return Math.max(startMin, aptStart) < Math.min(endMin, aptEnd);
  };

  // Time conflict detection with schedule unavailabilities
  const timeConflict = useMemo(() => {
    if (!selectedDate || !selectedTime) return { hasConflict: false };
    return checkTimeSlotConflict(selectedDate, selectedTime, durationMinutes, unavailabilities);
  }, [selectedDate, selectedTime, durationMinutes, unavailabilities]);

  // Conflict with existing appointment
  const existingAptConflict = useMemo(() => {
    if (!selectedDate || !selectedTime) return null;
    return dayAppointments.find((apt) => isAptCollidingWithSelected(apt));
  }, [selectedDate, selectedTime, durationMinutes, dayAppointments]);

  // Estimated end time
  const calculatedEndTime = useMemo(() => {
    if (!selectedTime) return '';
    const startMin = timeToMinutes(selectedTime);
    return minutesToTime(startMin + Math.max(1, durationMinutes));
  }, [selectedTime, durationMinutes]);

  // Calendar cells generation
  const calendarCells = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

    const days = eachDayOfInterval({ start: calStart, end: calEnd });

    return days.map((day) => {
      const dayStr = format(day, 'yyyy-MM-dd');
      const isSelected = selectedDate === dayStr;
      const isCurrentMonth = isSameMonth(day, currentMonth);
      const isPast = effectiveMinDate ? dayStr < effectiveMinDate : (!allowPastDates && dayStr < todayStr);
      const fDayBlock = isDateBlockedFullDay(dayStr, unavailabilities);
      const tSlotBlocks = getTimeSlotBlocksForDate(dayStr, unavailabilities);

      const aptsCount = appointments.filter((apt) => {
        const aptDate = apt.appointmentDate ? apt.appointmentDate.slice(0, 10) : '';
        return aptDate === dayStr && apt.status !== 'CANCELLED';
      }).length;

      return {
        date: day,
        dateStr: dayStr,
        dayNumber: format(day, 'd'),
        isToday: isToday(day),
        isSelected,
        isPast,
        isOutsideMonth: !isCurrentMonth,
        isFullDayBlocked: fDayBlock.blocked,
        fullDayReason: fDayBlock.reason,
        isTimeSlotBlocked: tSlotBlocks.length > 0,
        timeSlotCount: tSlotBlocks.length,
        timeSlotBlocks: tSlotBlocks,
        appointmentCount: aptsCount,
      };
    });
  }, [currentMonth, selectedDate, unavailabilities, appointments, allowPastDates, todayStr, effectiveMinDate]);

  const calendarRef = useRef<HTMLDivElement>(null);

  // Formato legible en español para el campo de texto de fecha
  const formattedDateDisplay = useMemo(() => {
    if (!selectedDate) return '';
    try {
      const d = new Date(`${selectedDate.slice(0, 10)}T12:00:00`);
      if (!isValid(d)) return selectedDate;
      const formatted = format(d, "EEEE dd 'de' MMMM, yyyy", { locale: es });
      return formatted.charAt(0).toUpperCase() + formatted.slice(1);
    } catch {
      return selectedDate;
    }
  }, [selectedDate]);

  const handleDateFieldClick = () => {
    setShowVisualCalendar(true);
  };

  const handleAdjustTimeMinutes = (delta: number) => {
    const base = selectedTime || '10:00';
    const cur = timeToMinutes(base);
    const updated = Math.max(0, Math.min(23 * 60 + 55, cur + delta));
    onTimeChange(minutesToTime(updated));
  };

  const handleCellClick = (dateStr: string) => {
    if (effectiveMinDate && dateStr < effectiveMinDate) {
      return;
    }
    onDateChange(dateStr);
  };

  return (
    <div className="appointment-schedule-picker mb-3">
      {/* ─── FILA DE INPUTS DIRECTOS (Fecha y Hora) ─── */}
      <Row className="g-2 mb-2 align-items-end">
        <Col xs={12} sm={6}>
          <Form.Group>
            <div className="d-flex justify-content-between align-items-center mb-1">
              <Form.Label className="fw-semibold small mb-0">
                <FiCalendar className="me-1 text-primary" /> Fecha *
              </Form.Label>
              <button
                type="button"
                className="btn btn-link p-0 text-decoration-none small text-primary fw-semibold"
                style={{ fontSize: '11.5px' }}
                onClick={() => setShowVisualCalendar(!showVisualCalendar)}
              >
                {showVisualCalendar ? '▼ Ocultar calendario' : '▶ Ver calendario'}
              </button>
            </div>
            {/* Contenedor interactivo no-input: nunca activa zoom en iOS/Android */}
            <div
              role="button"
              tabIndex={0}
              onClick={handleDateFieldClick}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  handleDateFieldClick();
                }
              }}
              className={`form-control d-flex align-items-center justify-content-between ${
                fullDayBlock.blocked || (selectedDate && !allowPastDates && selectedDate < todayStr) ? 'is-invalid' : ''
              }`}
              style={{
                borderRadius: '8px',
                cursor: 'pointer',
                minHeight: '38px',
                backgroundColor: fullDayBlock.blocked || (selectedDate && !allowPastDates && selectedDate < todayStr)
                  ? '#fff5f5'
                  : selectedDate
                  ? '#fdf8f6'
                  : '#ffffff',
                borderColor: fullDayBlock.blocked || (selectedDate && !allowPastDates && selectedDate < todayStr)
                  ? '#dc3545'
                  : selectedDate
                  ? '#8c2a3e'
                  : '#ced4da',
                userSelect: 'none',
                WebkitTapHighlightColor: 'transparent',
              }}
              title="Toca para ver el calendario y seleccionar fecha"
            >
              <span
                style={{
                  fontSize: '13.5px',
                  fontWeight: selectedDate ? 600 : 400,
                  color: selectedDate ? '#2d1a12' : '#6c757d',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {formattedDateDisplay || 'Toca un día en el calendario interactivo...'}
              </span>
              {selectedDate ? (
                <span
                  className="badge ms-2"
                  style={{
                    fontSize: '10.5px',
                    backgroundColor: '#8c2a3e',
                    color: '#fff',
                    borderRadius: '6px',
                    flexShrink: 0,
                  }}
                >
                  📅 {selectedDate}
                </span>
              ) : (
                <span className="text-muted ms-2" style={{ fontSize: '13px', flexShrink: 0 }}>
                  📅
                </span>
              )}
            </div>
            <input type="hidden" name="appointmentDate" value={selectedDate} />
          </Form.Group>
        </Col>

        <Col xs={12} sm={6}>
          <Form.Group>
            <div className="d-flex justify-content-between align-items-center mb-1">
              <Form.Label className="fw-semibold small mb-0">
                <FiClock className="me-1 text-primary" /> Hora *
              </Form.Label>
              {calculatedEndTime && (
                <small className="text-muted" style={{ fontSize: '11px' }}>
                  Termina: <strong>{calculatedEndTime} hrs</strong> ({durationMinutes} min)
                </small>
              )}
            </div>
            <InputGroup>
              <Form.Control
                type="time"
                required={required}
                value={selectedTime}
                onChange={(e) => onTimeChange(e.target.value)}
                className={timeConflict.hasConflict ? 'is-invalid' : ''}
                style={{
                  borderRadius: '8px 0 0 8px',
                  borderColor: timeConflict.hasConflict ? '#dc3545' : '#ced4da',
                  backgroundColor: timeConflict.hasConflict ? '#fff5f5' : '#fff',
                  fontWeight: selectedTime ? 600 : 400,
                  fontSize: '16px', // 16px previene el zoom automático de iOS Safari
                }}
              />
              <Button
                variant="outline-secondary"
                size="sm"
                onClick={() => handleAdjustTimeMinutes(-15)}
                title="Atrasar 15 minutos"
                style={{ fontSize: '11px', borderColor: '#ced4da', fontWeight: 600 }}
              >
                -15m
              </Button>
              <Button
                variant="outline-secondary"
                size="sm"
                onClick={() => handleAdjustTimeMinutes(15)}
                title="Adelantar 15 minutos"
                style={{ fontSize: '11px', borderColor: '#ced4da', fontWeight: 600 }}
              >
                +15m
              </Button>
            </InputGroup>
          </Form.Group>
        </Col>
      </Row>

      {/* ─── CALENDARIO VISUAL INTERACTIVO ─── */}
      {showVisualCalendar && (
        <div
          ref={calendarRef}
          className="p-3 rounded border mb-3 shadow-sm"
          style={{
            background: '#fffdfc',
            borderColor: '#eed0c5',
            borderRadius: '14px',
          }}
        >
          {/* Navegación del mes */}
          <div className="d-flex justify-content-between align-items-center mb-2">
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary py-1 px-2"
              onClick={() => setCurrentMonth((prev) => subMonths(prev, 1))}
              aria-label="Mes anterior"
              style={{ borderRadius: '6px' }}
            >
              <FaChevronLeft size={11} />
            </button>

            <span className="fw-bold small text-capitalize text-dark" style={{ letterSpacing: '0.2px' }}>
              {format(currentMonth, 'MMMM yyyy', { locale: es })}
            </span>

            <div className="d-flex gap-1">
              <Button
                variant="outline-primary"
                size="sm"
                className="py-0 px-2 small"
                style={{ fontSize: '11px', borderRadius: '6px' }}
                onClick={() => {
                  const today = new Date();
                  setCurrentMonth(today);
                  onDateChange(format(today, 'yyyy-MM-dd'));
                }}
              >
                Hoy
              </Button>
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary py-1 px-2"
                onClick={() => setCurrentMonth((prev) => addMonths(prev, 1))}
                aria-label="Mes siguiente"
                style={{ borderRadius: '6px' }}
              >
                <FaChevronRight size={11} />
              </button>
            </div>
          </div>

          {/* Días de la semana */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, 1fr)',
              gap: '4px',
              textAlign: 'center',
              marginBottom: '4px',
            }}
          >
            {WEEK_DAYS.map((d) => (
              <div
                key={d}
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  color: '#9e7b6e',
                  padding: '2px 0',
                }}
              >
                {d}
              </div>
            ))}
          </div>

          {/* Celdas del mes */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, 1fr)',
              gap: '4px',
            }}
          >
            {calendarCells.map((cell) => {
              let cellBg = '#ffffff';
              let cellBorder = '#eef0f2';
              let textColor = '#212529';

              if (cell.isPast) {
                cellBg = '#f8f9fa';
                cellBorder = '#e5e7eb';
                textColor = '#9ca3af';
              } else if (cell.isFullDayBlocked) {
                cellBg = unavailabilityColors.fullDayColor || '#fee2e2';
                cellBorder = '#f87171';
                textColor = '#991b1b';
              } else if (cell.isTimeSlotBlocked) {
                cellBg = unavailabilityColors.timeSlotColor || '#fef3c7';
                cellBorder = '#f59e0b';
                textColor = '#92400e';
              }

              if (cell.isSelected) {
                cellBorder = '#8c2a3e';
                cellBg = cell.isFullDayBlocked ? '#fecaca' : '#fdf0ec';
              }

              const tooltipParts: string[] = [];
              if (cell.isPast) tooltipParts.push('Fecha pasada (No disponible para agendar)');
              if (cell.isFullDayBlocked) tooltipParts.push(`Cerrado: ${cell.fullDayReason}`);
              if (cell.isTimeSlotBlocked) {
                tooltipParts.push(
                  cell.timeSlotBlocks
                    .map((b) => `${b.startTime}-${b.endTime}: ${b.reason}`)
                    .join(' | ')
                );
              }
              if (cell.appointmentCount > 0) tooltipParts.push(`${cell.appointmentCount} cita(s) agendadas`);

              return (
                <div
                  key={cell.dateStr}
                  onClick={() => handleCellClick(cell.dateStr)}
                  title={tooltipParts.join(' · ') || undefined}
                  style={{
                    minHeight: '48px',
                    padding: '4px 3px',
                    borderRadius: '8px',
                    border: `1.5px solid ${cellBorder}`,
                    background: cellBg,
                    opacity: cell.isPast ? 0.4 : cell.isOutsideMonth ? 0.35 : 1,
                    cursor: cell.isPast ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    boxShadow: cell.isSelected ? '0 0 0 2px #8c2a3e' : 'none',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div className="d-flex justify-content-between align-items-center">
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: cell.isSelected || cell.isToday ? 800 : 600,
                        color: cell.isPast ? '#9ca3af' : cell.isSelected ? '#8c2a3e' : textColor,
                        textDecoration: cell.isPast ? 'line-through' : 'none',
                      }}
                    >
                      {cell.dayNumber}
                    </span>
                    {cell.isToday && (
                      <span
                        style={{
                          width: '4px',
                          height: '4px',
                          borderRadius: '50%',
                          background: '#8c2a3e',
                        }}
                      />
                    )}
                  </div>

                  {/* Indicadores en la celda */}
                  <div>
                    {cell.isPast && (
                      <div
                        style={{
                          fontSize: '8px',
                          color: '#9ca3af',
                          fontWeight: 700,
                          lineHeight: 1,
                        }}
                      >
                        Pasado
                      </div>
                    )}
                    {!cell.isPast && cell.isFullDayBlocked && (
                      <div
                        style={{
                          fontSize: '8.5px',
                          color: '#991b1b',
                          fontWeight: 800,
                          lineHeight: 1,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        🚫 Cerrado
                      </div>
                    )}
                    {!cell.isPast && !cell.isFullDayBlocked && cell.isTimeSlotBlocked && (
                      <div
                        style={{
                          fontSize: '8px',
                          color: '#92400e',
                          fontWeight: 700,
                          lineHeight: 1,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        ⏰ Bloqueo
                      </div>
                    )}
                    {cell.appointmentCount > 0 && (
                      <div
                        style={{
                          fontSize: '8px',
                          color: '#0d6efd',
                          fontWeight: 600,
                          lineHeight: 1,
                          marginTop: '1px',
                        }}
                      >
                        • {cell.appointmentCount} {cell.appointmentCount === 1 ? 'cita' : 'citas'}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Leyenda del calendario */}
          <div className="d-flex flex-wrap gap-2 mt-2 pt-2 border-top" style={{ fontSize: '10.5px' }}>
            <span className="d-flex align-items-center gap-1 text-danger fw-semibold">
              <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: '#f87171', display: 'inline-block' }} />
              Día Cerrado
            </span>
            <span className="d-flex align-items-center gap-1 text-warning-emphasis fw-semibold">
              <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: '#f59e0b', display: 'inline-block' }} />
              Horario Bloqueado
            </span>
            <span className="d-flex align-items-center gap-1 text-primary fw-semibold">
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#0d6efd', display: 'inline-block' }} />
              Citas Agendadas
            </span>
            <span className="d-flex align-items-center gap-1 text-muted">
              <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: '#d1d5db', display: 'inline-block' }} />
              Fechas Pasadas (Inactivas)
            </span>
            <span className="d-flex align-items-center gap-1 text-muted ms-auto">
              Click en cualquier día futuro para seleccionarlo
            </span>
          </div>
        </div>
      )}

      {/* ─── ALERTAS Y AVISOS DE DISPONIBILIDAD PARA EL DÍA SELECCIONADO ─── */}
      {selectedDate && (
        <>
          {/* CASO 0: FECHA EN EL PASADO */}
          {!allowPastDates && selectedDate < todayStr && (
            <Alert
              variant="danger"
              className="py-2 px-3 mb-2 shadow-sm d-flex align-items-start gap-2"
              style={{ borderRadius: '10px' }}
            >
              <FiAlertTriangle className="text-danger fs-5 flex-shrink-0 mt-1" />
              <div style={{ fontSize: '13px' }}>
                <strong className="d-block text-danger">FECHA EN EL PASADO</strong>
                <span>
                  No está permitido agendar citas en fechas anteriores a hoy ({todayStr}).
                  Por favor selecciona hoy o una fecha posterior.
                </span>
              </div>
            </Alert>
          )}

          {/* CASO 1: DÍA COMPLETO CERRADO / BLOQUEADO */}
          {fullDayBlock.blocked && (
            <Alert
              variant="danger"
              className="py-2 px-3 mb-2 shadow-sm d-flex align-items-start gap-2"
              style={{ borderRadius: '10px' }}
            >
              <span className="fs-5 lh-1">🚫</span>
              <div style={{ fontSize: '13px' }}>
                <strong className="d-block text-danger">
                  DÍA CERRADO / BLOQUEADO: {fullDayBlock.reason || 'Sin motivo especificado'}
                </strong>
                <span>
                  Este día completo ({selectedDate}) está configurado como bloqueado o no laborable en la agenda.
                </span>
                <div className="small fw-semibold mt-1 text-danger">
                  ⚠️ No se recomienda agendar citas en esta fecha.
                </div>
              </div>
            </Alert>
          )}

          {/* CASO 2: HORARIOS PARCIALES BLOQUEADOS EN LA FECHA */}
          {!fullDayBlock.blocked && slotBlocks.length > 0 && (
            <Alert
              variant="warning"
              className="py-2 px-3 mb-2 shadow-sm"
              style={{ borderRadius: '10px', background: '#fffbeb', borderColor: '#fde68a' }}
            >
              <div className="d-flex align-items-center gap-2 mb-1" style={{ fontSize: '13px', color: '#92400e' }}>
                <span className="fs-6">⏰</span>
                <strong>Horarios bloqueados registrados para este día:</strong>
              </div>
              <div className="d-flex flex-wrap gap-2 ps-4">
                {slotBlocks.map((b) => (
                  <Badge
                    key={b.id}
                    bg="warning"
                    text="dark"
                    className="py-1 px-2 fw-semibold border border-warning"
                    style={{ fontSize: '11px' }}
                  >
                    🚫 {b.startTime} a {b.endTime} hrs: {b.reason || 'Horario bloqueado'}
                  </Badge>
                ))}
              </div>
            </Alert>
          )}

          {/* CASO 2.5: CITAS YA AGENDADAS PARA ESTE DÍA */}
          {dayAppointments.length > 0 ? (
            <div
              className="p-3 mb-2 rounded-3 border shadow-sm"
              style={{
                background: '#f8fafc',
                borderColor: '#cbd5e1',
              }}
            >
              <div className="d-flex justify-content-between align-items-center mb-2 flex-wrap gap-2">
                <div className="d-flex align-items-center gap-2">
                  <span style={{ fontSize: '1.2rem' }}>📋</span>
                  <div>
                    <strong className="text-dark" style={{ fontSize: '13px' }}>
                      Citas agendadas para este día ({dayAppointments.length})
                    </strong>
                    <div className="text-muted" style={{ fontSize: '11px' }}>
                      Revisa los horarios ocupados para organizar la nueva cita
                    </div>
                  </div>
                </div>
                <Badge
                  bg="primary"
                  className="px-2 py-1 fw-semibold"
                  style={{ fontSize: '11px', borderRadius: '6px' }}
                >
                  {dayAppointments.length} {dayAppointments.length === 1 ? 'cita agendada' : 'citas agendadas'}
                </Badge>
              </div>

              {/* Lista cronológica de citas del día */}
              <div
                className="d-flex flex-column gap-2"
                style={{ maxHeight: '210px', overflowY: 'auto', paddingRight: '2px' }}
              >
                {dayAppointments.map((apt) => {
                  const aptEndTime = getAptEndTime(apt);
                  const dur = getAptDuration(apt);
                  const servicesText = getAptServicesText(apt);
                  const isColliding = isAptCollidingWithSelected(apt);

                  return (
                    <div
                      key={apt.id}
                      className="p-2 rounded-2 border d-flex justify-content-between align-items-center flex-wrap gap-2"
                      style={{
                        background: isColliding ? '#fff1f2' : '#ffffff',
                        borderColor: isColliding ? '#f87171' : '#e2e8f0',
                        borderWidth: isColliding ? '1.5px' : '1px',
                        boxShadow: isColliding ? '0 0 0 2px rgba(239, 68, 68, 0.2)' : 'none',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <div className="d-flex align-items-center gap-2">
                        <div
                          style={{
                            padding: '4px 8px',
                            borderRadius: '6px',
                            background: isColliding ? '#fee2e2' : '#eff6ff',
                            color: isColliding ? '#991b1b' : '#1e40af',
                            fontWeight: 700,
                            fontSize: '11.5px',
                            minWidth: '105px',
                            textAlign: 'center',
                          }}
                        >
                          <FiClock size={11} className="me-1" />
                          {apt.appointmentTime} - {aptEndTime}
                        </div>

                        <div>
                          <div className="fw-semibold text-dark d-flex align-items-center gap-1" style={{ fontSize: '12px' }}>
                            <FiUser size={12} className="text-muted" />
                            <span>{apt.customer?.fullName || 'Clienta'}</span>
                            {apt.customer?.phone && (
                              <small className="text-muted fw-normal">
                                ({apt.customer.phone})
                              </small>
                            )}
                          </div>
                          <div className="text-muted d-flex align-items-center gap-1" style={{ fontSize: '11px' }}>
                            <span>💅 {servicesText}</span>
                            <span className="text-secondary fw-semibold">({dur} min)</span>
                          </div>
                        </div>
                      </div>

                      <div className="d-flex align-items-center gap-1">
                        {isColliding && (
                          <Badge bg="danger" className="py-1 px-2" style={{ fontSize: '10.5px' }}>
                            ⚠️ Choca con tu hora
                          </Badge>
                        )}
                        <Badge
                          bg={
                            apt.status === 'CONFIRMED'
                              ? 'success'
                              : apt.status === 'COMPLETED'
                              ? 'info'
                              : apt.status === 'PENDING'
                              ? 'warning'
                              : 'secondary'
                          }
                          text={apt.status === 'PENDING' ? 'dark' : 'white'}
                          className="py-1 px-2 fw-semibold"
                          style={{ fontSize: '10.5px', borderRadius: '4px' }}
                        >
                          {apt.status === 'CONFIRMED'
                            ? 'Confirmada'
                            : apt.status === 'COMPLETED'
                            ? 'Completada'
                            : apt.status === 'PENDING'
                            ? 'Pendiente'
                            : apt.status}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            !fullDayBlock.blocked &&
            (!selectedDate || selectedDate >= todayStr || allowPastDates) && (
              <div
                className="py-2 px-3 mb-2 rounded-3 d-flex align-items-center gap-2 border"
                style={{
                  background: '#f0fdf4',
                  borderColor: '#bbf7d0',
                  color: '#166534',
                  fontSize: '12px',
                }}
              >
                <FiCheckCircle className="text-success fs-6 flex-shrink-0" />
                <div>
                  <strong>Agenda despejada:</strong> No hay otras citas agendadas registradas para esta fecha.
                </div>
              </div>
            )
          )}

          {/* CASO 3: CONFLICTO ESPECÍFICO DE LA HORA SELECCIONADA CON BLOQUEO */}
          {timeConflict.hasConflict && (
            <Alert
              variant="danger"
              className="py-2 px-3 mb-2 shadow-sm d-flex align-items-start gap-2"
              style={{ borderRadius: '10px', background: '#fee2e2', borderColor: '#f87171' }}
            >
              <FiAlertTriangle className="text-danger fs-5 flex-shrink-0 mt-1" />
              <div style={{ fontSize: '13px' }}>
                <strong className="d-block text-danger">
                  CONFLICTO CON HORARIO BLOQUEADO
                </strong>
                <span>
                  La cita seleccionada (<strong>{selectedTime} a {calculatedEndTime}</strong> hrs)
                  se superpone con el bloqueo registrado:{' '}
                  <strong>"{timeConflict.reason}"</strong> ({timeConflict.conflictSlot}).
                </span>
                <div className="small fw-bold text-danger mt-1">
                  Por favor selecciona otro horario para no invadir el bloqueo de agenda.
                </div>
              </div>
            </Alert>
          )}

          {/* CASO 4: ADVERTENCIA DE SUPERPOSICIÓN CON CITA EXISTENTE */}
          {!timeConflict.hasConflict && existingAptConflict && (
            <Alert
              variant="warning"
              className="py-2 px-3 mb-2 shadow-sm d-flex align-items-start gap-2"
              style={{ borderRadius: '10px' }}
            >
              <FiAlertTriangle className="text-warning-emphasis fs-5 flex-shrink-0 mt-1" />
              <div style={{ fontSize: '12.5px' }}>
                <strong className="text-dark">Aviso de superposición con otra cita:</strong>
                <div>
                  La hora seleccionada se superpone con la cita de{' '}
                  <strong>{existingAptConflict.customer?.fullName || 'Clienta'}</strong>{' '}
                  ({existingAptConflict.appointmentTime} a {getAptEndTime(existingAptConflict)} hrs).
                </div>
              </div>
            </Alert>
          )}

          {/* CASO 5: DÍA Y HORA TOTALMENTE LIBRES */}
          {!fullDayBlock.blocked && !timeConflict.hasConflict && !existingAptConflict && selectedTime && (
            <div
              className="py-1 px-2 mb-2 rounded d-flex align-items-center gap-2 small text-success bg-success-subtle border border-success-subtle"
              style={{ fontSize: '12px' }}
            >
              <FiCheckCircle />
              <span>Horario disponible: {selectedTime} a {calculatedEndTime} hrs sin conflictos.</span>
            </div>
          )}

          {/* ─── SUGERENCIAS RÁPIDAS DE HORAS (SLOTS HABITUALES) ─── */}
          {!fullDayBlock.blocked && !(selectedDate && !allowPastDates && selectedDate < todayStr) && (
            <div className="mb-2">
              <div className="d-flex justify-content-between align-items-center mb-1">
                <small className="text-muted fw-semibold" style={{ fontSize: '11px' }}>
                  Atajos de horarios comunes:
                </small>
                <small className="text-muted" style={{ fontSize: '10.5px' }}>
                  👤 = Ocupado por otra cita · 🚫 = Bloqueado
                </small>
              </div>
              <div className="d-flex flex-wrap gap-1">
                {COMMON_SLOTS.map((slot) => {
                  const check = checkTimeSlotConflict(selectedDate, slot, durationMinutes, unavailabilities);
                  const isBlocked = check.hasConflict;

                  // Verificar si el slot choca con una cita agendada
                  const conflictingApt = dayAppointments.find((apt) => {
                    if (!apt.appointmentTime) return false;
                    const aptStart = timeToMinutes(apt.appointmentTime);
                    const aptDur = getAptDuration(apt);
                    const aptEnd = aptStart + aptDur;
                    const slotStart = timeToMinutes(slot);
                    const slotEnd = slotStart + durationMinutes;
                    return Math.max(slotStart, aptStart) < Math.min(slotEnd, aptEnd);
                  });
                  const isAptOccupied = !!conflictingApt;
                  const isCurrent = selectedTime === slot;

                  return (
                    <button
                      key={slot}
                      type="button"
                      disabled={isBlocked}
                      onClick={() => onTimeChange(slot)}
                      className={`btn btn-sm py-1 px-2 ${
                        isCurrent
                          ? isAptOccupied
                            ? 'btn-danger'
                            : 'btn-primary'
                          : isBlocked
                          ? 'btn-outline-danger disabled text-decoration-line-through'
                          : isAptOccupied
                          ? 'btn-outline-warning text-dark'
                          : 'btn-outline-secondary'
                      }`}
                      style={{
                        fontSize: '11px',
                        borderRadius: '6px',
                        opacity: isBlocked ? 0.6 : 1,
                        borderStyle: isAptOccupied && !isCurrent ? 'dashed' : 'solid',
                        fontWeight: isCurrent || isAptOccupied ? 600 : 400,
                      }}
                      title={
                        isBlocked
                          ? `Bloqueado por agenda: ${check.reason}`
                          : isAptOccupied
                          ? `Ocupado por cita de ${conflictingApt.customer?.fullName || 'Clienta'} (${conflictingApt.appointmentTime} a ${getAptEndTime(conflictingApt)})`
                          : `Seleccionar ${slot} (Disponible)`
                      }
                    >
                      {slot} {isBlocked ? '🚫' : isAptOccupied ? '👤' : ''}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
