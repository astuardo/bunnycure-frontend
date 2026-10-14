import React, { useEffect, useState, useMemo } from 'react';
import { FiCalendar, FiClock, FiUser, FiCheckCircle, FiAlertCircle } from 'react-icons/fi';
import { FaWhatsapp, FaRegClock } from 'react-icons/fa';
import { servicesApi } from '../../api/services.api';
import { bookingsApi } from '../../api/bookings.api';
import { ServiceCatalog } from '../../types/service.types';
import { BookingRequestFormData } from '../../types/booking.types';
import { formatCurrencyCLP } from '../../utils/formatters';
import { isValidRutFormat, normalizeRut } from '../../utils/rutUtils';
import {
  getPublicBookingEnabled,
  OFFICIAL_WHATSAPP_PHONE,
  OFFICIAL_WHATSAPP_DISPLAY,
} from '../../utils/bookingSettingsUtils';
import { settingsApi } from '../../api/settings.api';
import { ScheduleUnavailability } from '../../types/unavailability.types';
import {
  isDateBlockedFullDay,
  checkTimeSlotConflict,
  getTimeSlotBlocksForDate,
} from '../../utils/unavailabilityUtils';
import {
  Card,
  Button,
  Input,
  Select,
  Textarea,
  Badge,
  Spinner,
  Alert,
  ProgressBar,
} from '../../components/ui';
import { useTenant } from '../../context/TenantContext';

export const PublicBookingPage: React.FC = () => {
  const { tenant } = useTenant();
  const salonName = tenant.name || 'BunnyCure';
  const salonSlogan = tenant.slogan || 'Estudio de Manicure & Cuidado de Uñas';
  const officialPhone = (tenant.whatsappNumber || tenant.phone || OFFICIAL_WHATSAPP_PHONE).replace(/\D/g, '');
  const officialPhoneDisplay = tenant.phone || OFFICIAL_WHATSAPP_DISPLAY;
  const isEnabled = tenant.bookingEnabled ?? getPublicBookingEnabled();

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [services, setServices] = useState<ServiceCatalog[]>([]);
  const [loadingServices, setLoadingServices] = useState(true);

  // Form states
  const [selectedServiceIds, setSelectedServiceIds] = useState<number[]>([]);
  const [preferredDate, setPreferredDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  });
  const [preferredTimeBlock, setPreferredTimeBlock] = useState<string>('TARDE');
  const [preferredTimeExact, setPreferredTimeExact] = useState<string>('15:00');

  // Customer contact
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [rut, setRut] = useState('');
  const [instagram, setInstagram] = useState('');
  const [notes, setNotes] = useState('');

  // Submission state
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [createdRequestId, setCreatedRequestId] = useState<number | null>(null);
  const [unavailabilities, setUnavailabilities] = useState<ScheduleUnavailability[]>([]);

  useEffect(() => {
    if (!isEnabled) return;
    const fetchServices = async () => {
      try {
        setLoadingServices(true);
        const data = await servicesApi.list();
        // Filtrar servicios activos
        const active = (data || []).filter((s) => s.active !== false);
        setServices(active);
        if (active.length > 0) {
          setSelectedServiceIds([active[0].id]);
        }
      } catch (err) {
        console.error('Error loading services:', err);
      } finally {
        setLoadingServices(false);
      }
    };
    fetchServices();
    settingsApi
      .getAll()
      .then((data) => {
        if (data.unavailabilities && data.unavailabilities.length > 0) {
          setUnavailabilities(data.unavailabilities);
        }
      })
      .catch((err) =>
        console.error('Error loading unavailabilities in PublicBookingPage:', err)
      );
  }, [isEnabled]);

  const selectedServices = useMemo(() => {
    return services.filter((s) => selectedServiceIds.includes(s.id));
  }, [services, selectedServiceIds]);

  const totalEstimatedPrice = useMemo(() => {
    return selectedServices.reduce((sum, s) => sum + (s.price || 0), 0);
  }, [selectedServices]);

  const totalEstimatedDuration = useMemo(() => {
    return selectedServices.reduce((sum, s) => sum + (s.durationMinutes || 60), 0);
  }, [selectedServices]);

  const preferredDateBlock = useMemo(() => {
    if (!preferredDate) return { blocked: false };
    return isDateBlockedFullDay(preferredDate, unavailabilities);
  }, [preferredDate, unavailabilities]);

  const preferredDateSlotBlocks = useMemo(() => {
    if (!preferredDate) return [];
    return getTimeSlotBlocksForDate(preferredDate, unavailabilities);
  }, [preferredDate, unavailabilities]);

  const exactTimeConflict = useMemo(() => {
    if (!preferredDate || !preferredTimeExact) return { hasConflict: false };
    return checkTimeSlotConflict(
      preferredDate,
      preferredTimeExact,
      totalEstimatedDuration,
      unavailabilities
    );
  }, [preferredDate, preferredTimeExact, totalEstimatedDuration, unavailabilities]);

  const handleToggleService = (id: number) => {
    if (selectedServiceIds.includes(id)) {
      if (selectedServiceIds.length > 1) {
        setSelectedServiceIds(selectedServiceIds.filter((sid) => sid !== id));
      }
    } else {
      setSelectedServiceIds([...selectedServiceIds, id]);
    }
  };

  const handlePhoneChange = (val: string) => {
    setPhone(val);
  };

  const timeBlockLabels: Record<string, string> = {
    MANANA: `Mañana (${tenant.morningBlock || '10:00 - 13:30'})`,
    TARDE: `Tarde (${tenant.afternoonBlock || '14:30 - 18:00'})`,
    NOCHE: `Noche (${tenant.nightBlock || '18:30 - 20:30'})`,
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !phone.trim() || selectedServiceIds.length === 0) {
      setSubmitError(
        'Por favor completa tu nombre, teléfono y selecciona al menos un servicio.'
      );
      return;
    }

    if (rut.trim() && !isValidRutFormat(rut)) {
      setSubmitError('El RUT ingresado no tiene un formato válido.');
      return;
    }

    if (preferredDateBlock.blocked) {
      setSubmitError(
        `La fecha seleccionada (${preferredDate}) no está disponible para atención (${
          preferredDateBlock.reason || 'Día cerrado'
        }). Por favor elige otra fecha.`
      );
      return;
    }

    if (exactTimeConflict.hasConflict) {
      setSubmitError(
        `El horario seleccionado (${preferredTimeExact} hrs) no está disponible (${exactTimeConflict.reason}). Por favor elige otra hora.`
      );
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    const formattedTime = preferredTimeExact || '10:00';
    const primaryServiceId = selectedServiceIds[0];

    const notesPayload = [
      `Hora aprox: ${formattedTime} hrs`,
      rut.trim() ? `RUT: ${normalizeRut(rut)}` : '',
      instagram.trim() ? `Instagram: @${instagram.replace(/^@/, '')}` : '',
      selectedServices.length > 1
        ? `Servicios adicionales: ${selectedServices
            .slice(1)
            .map((s) => s.name)
            .join(', ')}`
        : '',
      notes.trim() ? `Notas: ${notes.trim()}` : '',
    ]
      .filter(Boolean)
      .join(' | ');

    const payload: BookingRequestFormData = {
      fullName: fullName.trim(),
      phone: phone.trim().startsWith('+') ? phone.trim() : `+56${phone.trim().replace(/^56/, '')}`,
      email: email.trim() || undefined,
      serviceId: primaryServiceId,
      preferredDate: preferredDate,
      preferredBlock: timeBlockLabels[preferredTimeBlock] || 'Tarde',
      notes: notesPayload || undefined,
    };

    try {
      const res = await bookingsApi.create(payload);
      setCreatedRequestId(res.id);
      setStep(4);
    } catch (err: unknown) {
      const error = err as { message?: string };
      setSubmitError(
        error.message ||
          'Ocurrió un error al procesar tu solicitud. Por favor intenta nuevamente.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const getMinDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  return (
    <div className="min-h-screen min-h-[100dvh] py-8 px-4 bg-gradient-to-b from-bunny-bg to-bunny-blush/40 text-bunny-text flex flex-col justify-center">
      <div className="w-full max-w-xl mx-auto">
        {/* Cabecera de Marca Dinámica */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white shadow-bunny border-2 border-bunny-border-strong text-3xl mb-2 overflow-hidden">
            {tenant.logoUrl && tenant.logoUrl !== '/images/logo.png' ? (
              <img
                src={tenant.logoUrl}
                alt={salonName}
                className="w-full h-full object-contain p-1.5"
                onError={(e) => {
                  (e.currentTarget as HTMLElement).style.display = 'none';
                  const fallback = e.currentTarget.parentElement?.querySelector('.tenant-booking-fallback') as HTMLElement | null;
                  if (fallback) fallback.style.display = 'inline';
                }}
              />
            ) : null}
            <span
              className="tenant-booking-fallback"
              style={{
                display: tenant.logoUrl && tenant.logoUrl !== '/images/logo.png' ? 'none' : 'inline',
              }}
            >
              💅
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-bunny-primary-dark tracking-tight">
            {salonName}
          </h1>
          <p className="text-sm text-bunny-text-muted mt-0.5">
            {salonSlogan}
          </p>
        </div>

        {/* CASO 1: AGENDAMIENTO DESHABILITADO */}
        {!isEnabled ? (
          <Card className="shadow-bunny-lg border-bunny-border text-center p-6 sm:p-8">
            <Card.Body className="space-y-4">
              <div className="text-5xl">🌸</div>
              <h2 className="text-xl font-bold text-bunny-primary-dark">
                Agendamiento Online en Pausa
              </h2>
              <p className="text-sm text-bunny-text-muted leading-relaxed">
                En este momento la agenda online se encuentra temporalmente en mantención o sin cupos
                disponibles en la web.
                <br />
                <strong className="text-bunny-cocoa">¡Pero no te preocupes!</strong> Puedes
                escribirnos directamente por WhatsApp para coordinar tu cita o consultar
                disponibilidad.
              </p>

              <a
                href={`https://wa.me/${officialPhone}?text=Hola%20${encodeURIComponent(
                  salonName
                )}!%20Quisiera%20consultar%20por%20disponibilidad%20de%20horas.`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3.5 px-4 rounded-xl font-bold text-white flex items-center justify-center gap-2.5 shadow-sm bg-[#25D366] hover:bg-[#20ba59] transition-colors"
              >
                <FaWhatsapp className="text-xl" /> Escribir al WhatsApp Oficial
              </a>
              <p className="text-xs text-bunny-text-muted mt-2">
                Atención directa al {officialPhoneDisplay}
              </p>
            </Card.Body>
          </Card>
        ) : step === 4 ? (
          /* CASO 2: CONFIRMACIÓN EXITOSA */
          <Card className="shadow-bunny-lg border-bunny-border text-center p-6 sm:p-8 animate-fade-in">
            <Card.Body className="space-y-4">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-50 border-2 border-emerald-200 text-emerald-600 mb-1">
                <FiCheckCircle className="text-3xl" />
              </div>

              <h2 className="text-xl sm:text-2xl font-bold text-emerald-900">
                ¡Solicitud de Reserva Recibida!
              </h2>
              <p className="text-sm text-bunny-text-muted">
                Muchas gracias, <strong className="text-bunny-cocoa">{fullName}</strong>. Hemos
                recibido tu solicitud para el{' '}
                <strong className="text-bunny-cocoa">{preferredDate}</strong> ({preferredTimeExact}{' '}
                hrs).
              </p>

              <div className="p-4 rounded-xl text-left bg-bunny-paper/60 border border-bunny-border space-y-2">
                <h3 className="text-sm font-bold text-bunny-primary-dark">
                  Resumen de tu Solicitud #{createdRequestId}:
                </h3>
                <div className="text-xs text-bunny-text">
                  <span className="font-semibold">Servicio(s):</span>{' '}
                  {selectedServices.map((s) => s.name).join(' + ')}
                </div>
                <div className="text-xs text-bunny-text">
                  <span className="font-semibold">Valor Estimado:</span>{' '}
                  {formatCurrencyCLP(totalEstimatedPrice)}
                </div>
                <div className="text-xs text-bunny-text">
                  <span className="font-semibold">Fecha y Hora:</span> {preferredDate} a las{' '}
                  {preferredTimeExact} hrs ({timeBlockLabels[preferredTimeBlock]})
                </div>
                <p className="text-xs text-bunny-text-muted pt-2 border-t border-bunny-border/60">
                  ✨ Te enviaremos la confirmación definitiva a tu WhatsApp{' '}
                  <strong className="text-bunny-cocoa">{phone}</strong> en breve.
                </p>
              </div>

              <a
                href={`https://wa.me/${officialPhone}?text=Hola%20${encodeURIComponent(
                  salonName
                )}!%20Acabo%20de%20enviar%20mi%20solicitud%20de%20reserva%20%23${createdRequestId}%20a%20nombre%20de%20${encodeURIComponent(
                  fullName
                )}.`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3.5 px-4 rounded-xl font-bold text-white flex items-center justify-center gap-2.5 shadow-sm bg-[#25D366] hover:bg-[#20ba59] transition-colors"
              >
                <FaWhatsapp className="text-xl" /> Notificar por WhatsApp
              </a>

              <Button
                variant="outline"
                size="sm"
                className="w-full mt-2"
                onClick={() => {
                  setStep(1);
                  setFullName('');
                  setPhone('');
                  setNotes('');
                }}
              >
                Realizar otra reserva
              </Button>
            </Card.Body>
          </Card>
        ) : (
          /* FORMULARIO EN PASOS (1, 2, 3) */
          <Card className="shadow-bunny-lg border-bunny-border overflow-hidden">
            {/* Barra de Progreso */}
            <div className="p-4 border-b border-bunny-border bg-bunny-paper/50">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-bold text-bunny-primary-dark">
                  Paso {step} de 3:{' '}
                  {step === 1
                    ? 'Elige tu Servicio'
                    : step === 2
                    ? 'Fecha y Horario'
                    : 'Tus Datos'}
                </span>
                <span className="text-xs text-bunny-text-muted font-medium">
                  {step === 1 ? '33%' : step === 2 ? '66%' : '100%'}
                </span>
              </div>
              <ProgressBar
                value={step === 1 ? 33 : step === 2 ? 66 : 100}
                variant="primary"
                size="xs"
              />
            </div>

            <Card.Body className="p-5 sm:p-7">
              {submitError && (
                <Alert variant="danger" className="mb-4">
                  {submitError}
                </Alert>
              )}

              {/* PASO 1: SELECCIÓN DE SERVICIOS */}
              {step === 1 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <FaRegClock className="text-bunny-primary text-base" />
                    <h2 className="text-base font-bold text-bunny-cocoa">
                      Selecciona el servicio que deseas
                    </h2>
                  </div>

                  {loadingServices ? (
                    <div className="flex flex-col items-center justify-center py-12 text-bunny-text-muted">
                      <Spinner size="lg" variant="primary" />
                      <p className="text-xs mt-3">Cargando catálogo de servicios...</p>
                    </div>
                  ) : services.length === 0 ? (
                    <div className="text-center py-8 text-sm text-bunny-text-muted">
                      No hay servicios disponibles en este momento.
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {services.map((srv) => {
                        const isSelected = selectedServiceIds.includes(srv.id);
                        return (
                          <div
                            key={srv.id}
                            onClick={() => handleToggleService(srv.id)}
                            className={`p-3.5 rounded-xl border flex justify-between items-start gap-3 cursor-pointer transition-all duration-150 ${
                              isSelected
                                ? 'border-bunny-primary bg-bunny-blush/40 shadow-xs'
                                : 'border-bunny-border bg-white hover:border-bunny-border-strong'
                            }`}
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2.5">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => {}}
                                  className="h-4 w-4 rounded border-bunny-border text-bunny-primary focus:ring-bunny-primary/30 pointer-events-none accent-[#8c2a3e]"
                                />
                                <span className="font-semibold text-sm text-bunny-cocoa">
                                  {srv.name}
                                </span>
                              </div>
                              {srv.description && (
                                <p className="text-xs text-bunny-text-muted mt-1 pl-6">
                                  {srv.description}
                                </p>
                              )}
                              <div className="pl-6 mt-1.5 flex items-center gap-2">
                                <Badge variant="neutral" className="text-[11px] gap-1">
                                  <FiClock className="text-[10px]" /> {srv.durationMinutes || 60} min
                                </Badge>
                              </div>
                            </div>

                            <div className="shrink-0 text-right">
                              <span className="font-bold text-sm sm:text-base text-bunny-primary-dark">
                                {formatCurrencyCLP(srv.price || 0)}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Resumen flotante */}
                  {selectedServices.length > 0 && (
                    <div className="p-3.5 rounded-xl bg-bunny-paper/60 border border-dashed border-bunny-border-strong flex justify-between items-center">
                      <span className="text-xs text-bunny-text-muted">
                        {selectedServices.length} servicio
                        {selectedServices.length !== 1 ? 's' : ''} (~{totalEstimatedDuration} min):
                      </span>
                      <strong className="text-sm font-bold text-bunny-primary-dark">
                        Total: {formatCurrencyCLP(totalEstimatedPrice)}
                      </strong>
                    </div>
                  )}

                  <Button
                    variant="primary"
                    size="lg"
                    fullWidth
                    disabled={selectedServiceIds.length === 0}
                    onClick={() => setStep(2)}
                  >
                    Continuar a Fecha y Hora &rarr;
                  </Button>
                </div>
              )}

              {/* PASO 2: FECHA Y HORARIO */}
              {step === 2 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <FiCalendar className="text-bunny-primary text-base" />
                    <h2 className="text-base font-bold text-bunny-cocoa">
                      ¿Cuándo te gustaría venir?
                    </h2>
                  </div>

                  <div>
                    <Input
                      type="date"
                      label="FECHA PREFERIDA"
                      min={getMinDate()}
                      value={preferredDate}
                      onChange={(e) => setPreferredDate(e.target.value)}
                      error={preferredDateBlock.blocked ? 'Fecha no disponible' : undefined}
                    />
                  </div>

                  {/* Alerta de Día Cerrado / Bloqueado */}
                  {preferredDateBlock.blocked && (
                    <Alert variant="danger">
                      <div className="flex items-start gap-2">
                        <FiAlertCircle className="text-lg shrink-0 mt-0.5" />
                        <div>
                          <strong className="block">
                            Día no disponible: {preferredDateBlock.reason || 'Cerrado'}
                          </strong>
                          <span className="text-xs">
                            En esta fecha BunnyCure no atenderá público. Por favor escoge otra fecha disponible para tu reserva.
                          </span>
                        </div>
                      </div>
                    </Alert>
                  )}

                  {/* Alerta de Horarios parciales bloqueados */}
                  {!preferredDateBlock.blocked && preferredDateSlotBlocks.length > 0 && (
                    <Alert variant="warning">
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-1.5 font-semibold text-xs text-amber-900">
                          <span>⏰</span> Horarios con bloqueos registrados en esta fecha:
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {preferredDateSlotBlocks.map((b) => (
                            <Badge key={b.id} variant="warning" className="text-[11px]">
                              🚫 {b.startTime} a {b.endTime} hrs ({b.reason})
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </Alert>
                  )}

                  {/* Bloques Horarios */}
                  <div>
                    <label className="text-xs font-bold text-bunny-text-muted uppercase block mb-2">
                      Bloque Horario Deseado
                    </label>
                    <div className="grid grid-cols-1 gap-2">
                      {Object.entries(timeBlockLabels).map(([key, label]) => {
                        const blockTimeCheck =
                          key === 'MANANA'
                            ? checkTimeSlotConflict(preferredDate, '11:00', 90, unavailabilities)
                            : key === 'TARDE'
                            ? checkTimeSlotConflict(preferredDate, '15:00', 90, unavailabilities)
                            : checkTimeSlotConflict(preferredDate, '18:30', 90, unavailabilities);
                        const isBlockBlocked =
                          !preferredDateBlock.blocked && blockTimeCheck.hasConflict;

                        return (
                          <div
                            key={key}
                            onClick={() => {
                              if (isBlockBlocked) return;
                              setPreferredTimeBlock(key);
                              if (key === 'MANANA') setPreferredTimeExact('11:00');
                              if (key === 'TARDE') setPreferredTimeExact('15:00');
                              if (key === 'NOCHE') setPreferredTimeExact('18:30');
                            }}
                            className={`p-3 rounded-xl border flex items-center justify-between transition-all duration-150 ${
                              isBlockBlocked
                                ? 'border-dashed border-red-300 bg-red-50/50 opacity-60 cursor-not-allowed'
                                : preferredTimeBlock === key
                                ? 'border-bunny-primary bg-bunny-blush/40 shadow-xs cursor-pointer'
                                : 'border-bunny-border bg-white hover:border-bunny-border-strong cursor-pointer'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-bunny-cocoa">{label}</span>
                              {isBlockBlocked && (
                                <Badge variant="danger" className="text-[10px]">
                                  Bloqueado
                                </Badge>
                              )}
                            </div>
                            <input
                              type="radio"
                              name="timeBlock"
                              checked={preferredTimeBlock === key}
                              onChange={() => {}}
                              disabled={isBlockBlocked}
                              className="pointer-events-none text-bunny-primary accent-[#8c2a3e]"
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Selector de Hora Exacta */}
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs font-bold text-bunny-text-muted uppercase">
                        Hora Específica (Aproximada)
                      </span>
                      {exactTimeConflict.hasConflict && (
                        <span className="text-xs text-bunny-danger font-semibold flex items-center gap-1">
                          ⚠️ Horario bloqueado
                        </span>
                      )}
                    </div>

                    <Select
                      value={preferredTimeExact}
                      onChange={(e) => setPreferredTimeExact(e.target.value)}
                      error={exactTimeConflict.hasConflict ? exactTimeConflict.reason : undefined}
                    >
                      {[
                        '10:00',
                        '10:30',
                        '11:00',
                        '11:30',
                        '12:00',
                        '12:30',
                        '14:30',
                        '15:00',
                        '15:30',
                        '16:00',
                        '16:30',
                        '17:00',
                        '17:30',
                        '18:00',
                        '18:30',
                        '19:00',
                      ].map((slot) => {
                        const slotConflict = checkTimeSlotConflict(
                          preferredDate,
                          slot,
                          totalEstimatedDuration,
                          unavailabilities
                        );
                        return (
                          <option key={slot} value={slot} disabled={slotConflict.hasConflict}>
                            {slot} hrs{' '}
                            {slotConflict.hasConflict
                              ? `— 🚫 Bloqueado (${slotConflict.reason})`
                              : ''}
                          </option>
                        );
                      })}
                    </Select>
                  </div>

                  <div className="flex gap-2.5 pt-2">
                    <Button variant="outline" size="lg" onClick={() => setStep(1)}>
                      &larr; Volver
                    </Button>
                    <Button
                      variant="primary"
                      size="lg"
                      fullWidth
                      disabled={preferredDateBlock.blocked || exactTimeConflict.hasConflict}
                      onClick={() => setStep(3)}
                    >
                      {preferredDateBlock.blocked
                        ? 'Día Cerrado (Elige otra fecha)'
                        : exactTimeConflict.hasConflict
                        ? 'Horario Bloqueado'
                        : 'Continuar a tus Datos →'}
                    </Button>
                  </div>
                </div>
              )}

              {/* PASO 3: DATOS PERSONALES */}
              {step === 3 && (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="flex items-center gap-2">
                    <FiUser className="text-bunny-primary text-base" />
                    <h2 className="text-base font-bold text-bunny-cocoa">
                      Tus Datos de Contacto
                    </h2>
                  </div>

                  <Input
                    label="Nombre y Apellido *"
                    placeholder="Ej: Valentina Gómez"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                  />

                  <Input
                    type="tel"
                    label="Teléfono WhatsApp *"
                    placeholder="+56 9 8765 4321 o 987654321"
                    value={phone}
                    onChange={(e) => handlePhoneChange(e.target.value)}
                    helperText="Te contactaremos a este número para confirmar tu cita."
                    required
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Input
                      label="RUT (Opcional)"
                      placeholder="18.664.589-8"
                      value={rut}
                      onChange={(e) => setRut(e.target.value)}
                    />
                    <Input
                      label="Instagram (Opcional)"
                      placeholder="@tu_usuario"
                      value={instagram}
                      onChange={(e) => setInstagram(e.target.value)}
                    />
                  </div>

                  <Input
                    type="email"
                    label="Email (Opcional)"
                    placeholder="tu_email@ejemplo.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />

                  <Textarea
                    label="Notas / Diseño o Retiro Previo"
                    placeholder="Ej: Tengo esmalte permanente anterior para retirar, quiero diseño de flores..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={2}
                  />

                  <div className="flex gap-2.5 pt-2">
                    <Button
                      variant="outline"
                      size="lg"
                      onClick={() => setStep(2)}
                      disabled={submitting}
                    >
                      &larr; Volver
                    </Button>
                    <Button
                      type="submit"
                      variant="primary"
                      size="lg"
                      fullWidth
                      isLoading={submitting}
                      loadingText="Enviando Solicitud..."
                    >
                      ✨ Confirmar y Enviar Solicitud
                    </Button>
                  </div>
                </form>
              )}
            </Card.Body>
          </Card>
        )}
      </div>
    </div>
  );
};

export default PublicBookingPage;
