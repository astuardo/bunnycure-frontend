import React, { useState, useMemo } from 'react';
import { 
  FiCalendar, 
  FiClock, 
  FiTrash2, 
  FiPlus, 
  FiBell, 
  FiTag, 
  FiDroplet,
  FiArchive,
} from 'react-icons/fi';
import { format } from 'date-fns';
import {
  ScheduleUnavailability,
  UnavailabilityColorConfig,
  UnavailabilityNotificationConfig,
  UnavailabilityType,
  QUICK_REASONS,
} from '../../types/unavailability.types';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { confirmDialog } from '../ui/confirmDialog';

interface Props {
  unavailabilities: ScheduleUnavailability[];
  colors: UnavailabilityColorConfig;
  notifications: UnavailabilityNotificationConfig;
  onUnavailabilitiesChange: (unavailabilities: ScheduleUnavailability[]) => void;
  onColorsChange: (colors: UnavailabilityColorConfig) => void;
  onNotificationsChange: (notifications: UnavailabilityNotificationConfig) => void;
}

export const ScheduleUnavailabilitySection: React.FC<Props> = ({
  unavailabilities,
  colors,
  notifications,
  onUnavailabilitiesChange,
  onColorsChange,
  onNotificationsChange,
}) => {
  const [blockType, setBlockType] = useState<UnavailabilityType>('FULL_DAY');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [startTime, setStartTime] = useState('13:00');
  const [endTime, setEndTime] = useState('16:00');
  const [reason, setReason] = useState('');
  const [showConfig, setShowConfig] = useState(false);
  const [activeTab, setActiveTab] = useState<'active' | 'history'>('active');

  const todayStr = useMemo(() => format(new Date(), 'yyyy-MM-dd'), []);

  const { activeBlocks, pastBlocks } = useMemo(() => {
    const active: ScheduleUnavailability[] = [];
    const past: ScheduleUnavailability[] = [];

    for (const item of unavailabilities) {
      const effectiveEnd = item.endDate || item.startDate;
      if (effectiveEnd >= todayStr) {
        active.push(item);
      } else {
        past.push(item);
      }
    }

    active.sort((a, b) => 
      a.startDate.localeCompare(b.startDate) || (a.startTime || '').localeCompare(b.startTime || '')
    );
    past.sort((a, b) => 
      b.startDate.localeCompare(a.startDate) || (b.startTime || '').localeCompare(a.startTime || '')
    );

    return { activeBlocks: active, pastBlocks: past };
  }, [unavailabilities, todayStr]);

  const handleAdd = () => {
    if (!startDate) {
      alert('Por favor selecciona una fecha de inicio');
      return;
    }

    const finalEndDate = blockType === 'FULL_DAY' ? (endDate || startDate) : startDate;

    if (blockType === 'FULL_DAY' && endDate && endDate < startDate) {
      alert('La fecha de fin no puede ser anterior a la fecha de inicio');
      return;
    }

    if (blockType === 'TIME_SLOT' && startTime >= endTime) {
      alert('La hora de término debe ser posterior a la hora de inicio');
      return;
    }

    const finalReason = reason.trim() || (blockType === 'FULL_DAY' ? 'Día no disponible' : 'Bloqueo de horario');

    const newBlock: ScheduleUnavailability = {
      id: `block-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      type: blockType,
      startDate,
      endDate: finalEndDate,
      startTime: blockType === 'TIME_SLOT' ? startTime : undefined,
      endTime: blockType === 'TIME_SLOT' ? endTime : undefined,
      reason: finalReason,
      createdAt: new Date().toISOString(),
    };

    const updated = [...unavailabilities, newBlock].sort((a, b) => 
      a.startDate.localeCompare(b.startDate) || (a.startTime || '').localeCompare(b.startTime || '')
    );

    onUnavailabilitiesChange(updated);

    // Reset inputs
    setStartDate('');
    setEndDate('');
    setReason('');
  };

  const handleDelete = (id: string) => {
    onUnavailabilitiesChange(unavailabilities.filter((u) => u.id !== id));
  };

  return (
    <Card className="mb-6">
      <Card.Header className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-r from-bunny-blush/40 to-bunny-paper/80 py-3.5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-bunny-primary text-white flex items-center justify-center text-lg flex-shrink-0">
            <FiCalendar />
          </div>
          <div>
            <h3 className="text-sm font-bold text-bunny-text leading-tight">
              Bloqueos de Agenda y Días No Laborables
            </h3>
            <p className="text-xs text-bunny-text-muted mt-0.5">
              Bloquea semanas completas, días festivos o franjas horarias con comentarios
            </p>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowConfig(!showConfig)}
        >
          {showConfig ? 'Ocultar Opciones' : '🎨 Personalizar Colores y Avisos'}
        </Button>
      </Card.Header>

      <Card.Body className="p-4 sm:p-6 space-y-5">
        {/* Panel de Configuración de Colores y Notificaciones (Desplegable) */}
        {showConfig && (
          <div className="p-4 rounded-xl border border-bunny-border bg-bunny-paper/40">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="text-xs font-bold text-bunny-text flex items-center gap-2 mb-3 uppercase tracking-wider">
                  <FiDroplet className="text-bunny-primary" /> Colores de Visualización en Calendarios
                </h4>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={colors.fullDayColor}
                      onChange={(e) => onColorsChange({ ...colors, fullDayColor: e.target.value })}
                      className="w-10 h-9 rounded-lg border border-bunny-border cursor-pointer p-0.5 bg-white"
                    />
                    <div>
                      <span className="text-xs font-semibold text-bunny-text block">Día Completo / Rango</span>
                      <span className="text-[11px] text-bunny-text-muted">Ej: Vacaciones, Feriados</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={colors.timeSlotColor}
                      onChange={(e) => onColorsChange({ ...colors, timeSlotColor: e.target.value })}
                      className="w-10 h-9 rounded-lg border border-bunny-border cursor-pointer p-0.5 bg-white"
                    />
                    <div>
                      <span className="text-xs font-semibold text-bunny-text block">Horario Específico</span>
                      <span className="text-[11px] text-bunny-text-muted">Ej: Médico, Trámites (13:00 - 16:00)</span>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold text-bunny-text flex items-center gap-2 mb-3 uppercase tracking-wider">
                  <FiBell className="text-bunny-primary" /> Notificaciones Push PWA
                </h4>
                <div className="space-y-2.5">
                  <label className="flex items-center gap-2.5 cursor-pointer text-xs font-semibold text-bunny-text">
                    <input
                      type="checkbox"
                      id="notif-enabled"
                      checked={notifications.enabled}
                      onChange={(e) => onNotificationsChange({ ...notifications, enabled: e.target.checked })}
                      className="w-4 h-4 rounded text-bunny-primary focus:ring-bunny-primary/30 border-bunny-border accent-bunny-primary"
                    />
                    Habilitar avisos PWA para bloqueos
                  </label>
                  <label className="flex items-center gap-2.5 cursor-pointer text-xs text-bunny-text pl-6">
                    <input
                      type="checkbox"
                      id="notif-24h"
                      disabled={!notifications.enabled}
                      checked={notifications.notify24HoursBefore}
                      onChange={(e) => onNotificationsChange({ ...notifications, notify24HoursBefore: e.target.checked })}
                      className="w-4 h-4 rounded text-bunny-primary focus:ring-bunny-primary/30 border-bunny-border accent-bunny-primary disabled:opacity-50"
                    />
                    Avisar 24 horas antes del evento
                  </label>
                  <label className="flex items-center gap-2.5 cursor-pointer text-xs text-bunny-text pl-6">
                    <input
                      type="checkbox"
                      id="notif-1h"
                      disabled={!notifications.enabled}
                      checked={notifications.notify1HourBefore}
                      onChange={(e) => onNotificationsChange({ ...notifications, notify1HourBefore: e.target.checked })}
                      className="w-4 h-4 rounded text-bunny-primary focus:ring-bunny-primary/30 border-bunny-border accent-bunny-primary disabled:opacity-50"
                    />
                    Avisar 1 hora antes del horario bloqueado
                  </label>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Selector de Tipo de Bloqueo */}
        <div className="flex flex-wrap gap-2">
          <Button
            variant={blockType === 'FULL_DAY' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setBlockType('FULL_DAY')}
            leftIcon={<FiCalendar />}
          >
            Día Completo o Semana / Vacaciones
          </Button>
          <Button
            variant={blockType === 'TIME_SLOT' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setBlockType('TIME_SLOT')}
            leftIcon={<FiClock />}
          >
            Franja Horaria Específica
          </Button>
        </div>

        {/* Formulario de Alta de Bloqueo */}
        <div className="p-4 rounded-xl bg-bunny-paper/40 border border-bunny-border">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-12 gap-3 items-end">
            {blockType === 'FULL_DAY' ? (
              <>
                <div className="md:col-span-3">
                  <label htmlFor="schedule-unavailability-fecha-inicio-dia" className="block text-xs font-semibold text-bunny-text uppercase tracking-wider mb-1">
                    Fecha Inicio / Día
                  </label>
                  <input id="schedule-unavailability-fecha-inicio-dia"
                    type="date"
                    min={todayStr}
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full rounded-xl border border-bunny-border bg-white px-3 py-2 text-xs text-bunny-text focus:outline-none focus:ring-2 focus:ring-bunny-primary/20 focus:border-bunny-primary"
                  />
                </div>
                <div className="md:col-span-3">
                  <label htmlFor="schedule-unavailability-fecha-fin-opcional-si" className="block text-xs font-semibold text-bunny-text uppercase tracking-wider mb-1">
                    Fecha Fin (Opcional si es 1 día)
                  </label>
                  <input id="schedule-unavailability-fecha-fin-opcional-si"
                    type="date"
                    value={endDate}
                    min={startDate || todayStr}
                    onChange={(e) => setEndDate(e.target.value)}
                    placeholder="Mismo día"
                    className="w-full rounded-xl border border-bunny-border bg-white px-3 py-2 text-xs text-bunny-text focus:outline-none focus:ring-2 focus:ring-bunny-primary/20 focus:border-bunny-primary"
                  />
                </div>
              </>
            ) : (
              <>
                <div className="md:col-span-3">
                  <label htmlFor="schedule-unavailability-fecha-del-bloqueo" className="block text-xs font-semibold text-bunny-text uppercase tracking-wider mb-1">
                    Fecha del Bloqueo
                  </label>
                  <input id="schedule-unavailability-fecha-del-bloqueo"
                    type="date"
                    min={todayStr}
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full rounded-xl border border-bunny-border bg-white px-3 py-2 text-xs text-bunny-text focus:outline-none focus:ring-2 focus:ring-bunny-primary/20 focus:border-bunny-primary"
                  />
                </div>
                <div className="md:col-span-2">
                  <label htmlFor="schedule-unavailability-hora-inicio" className="block text-xs font-semibold text-bunny-text uppercase tracking-wider mb-1">
                    Hora Inicio
                  </label>
                  <input id="schedule-unavailability-hora-inicio"
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full rounded-xl border border-bunny-border bg-white px-3 py-2 text-xs text-bunny-text focus:outline-none focus:ring-2 focus:ring-bunny-primary/20 focus:border-bunny-primary"
                  />
                </div>
                <div className="md:col-span-2">
                  <label htmlFor="schedule-unavailability-hora-fin" className="block text-xs font-semibold text-bunny-text uppercase tracking-wider mb-1">
                    Hora Fin
                  </label>
                  <input id="schedule-unavailability-hora-fin"
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full rounded-xl border border-bunny-border bg-white px-3 py-2 text-xs text-bunny-text focus:outline-none focus:ring-2 focus:ring-bunny-primary/20 focus:border-bunny-primary"
                  />
                </div>
              </>
            )}

            <div className={blockType === 'FULL_DAY' ? 'md:col-span-4' : 'md:col-span-3'}>
              <label htmlFor="schedule-unavailability-motivo-comentario" className="block text-xs font-semibold text-bunny-text uppercase tracking-wider mb-1">
                Motivo / Comentario
              </label>
              <input id="schedule-unavailability-motivo-comentario"
                type="text"
                placeholder={blockType === 'FULL_DAY' ? 'Ej: Vacaciones, Feriado' : 'Ej: Médico, Trámite'}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full rounded-xl border border-bunny-border bg-white px-3 py-2 text-xs text-bunny-text focus:outline-none focus:ring-2 focus:ring-bunny-primary/20 focus:border-bunny-primary"
              />
            </div>

            <div className="md:col-span-2">
              <Button
                variant="primary"
                size="sm"
                fullWidth
                onClick={handleAdd}
                leftIcon={<FiPlus />}
              >
                Registrar
              </Button>
            </div>
          </div>

          {/* Chips de Sugerencias de Motivo */}
          <div className="flex flex-wrap gap-1.5 items-center mt-3 pt-2 border-t border-bunny-border/40">
            <span className="text-xs text-bunny-text-muted mr-1 flex items-center gap-1">
              <FiTag size={12} /> Sugerencias:
            </span>
            {QUICK_REASONS.map((r) => (
              <button
                key={r}
                type="button"
                className={`text-xs px-2.5 py-1 rounded-lg border font-medium transition-all ${
                  reason === r
                    ? 'bg-bunny-blush/60 border-bunny-primary text-bunny-primary'
                    : 'bg-white border-bunny-border text-bunny-text hover:bg-bunny-paper'
                }`}
                onClick={() => setReason(r)}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        {/* Selector de pestañas: Bloqueos Activos vs Historial de Bloqueos */}
        <div className="flex justify-between items-center flex-wrap gap-2 pt-2">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('active')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'active'
                  ? 'bg-bunny-primary text-white shadow-sm'
                  : 'bg-bunny-sand text-bunny-text hover:bg-bunny-border'
              }`}
            >
              <span>Vigentes y Próximos</span>
              <Badge variant={activeTab === 'active' ? 'neutral' : 'neutral'}>
                {activeBlocks.length}
              </Badge>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('history')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'history'
                  ? 'bg-bunny-primary text-white shadow-sm'
                  : 'bg-bunny-sand text-bunny-text hover:bg-bunny-border'
              }`}
            >
              <FiArchive size={13} />
              <span>Historial Pasado</span>
              <Badge variant={activeTab === 'history' ? 'neutral' : 'neutral'}>
                {pastBlocks.length}
              </Badge>
            </button>
          </div>

          {activeTab === 'history' && pastBlocks.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                if (await confirmDialog({ message: `¿Eliminar los ${pastBlocks.length} registros del historial de bloqueos pasados?`, confirmLabel: 'Eliminar historial', tone: 'danger' })) {
                  onUnavailabilitiesChange(unavailabilities.filter((u) => (u.endDate || u.startDate) >= todayStr));
                }
              }}
              leftIcon={<FiTrash2 size={13} className="text-rose-600" />}
              className="text-rose-600 border-rose-200 hover:bg-rose-50"
            >
              Limpiar Historial Pasado
            </Button>
          )}
        </div>

        {/* Mensaje de lista vacía */}
        {activeTab === 'active' && activeBlocks.length === 0 ? (
          <div className="text-center py-8 border border-bunny-border rounded-xl bg-bunny-paper/20">
            <div className="text-2xl mb-1">🗓️</div>
            <div className="font-semibold text-xs text-bunny-text">No hay bloqueos activos ni próximos configurados</div>
            <p className="text-[11px] text-bunny-text-muted mt-0.5">
              Utiliza el formulario superior para programar vacaciones, descansos o citas médicas pendientes.
            </p>
          </div>
        ) : activeTab === 'history' && pastBlocks.length === 0 ? (
          <div className="text-center py-8 border border-bunny-border rounded-xl bg-bunny-paper/20">
            <div className="text-2xl mb-1">📂</div>
            <div className="font-semibold text-xs text-bunny-text">No hay bloqueos en el historial pasado</div>
            <p className="text-[11px] text-bunny-text-muted mt-0.5">
              Los bloqueos o días cerrados que ya hayan transcurrido se guardarán aquí automáticamente como histórico.
            </p>
          </div>
        ) : (
          <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
            {(activeTab === 'active' ? activeBlocks : pastBlocks).map((item) => {
              const isFullDay = item.type === 'FULL_DAY';
              const isMultiDay = isFullDay && item.endDate && item.endDate !== item.startDate;
              const isPast = (item.endDate || item.startDate) < todayStr;

              return (
                <div
                  key={item.id}
                  className={`flex justify-between items-center p-3 rounded-xl border transition-all ${
                    isPast
                      ? 'bg-bunny-paper border-bunny-border opacity-80'
                      : isFullDay
                      ? 'bg-rose-50/60 border-rose-200'
                      : 'bg-amber-50/60 border-amber-200'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold text-center min-w-[70px] ${
                        isPast
                          ? 'bg-bunny-border text-bunny-text'
                          : isFullDay
                          ? 'bg-rose-200 text-rose-900'
                          : 'bg-amber-200 text-amber-900'
                      }`}
                    >
                      {isPast ? 'PASADO' : isFullDay ? (isMultiDay ? 'RANGO' : 'DÍA COMPLETO') : 'HORARIO'}
                    </div>

                    <div>
                      <div className="font-bold text-xs text-bunny-text flex items-center gap-2">
                        {item.reason}
                        {isPast && (
                          <Badge variant="neutral" className="text-[10px]">
                            Histórico
                          </Badge>
                        )}
                      </div>
                      <div className="text-[11px] text-bunny-text-muted flex items-center gap-2 mt-0.5">
                        <span className="flex items-center gap-1">
                          <FiCalendar size={12} />
                          {isMultiDay ? (
                            <>
                              {new Date(item.startDate + 'T12:00:00').toLocaleDateString('es-CL', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                              })}{' '}
                              al{' '}
                              {new Date(item.endDate + 'T12:00:00').toLocaleDateString('es-CL', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                              })}
                            </>
                          ) : (
                            new Date(item.startDate + 'T12:00:00').toLocaleDateString('es-CL', {
                              weekday: 'short',
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            })
                          )}
                        </span>

                        {!isFullDay && item.startTime && item.endTime && (
                          <span className="flex items-center gap-1 font-semibold text-amber-800">
                            <FiClock size={12} /> {item.startTime} a {item.endTime} hrs
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDelete(item.id)}
                    className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-100/60 transition-colors"
                    title={isPast ? 'Eliminar del historial' : 'Eliminar bloqueo'}
                  >
                    <FiTrash2 size={16} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </Card.Body>
    </Card>
  );
};

export default ScheduleUnavailabilitySection;
