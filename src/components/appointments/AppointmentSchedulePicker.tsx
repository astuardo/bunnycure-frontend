import React, { useState, useMemo, useRef } from 'react';
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
import { Badge, Alert } from '@/components/ui';

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
  collapseOnDateSelect?: boolean;
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

const WEEK_DAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

export const AppointmentSchedulePicker: React.FC<AppointmentSchedulePickerProps> = ({
  selectedDate,
  selectedTime,
  durationMinutes = 60,
  onDateChange,
  onTimeChange,
  unavailabilities,
  unavailabilityColors = DEFAULT_UNAVAILABILITY_COLORS,
  appointments = [],
  required = true,
  minDate,
  allowPastDates = false,
  collapseOnDateSelect = true,
}) => {
  const calendarRef = useRef<HTMLDivElement>(null);
  const todayStr = useMemo(() => format(new Date(), 'yyyy-MM-dd'), []);
  const effectiveMinDate = allowPastDates ? undefined : (minDate || todayStr);

  const [currentMonth, setCurrentMonth] = useState<Date>(() => {
    if (selectedDate && isValid(new Date(`${selectedDate}T00:00:00`))) {
      return new Date(`${selectedDate}T00:00:00`);
    }
    return new Date();
  });

  const [showVisualCalendar, setShowVisualCalendar] = useState<boolean>(true);

  const formattedDateDisplay = useMemo(() => {
    if (!selectedDate) return '';
    try {
      const parsed = new Date(`${selectedDate}T00:00:00`);
      if (!isValid(parsed)) return selectedDate;
      return format(parsed, "EEEE d 'de' MMMM 'de' yyyy", { locale: es });
    } catch {
      return selectedDate;
    }
  }, [selectedDate]);

  const calculatedEndTime = useMemo(() => {
    if (!selectedTime) return '';
    const startMin = timeToMinutes(selectedTime);
    const endMin = startMin + durationMinutes;
    return minutesToTime(endMin);
  }, [selectedTime, durationMinutes]);

  const fullDayBlock = useMemo(() => {
    if (!selectedDate) return { blocked: false };
    return isDateBlockedFullDay(selectedDate, unavailabilities);
  }, [selectedDate, unavailabilities]);

  const slotBlocks = useMemo(() => {
    if (!selectedDate) return [];
    return getTimeSlotBlocksForDate(selectedDate, unavailabilities);
  }, [selectedDate, unavailabilities]);

  const timeConflict = useMemo(() => {
    if (!selectedDate || !selectedTime) return { hasConflict: false };
    return checkTimeSlotConflict(selectedDate, selectedTime, durationMinutes, unavailabilities);
  }, [selectedDate, selectedTime, durationMinutes, unavailabilities]);

  const dayAppointments = useMemo(() => {
    if (!selectedDate) return [];
    return appointments
      .filter((apt) => {
        if (!apt.appointmentDate) return false;
        const aptDateStr = typeof apt.appointmentDate === 'string'
          ? apt.appointmentDate.slice(0, 10)
          : format(new Date(apt.appointmentDate), 'yyyy-MM-dd');
        return aptDateStr === selectedDate && apt.status !== 'CANCELLED';
      })
      .sort((a, b) => (a.appointmentTime || '').localeCompare(b.appointmentTime || ''));
  }, [selectedDate, appointments]);

  const getAptDuration = (apt: Appointment): number => {
    if (apt.service?.durationMinutes) return apt.service.durationMinutes;
    if (apt.services && apt.services.length > 0) {
      return apt.services.reduce((acc, s) => acc + (s.durationMinutes || 0), 0) || 60;
    }
    return 60;
  };

  const getAptEndTime = (apt: Appointment): string => {
    if (!apt.appointmentTime) return '';
    const dur = getAptDuration(apt);
    return minutesToTime(timeToMinutes(apt.appointmentTime) + dur);
  };

  const getAptServicesText = (apt: Appointment): string => {
    if (apt.services && apt.services.length > 0) {
      return apt.services.map((s) => s.name).join(' + ');
    }
    return apt.service?.name || 'Servicio';
  };

  const isAptCollidingWithSelected = (apt: Appointment): boolean => {
    if (!selectedTime || !apt.appointmentTime) return false;
    const myStart = timeToMinutes(selectedTime);
    const myEnd = myStart + durationMinutes;
    const aptStart = timeToMinutes(apt.appointmentTime);
    const aptEnd = aptStart + getAptDuration(apt);
    return Math.max(myStart, aptStart) < Math.min(myEnd, aptEnd);
  };

  const existingAptConflict = useMemo(() => {
    if (!selectedDate || !selectedTime || dayAppointments.length === 0) return null;
    return dayAppointments.find((apt) => isAptCollidingWithSelected(apt)) || null;
  }, [selectedDate, selectedTime, dayAppointments, durationMinutes]);

  const appointmentsCountByDate = useMemo(() => {
    const map = new Map<string, number>();
    for (const apt of appointments) {
      if (!apt.appointmentDate || apt.status === 'CANCELLED') continue;
      const dStr = typeof apt.appointmentDate === 'string'
        ? apt.appointmentDate.slice(0, 10)
        : format(new Date(apt.appointmentDate), 'yyyy-MM-dd');
      map.set(dStr, (map.get(dStr) || 0) + 1);
    }
    return map;
  }, [appointments]);

  const calendarCells = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });
    const allDays = eachDayOfInterval({ start: startDate, end: endDate });

    return allDays.map((d) => {
      const dateStr = format(d, 'yyyy-MM-dd');
      const isPast = effectiveMinDate ? dateStr < effectiveMinDate : false;
      const fullDay = isDateBlockedFullDay(dateStr, unavailabilities);
      const slots = getTimeSlotBlocksForDate(dateStr, unavailabilities);
      const aptCount = appointmentsCountByDate.get(dateStr) || 0;

      return {
        date: d,
        dateStr,
        dayNumber: format(d, 'd'),
        isOutsideMonth: !isSameMonth(d, currentMonth),
        isToday: isToday(d),
        isPast,
        isSelected: dateStr === selectedDate,
        isFullDayBlocked: fullDay.blocked,
        fullDayReason: fullDay.reason,
        isTimeSlotBlocked: slots.length > 0,
        timeSlotBlocks: slots,
        appointmentCount: aptCount,
      };
    });
  }, [currentMonth, selectedDate, unavailabilities, appointmentsCountByDate, effectiveMinDate]);

  const handleDateFieldClick = () => {
    if (!showVisualCalendar) {
      setShowVisualCalendar(true);
      setTimeout(() => {
        calendarRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 50);
    } else {
      setShowVisualCalendar(false);
    }
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
    if (collapseOnDateSelect) {
      setShowVisualCalendar(false);
    }
  };

  return (
    <div className="appointment-schedule-picker mb-3">
      {/* ─── FILA DE INPUTS DIRECTOS (Fecha y Hora) ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-2 items-start">
        <div>
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="font-semibold text-xs text-slate-700 flex items-center gap-1 mb-0">
                <FiCalendar className="text-bunny-primary" /> Fecha *
              </label>
              <button
                type="button"
                className="text-xs text-bunny-primary hover:underline font-semibold"
                onClick={() => setShowVisualCalendar(!showVisualCalendar)}
              >
                {showVisualCalendar ? '▲ Ocultar calendario' : '▶ Cambiar / Ver calendario'}
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
              className={`flex items-center justify-between border rounded-xl px-3 min-h-[38px] cursor-pointer select-none transition-colors ${
                fullDayBlock.blocked || (selectedDate && !allowPastDates && selectedDate < todayStr)
                  ? 'bg-rose-50 border-rose-400 text-rose-800'
                  : selectedDate
                  ? 'bg-bunny-light/10 border-bunny-accent/80 text-bunny-dark hover:border-bunny-primary'
                  : 'bg-white border-slate-300 text-slate-400 hover:border-bunny-primary'
              }`}
              title={showVisualCalendar ? 'Toca para ocultar el calendario' : 'Toca para abrir el calendario y cambiar fecha'}
            >
              <span className="text-xs sm:text-sm font-medium truncate">
                {formattedDateDisplay || 'Toca un día en el calendario interactivo...'}
              </span>
              {selectedDate ? (
                <span className="text-xs bg-bunny-primary text-white rounded-md px-2 py-0.5 ml-2 shrink-0 flex items-center gap-1">
                  📅 {selectedDate} <span className="text-[10px] opacity-80">{showVisualCalendar ? '▲' : '▼'}</span>
                </span>
              ) : (
                <span className="text-slate-400 text-sm ml-2 shrink-0">
                  📅
                </span>
              )}
            </div>
            {!showVisualCalendar && selectedDate && (
              <div className="flex items-center justify-between mt-1 px-1 text-[11px] text-slate-500">
                <span>✓ Fecha seleccionada</span>
                <button
                  type="button"
                  onClick={() => setShowVisualCalendar(true)}
                  className="text-bunny-primary font-medium hover:underline text-[11px]"
                >
                  Cambiar fecha 📅
                </button>
              </div>
            )}
            <input type="hidden" name="appointmentDate" value={selectedDate} />
          </div>
        </div>

        <div>
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="font-semibold text-xs text-slate-700 flex items-center gap-1 mb-0">
                <FiClock className="text-bunny-primary" /> Hora *
              </label>
              {calculatedEndTime && (
                <small className="text-slate-400 text-[11px]">
                  Termina: <strong className="text-slate-700">{calculatedEndTime} hrs</strong> ({durationMinutes} min)
                </small>
              )}
            </div>
            <div className="flex mb-2">
              <input
                type="time"
                required={required}
                value={selectedTime}
                onChange={(e) => onTimeChange(e.target.value)}
                className={`flex-1 text-base sm:text-sm rounded-l-xl border p-2 focus:outline-none focus:ring-1 focus:ring-bunny-primary ${
                  timeConflict.hasConflict ? 'bg-rose-50 border-rose-400 text-rose-800' : 'bg-white border-slate-300 text-slate-800'
                }`}
              />
              <button
                type="button"
                onClick={() => handleAdjustTimeMinutes(-15)}
                title="Atrasar 15 minutos"
                className="px-2.5 py-1 text-xs font-semibold bg-slate-100 hover:bg-slate-200 border-y border-r border-slate-300 text-slate-700 transition-colors"
              >
                -15m
              </button>
              <button
                type="button"
                onClick={() => handleAdjustTimeMinutes(15)}
                title="Adelantar 15 minutos"
                className="px-2.5 py-1 text-xs font-semibold bg-slate-100 hover:bg-slate-200 border-y border-r border-slate-300 rounded-r-xl text-slate-700 transition-colors"
              >
                +15m
              </button>
            </div>

            {/* ─── HORAS RÁPIDAS (DEBAJO DEL SELECTOR PREDETERMINADO) ─── */}
            {!fullDayBlock.blocked && !(selectedDate && !allowPastDates && selectedDate < todayStr) && (
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
                <div className="flex justify-between items-center mb-1.5">
                  <small className="text-slate-600 font-bold text-[11px] flex items-center gap-1">
                    <span>⚡</span> Horas rápidas:
                  </small>
                  <small className="text-slate-400 text-[10px]">
                    👤 Cita · 🚫 Bloqueado
                  </small>
                </div>
                <div className="grid grid-cols-4 gap-1">
                  {COMMON_SLOTS.map((slot) => {
                    const check = checkTimeSlotConflict(selectedDate, slot, durationMinutes, unavailabilities);
                    const isBlocked = check.hasConflict;

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
                        className={`text-[11px] py-1 px-1 rounded-lg border text-center transition-all ${
                          isCurrent
                            ? isAptOccupied
                              ? 'bg-rose-600 text-white border-rose-600 font-semibold shadow-xs'
                              : 'bg-bunny-primary text-white border-bunny-primary font-semibold shadow-xs'
                            : isBlocked
                            ? 'border-rose-200 bg-rose-50 text-rose-400 line-through cursor-not-allowed opacity-60'
                            : isAptOccupied
                            ? 'border-dashed border-amber-400 bg-amber-50 text-amber-900 font-semibold'
                            : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100 hover:border-slate-300'
                        }`}
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
          </div>
        </div>
      </div>

      {/* ─── CALENDARIO VISUAL INTERACTIVO ─── */}
      {showVisualCalendar && (
        <div
          ref={calendarRef}
          className="p-3.5 rounded-2xl border border-bunny-accent/50 bg-[#fffdfc] shadow-sm mb-3"
        >
          {/* Navegación del mes */}
          <div className="flex justify-between items-center mb-2.5">
            <button
              type="button"
              className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-colors"
              onClick={() => setCurrentMonth((prev) => subMonths(prev, 1))}
              aria-label="Mes anterior"
            >
              <FaChevronLeft size={11} />
            </button>

            <span className="font-bold text-xs sm:text-sm capitalize text-bunny-dark tracking-wide">
              {format(currentMonth, 'MMMM yyyy', { locale: es })}
            </span>

            <div className="flex gap-1">
              <button
                type="button"
                className="px-2 py-1 rounded-lg border border-bunny-primary text-bunny-primary hover:bg-bunny-light/30 text-xs font-semibold"
                onClick={() => {
                  const today = new Date();
                  setCurrentMonth(today);
                  onDateChange(format(today, 'yyyy-MM-dd'));
                  if (collapseOnDateSelect) {
                    setShowVisualCalendar(false);
                  }
                }}
              >
                Hoy
              </button>
              <button
                type="button"
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-colors"
                onClick={() => setCurrentMonth((prev) => addMonths(prev, 1))}
                aria-label="Mes siguiente"
              >
                <FaChevronRight size={11} />
              </button>
            </div>
          </div>

          {/* Días de la semana */}
          <div className="grid grid-cols-7 gap-1 text-center mb-1">
            {WEEK_DAYS.map((d, idx) => (
              <div
                key={idx}
                className="text-[11px] font-bold text-bunny-dark/70 py-0.5"
              >
                {d}
              </div>
            ))}
          </div>

          {/* Celdas del mes */}
          <div className="grid grid-cols-7 gap-1">
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
                  <div className="flex justify-between items-center">
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
                      <div className="text-[8px] text-slate-400 font-bold leading-none">
                        Pasado
                      </div>
                    )}
                    {!cell.isPast && cell.isFullDayBlocked && (
                      <div className="text-[8.5px] text-rose-800 font-bold leading-none truncate">
                        🚫 Cerrado
                      </div>
                    )}
                    {!cell.isPast && !cell.isFullDayBlocked && cell.isTimeSlotBlocked && (
                      <div className="text-[8px] text-amber-800 font-bold leading-none truncate">
                        ⏰ Bloqueo
                      </div>
                    )}
                    {cell.appointmentCount > 0 && (
                      <div className="text-[8px] text-sky-600 font-semibold leading-none mt-0.5">
                        • {cell.appointmentCount} {cell.appointmentCount === 1 ? 'cita' : 'citas'}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Leyenda del calendario */}
          <div className="flex flex-wrap gap-2 mt-2 pt-2 border-t border-slate-100 text-[10.5px]">
            <span className="flex items-center gap-1 text-rose-600 font-semibold">
              <span className="w-2 h-2 rounded-xs bg-rose-400 inline-block" />
              Día Cerrado
            </span>
            <span className="flex items-center gap-1 text-amber-700 font-semibold">
              <span className="w-2 h-2 rounded-xs bg-amber-500 inline-block" />
              Horario Bloqueado
            </span>
            <span className="flex items-center gap-1 text-sky-600 font-semibold">
              <span className="w-2 h-2 rounded-full bg-sky-500 inline-block" />
              Citas Agendadas
            </span>
            <span className="flex items-center gap-1 text-slate-400">
              <span className="w-2 h-2 rounded-xs bg-slate-300 inline-block" />
              Fechas Pasadas (Inactivas)
            </span>
            <span className="flex items-center gap-1 text-slate-400 ml-auto">
              Click en cualquier día futuro para seleccionarlo
            </span>
          </div>
        </div>
      )}

      {/* ─── ALERTAS Y DETALLE DE CITAS PARA EL DÍA SELECCIONADO ─── */}
      {selectedDate && (
        <>
          {/* CASO 3: CONFLICTO ESPECÍFICO DE LA HORA SELECCIONADA CON BLOQUEO */}
          {timeConflict.hasConflict && (
            <Alert variant="danger" className="mb-2 text-xs flex items-start gap-2">
              <FiAlertTriangle className="text-rose-600 text-base shrink-0 mt-0.5" />
              <div>
                <strong className="block text-rose-800">
                  CONFLICTO CON HORARIO BLOQUEADO
                </strong>
                <span>
                  La cita seleccionada (<strong>{selectedTime} a {calculatedEndTime}</strong> hrs)
                  se superpone con el bloqueo registrado:{' '}
                  <strong>"{timeConflict.reason}"</strong> ({timeConflict.conflictSlot}).
                </span>
                <div className="font-bold text-rose-700 mt-1">
                  Por favor selecciona otro horario para no invadir el bloqueo de agenda.
                </div>
              </div>
            </Alert>
          )}

          {/* CASO 4: ADVERTENCIA DE SUPERPOSICIÓN CON CITA EXISTENTE */}
          {!timeConflict.hasConflict && existingAptConflict && (
            <Alert variant="warning" className="mb-2 text-xs flex items-start gap-2">
              <FiAlertTriangle className="text-amber-600 text-base shrink-0 mt-0.5" />
              <div>
                <strong className="text-slate-800 block">Aviso de superposición con otra cita:</strong>
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
            <div className="py-1.5 px-3 mb-2 rounded-xl flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200">
              <FiCheckCircle className="text-emerald-600 shrink-0" />
              <span>Horario disponible: {selectedTime} a {calculatedEndTime} hrs sin conflictos.</span>
            </div>
          )}

          {/* ─── DETALLE DE CITAS PARA EL DÍA ─── */}
          {dayAppointments.length > 0 ? (
            <div className="p-3 mb-2 rounded-xl border border-slate-200 bg-slate-50 shadow-sm">
              <div className="flex justify-between items-center mb-2 flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-lg">📋</span>
                  <div>
                    <strong className="text-slate-800 text-xs sm:text-sm block">
                      Citas agendadas para este día ({dayAppointments.length})
                    </strong>
                    <div className="text-slate-500 text-[11px]">
                      Revisa los horarios ocupados para organizar la nueva cita
                    </div>
                  </div>
                </div>
                <Badge variant="primary" className="text-xs px-2 py-0.5">
                  {dayAppointments.length} {dayAppointments.length === 1 ? 'cita agendada' : 'citas agendadas'}
                </Badge>
              </div>

              {/* Lista cronológica de citas del día */}
              <div className="flex flex-col gap-2 max-h-52 overflow-y-auto pr-0.5">
                {dayAppointments.map((apt) => {
                  const aptEndTime = getAptEndTime(apt);
                  const dur = getAptDuration(apt);
                  const servicesText = getAptServicesText(apt);
                  const isColliding = isAptCollidingWithSelected(apt);

                  return (
                    <div
                      key={apt.id}
                      className={`p-2 rounded-xl border flex justify-between items-center flex-wrap gap-2 transition-all ${
                        isColliding
                          ? 'bg-rose-50 border-rose-300 ring-1 ring-rose-300'
                          : 'bg-white border-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className={`py-1 px-2 rounded-lg font-bold text-xs min-w-[105px] text-center ${
                            isColliding ? 'bg-rose-100 text-rose-800' : 'bg-sky-50 text-sky-800'
                          }`}
                        >
                          <FiClock size={11} className="inline mr-1" />
                          {apt.appointmentTime} - {aptEndTime}
                        </div>

                        <div>
                          <div className="font-semibold text-slate-800 text-xs flex items-center gap-1">
                            <FiUser size={12} className="text-slate-400" />
                            <span>{apt.customer?.fullName || 'Clienta'}</span>
                            {apt.customer?.phone && (
                              <small className="text-slate-400 font-normal">
                                ({apt.customer.phone})
                              </small>
                            )}
                          </div>
                          <div className="text-slate-500 text-[11px] flex items-center gap-1">
                            <span>💅 {servicesText}</span>
                            <span className="text-slate-400 font-semibold">({dur} min)</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        {isColliding && (
                          <Badge variant="danger" className="text-[10.5px]">
                            ⚠️ Choca con tu hora
                          </Badge>
                        )}
                        <Badge
                          variant={
                            apt.status === 'CONFIRMED'
                              ? 'success'
                              : apt.status === 'COMPLETED'
                              ? 'info'
                              : apt.status === 'PENDING'
                              ? 'warning'
                              : 'secondary'
                          }
                          className="text-[10.5px]"
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
              <div className="py-2 px-3 mb-2 rounded-xl flex items-center gap-2 border border-emerald-200 bg-emerald-50 text-emerald-800 text-xs">
                <FiCheckCircle className="text-emerald-600 shrink-0" />
                <div>
                  <strong>Agenda despejada:</strong> No hay otras citas agendadas registradas para esta fecha.
                </div>
              </div>
            )
          )}

          {/* CASO 0: FECHA EN EL PASADO */}
          {!allowPastDates && selectedDate < todayStr && (
            <Alert variant="danger" className="mb-2 text-xs flex items-start gap-2">
              <FiAlertTriangle className="text-rose-600 text-base shrink-0 mt-0.5" />
              <div>
                <strong className="block text-rose-800">FECHA EN EL PASADO</strong>
                <span>
                  No está permitido agendar citas en fechas anteriores a hoy ({todayStr}).
                  Por favor selecciona hoy o una fecha posterior.
                </span>
              </div>
            </Alert>
          )}

          {/* CASO 1: DÍA COMPLETO CERRADO / BLOQUEADO */}
          {fullDayBlock.blocked && (
            <Alert variant="danger" className="mb-2 text-xs flex items-start gap-2">
              <span className="text-base leading-none">🚫</span>
              <div>
                <strong className="block text-rose-800">
                  DÍA CERRADO / BLOQUEADO: {fullDayBlock.reason || 'Sin motivo especificado'}
                </strong>
                <span>
                  Este día completo ({selectedDate}) está configurado como bloqueado o no laborable en la agenda.
                </span>
                <div className="font-semibold mt-1 text-rose-700">
                  ⚠️ No se recomienda agendar citas en esta fecha.
                </div>
              </div>
            </Alert>
          )}

          {/* CASO 2: HORARIOS PARCIALES BLOQUEADOS EN LA FECHA */}
          {!fullDayBlock.blocked && slotBlocks.length > 0 && (
            <div className="p-3 mb-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs">
              <div className="flex items-center gap-1.5 mb-1.5 font-bold">
                <span>⏰</span>
                <span>Horarios bloqueados registrados para este día:</span>
              </div>
              <div className="flex flex-wrap gap-1.5 pl-4">
                {slotBlocks.map((b) => (
                  <Badge
                    key={b.id}
                    variant="warning"
                    className="py-1 px-2 font-semibold text-xs border border-amber-300"
                  >
                    🚫 {b.startTime} a {b.endTime} hrs: {b.reason || 'Horario bloqueado'}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default AppointmentSchedulePicker;
