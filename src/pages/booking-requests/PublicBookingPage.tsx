import React, { useEffect, useState, useMemo } from 'react';
import { Container, Row, Col, Card, Form, Button, Badge, Spinner, Alert, ProgressBar } from 'react-bootstrap';
import { FiCalendar, FiClock, FiUser, FiCheckCircle } from 'react-icons/fi';
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

export const PublicBookingPage: React.FC = () => {
  const isEnabled = getPublicBookingEnabled();

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
    MANANA: 'Mañana (10:00 - 13:30)',
    TARDE: 'Tarde (14:30 - 18:00)',
    NOCHE: 'Noche (18:30 - 20:30)',
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !phone.trim() || selectedServiceIds.length === 0) {
      setSubmitError('Por favor completa tu nombre, teléfono y selecciona al menos un servicio.');
      return;
    }

    if (rut.trim() && !isValidRutFormat(rut)) {
      setSubmitError('El RUT ingresado no tiene un formato válido.');
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
      selectedServices.length > 1 ? `Servicios adicionales: ${selectedServices.slice(1).map((s) => s.name).join(', ')}` : '',
      notes.trim() ? `Notas: ${notes.trim()}` : '',
    ].filter(Boolean).join(' | ');

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
      setSubmitError(error.message || 'Ocurrió un error al procesar tu solicitud. Por favor intenta nuevamente.');
    } finally {
      setSubmitting(false);
    }
  };

  const getMinDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(180deg, #fdf6f0 0%, #faede8 100%)',
        padding: '24px 12px 60px 12px',
        color: '#422314',
      }}
    >
      <Container style={{ maxWidth: '640px' }}>
        {/* Cabecera de Marca BunnyCure */}
        <div className="text-center mb-4">
          <div
            className="d-inline-flex align-items-center justify-content-center mb-2 shadow-sm"
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '20px',
              background: '#fff',
              border: '2px solid #eed0c5',
              fontSize: '32px',
            }}
          >
            🐰
          </div>
          <h2 className="fw-bold mb-1" style={{ color: '#8c2a3e', letterSpacing: '-0.5px' }}>
            BunnyCure
          </h2>
          <p className="text-muted mb-0" style={{ fontSize: '14.5px' }}>
            Estudio de Manicure &amp; Cuidado de Uñas
          </p>
        </div>

        {/* CASO: AGENDAMIENTO DESHABILITADO */}
        {!isEnabled ? (
          <Card className="border-0 shadow-sm text-center p-4 p-md-5" style={{ borderRadius: '20px', background: '#fff' }}>
            <Card.Body>
              <div className="mb-3" style={{ fontSize: '48px' }}>
                🌸
              </div>
              <h4 className="fw-bold mb-3" style={{ color: '#8c2a3e' }}>
                Agendamiento Online en Pausa
              </h4>
              <p className="text-muted mb-4" style={{ fontSize: '15px', lineHeight: 1.6 }}>
                En este momento la agenda online se encuentra temporalmente en mantención o sin cupos disponibles en la web.
                <br />
                <strong>¡Pero no te preocupes!</strong> Puedes escribirnos directamente por WhatsApp para coordinar tu cita o consultar disponibilidad.
              </p>

              <Button
                as="a"
                href={`https://wa.me/${OFFICIAL_WHATSAPP_PHONE.replace(/\D/g, '')}?text=Hola%20BunnyCure!%20%F0%9F%90%B0%20Quisiera%20consultar%20por%20disponibilidad%20de%20horas%20para%20manicure.`}
                target="_blank"
                rel="noopener noreferrer"
                size="lg"
                className="w-100 py-3 fw-bold d-flex align-items-center justify-content-center gap-2 shadow-sm"
                style={{ background: '#25D366', borderColor: '#25D366', borderRadius: '12px' }}
              >
                <FaWhatsapp size={22} /> Escribir al WhatsApp Oficial
              </Button>
              <div className="mt-3 text-muted small">
                Atención directa al {OFFICIAL_WHATSAPP_DISPLAY}
              </div>
            </Card.Body>
          </Card>
        ) : step === 4 ? (
          /* CASO: CONFIRMACIÓN EXITOSA */
          <Card className="border-0 shadow-sm text-center p-4 p-md-5" style={{ borderRadius: '20px', background: '#fff' }}>
            <Card.Body>
              <div
                className="d-inline-flex align-items-center justify-content-center mb-3 text-success shadow-sm"
                style={{
                  width: '72px',
                  height: '72px',
                  borderRadius: '50%',
                  background: '#f0fdf4',
                  border: '2px solid #bbf7d0',
                }}
              >
                <FiCheckCircle size={40} />
              </div>

              <h4 className="fw-bold mb-2" style={{ color: '#14532d' }}>
                ¡Solicitud de Reserva Recibida!
              </h4>
              <p className="text-muted mb-4" style={{ fontSize: '14.5px' }}>
                Muchas gracias, <strong>{fullName}</strong>. Hemos recibido tu solicitud para el{' '}
                <strong>{preferredDate}</strong> ({preferredTimeExact} hrs).
              </p>

              <div className="p-3 rounded mb-4 text-start" style={{ background: '#fdf4f2', border: '1px solid #eed0c5' }}>
                <h6 className="fw-bold mb-2" style={{ color: '#8c2a3e' }}>
                  Resumen de tu Solicitud #{createdRequestId}:
                </h6>
                <div className="small mb-1">
                  <strong>Servicio(s):</strong> {selectedServices.map((s) => s.name).join(' + ')}
                </div>
                <div className="small mb-1">
                  <strong>Valor Estimado:</strong> {formatCurrencyCLP(totalEstimatedPrice)}
                </div>
                <div className="small mb-1">
                  <strong>Fecha y Hora:</strong> {preferredDate} a las {preferredTimeExact} hrs ({timeBlockLabels[preferredTimeBlock]})
                </div>
                <div className="small text-muted mt-2 pt-2 border-top">
                  ✨ Te enviaremos la confirmación definitiva a tu WhatsApp <strong>{phone}</strong> en breve.
                </div>
              </div>

              <Button
                as="a"
                href={`https://wa.me/${OFFICIAL_WHATSAPP_PHONE.replace(/\D/g, '')}?text=Hola%20BunnyCure!%20Acabo%20de%20enviar%20mi%20solicitud%20de%20reserva%20%23${createdRequestId}%20a%20nombre%20de%20${encodeURIComponent(fullName)}.`}
                target="_blank"
                rel="noopener noreferrer"
                size="lg"
                className="w-100 py-3 fw-bold d-flex align-items-center justify-content-center gap-2 shadow-sm mb-2"
                style={{ background: '#25D366', borderColor: '#25D366', borderRadius: '12px' }}
              >
                <FaWhatsapp size={22} /> Notificar por WhatsApp
              </Button>

              <Button
                variant="outline-secondary"
                size="sm"
                className="mt-2"
                onClick={() => {
                  setStep(1);
                  setFullName('');
                  setPhone('');
                  setNotes('');
                }}
                style={{ borderRadius: '8px' }}
              >
                Realizar otra reserva
              </Button>
            </Card.Body>
          </Card>
        ) : (
          /* FORMULARIO EN PASOS */
          <Card className="border-0 shadow-sm" style={{ borderRadius: '20px', background: '#fff', overflow: 'hidden' }}>
            {/* Barra de Progreso */}
            <div className="p-3 border-bottom bg-light">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <span className="small fw-bold" style={{ color: '#8c2a3e' }}>
                  Paso {step} de 3:{' '}
                  {step === 1 ? 'Elige tu Servicio' : step === 2 ? 'Fecha y Horario' : 'Tus Datos'}
                </span>
                <span className="small text-muted">{step === 1 ? '33%' : step === 2 ? '66%' : '100%'}</span>
              </div>
              <ProgressBar
                now={step === 1 ? 33 : step === 2 ? 66 : 100}
                style={{ height: '6px', background: '#eed0c5' }}
                variant="danger"
              />
            </div>

            <Card.Body className="p-3 p-md-4">
              {submitError && (
                <Alert variant="danger" className="py-2 small mb-3">
                  {submitError}
                </Alert>
              )}

              {/* PASO 1: SELECCIÓN DE SERVICIOS */}
              {step === 1 && (
                <div>
                  <div className="d-flex align-items-center gap-2 mb-3">
                    <FaRegClock className="text-danger" size={18} />
                    <h5 className="fw-bold mb-0" style={{ color: '#422314', fontSize: '1.1rem' }}>
                      Selecciona el servicio que deseas
                    </h5>
                  </div>

                  {loadingServices ? (
                    <div className="text-center py-5">
                      <Spinner animation="border" variant="danger" />
                      <p className="text-muted small mt-2">Cargando catálogo de servicios...</p>
                    </div>
                  ) : services.length === 0 ? (
                    <div className="text-center py-4 text-muted">
                      No hay servicios disponibles en este momento.
                    </div>
                  ) : (
                    <div className="d-flex flex-column gap-2 mb-3">
                      {services.map((srv) => {
                        const isSelected = selectedServiceIds.includes(srv.id);
                        return (
                          <div
                            key={srv.id}
                            onClick={() => handleToggleService(srv.id)}
                            className="p-3 rounded d-flex justify-content-between align-items-center"
                            style={{
                              border: isSelected ? '2px solid #8c2a3e' : '1px solid #eed0c5',
                              background: isSelected ? '#fdf4f2' : '#fff',
                              cursor: 'pointer',
                              transition: 'all 0.15s ease',
                            }}
                          >
                            <div className="pe-2">
                              <div className="d-flex align-items-center gap-2">
                                <Form.Check
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => {}}
                                  style={{ pointerEvents: 'none' }}
                                />
                                <span className="fw-bold" style={{ color: '#422314', fontSize: '15px' }}>
                                  {srv.name}
                                </span>
                              </div>
                              {srv.description && (
                                <p className="text-muted small mb-0 mt-1" style={{ fontSize: '12.5px', paddingLeft: '24px' }}>
                                  {srv.description}
                                </p>
                              )}
                              <div className="d-flex align-items-center gap-2 mt-1" style={{ paddingLeft: '24px' }}>
                                <Badge bg="light" text="dark" style={{ border: '1px solid #eed0c5', fontSize: '11px' }}>
                                  <FiClock className="me-1" /> {srv.durationMinutes || 60} min
                                </Badge>
                              </div>
                            </div>

                            <div className="text-end">
                              <div className="fw-bold" style={{ color: '#8c2a3e', fontSize: '16px' }}>
                                {formatCurrencyCLP(srv.price || 0)}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Resumen flotante */}
                  {selectedServices.length > 0 && (
                    <div className="p-3 rounded mb-3" style={{ background: '#fdf4f2', border: '1px dashed #eed0c5' }}>
                      <div className="d-flex justify-content-between align-items-center">
                        <span className="small text-muted">
                          {selectedServices.length} servicio{selectedServices.length !== 1 ? 's' : ''} (~{totalEstimatedDuration} min):
                        </span>
                        <strong className="fw-bold" style={{ color: '#8c2a3e', fontSize: '17px' }}>
                          Total: {formatCurrencyCLP(totalEstimatedPrice)}
                        </strong>
                      </div>
                    </div>
                  )}

                  <Button
                    variant="primary"
                    size="lg"
                    className="w-100 py-2 fw-bold shadow-sm"
                    disabled={selectedServiceIds.length === 0}
                    onClick={() => setStep(2)}
                    style={{ background: '#8c2a3e', borderColor: '#8c2a3e', borderRadius: '12px' }}
                  >
                    Continuar a Fecha y Hora &rarr;
                  </Button>
                </div>
              )}

              {/* PASO 2: FECHA Y HORARIO */}
              {step === 2 && (
                <div>
                  <div className="d-flex align-items-center gap-2 mb-3">
                    <FiCalendar className="text-danger" size={18} />
                    <h5 className="fw-bold mb-0" style={{ color: '#422314', fontSize: '1.1rem' }}>
                      ¿Cuándo te gustaría venir?
                    </h5>
                  </div>

                  <Form.Group className="mb-3">
                    <Form.Label className="fw-bold small text-muted">FECHA PREFERIDA</Form.Label>
                    <Form.Control
                      type="date"
                      min={getMinDate()}
                      value={preferredDate}
                      onChange={(e) => setPreferredDate(e.target.value)}
                      size="lg"
                      style={{ borderRadius: '10px', borderColor: '#eed0c5' }}
                    />
                  </Form.Group>

                  <Form.Group className="mb-3">
                    <Form.Label className="fw-bold small text-muted">BLOQUE HORARIO DESEADO</Form.Label>
                    <Row className="g-2">
                      {Object.entries(timeBlockLabels).map(([key, label]) => (
                        <Col xs={12} key={key}>
                          <div
                            onClick={() => {
                              setPreferredTimeBlock(key);
                              if (key === 'MANANA') setPreferredTimeExact('11:00');
                              if (key === 'TARDE') setPreferredTimeExact('15:00');
                              if (key === 'NOCHE') setPreferredTimeExact('18:30');
                            }}
                            className="p-3 rounded d-flex align-items-center justify-content-between"
                            style={{
                              border: preferredTimeBlock === key ? '2px solid #8c2a3e' : '1px solid #eed0c5',
                              background: preferredTimeBlock === key ? '#fdf4f2' : '#fff',
                              cursor: 'pointer',
                            }}
                          >
                            <span className="fw-semibold" style={{ fontSize: '14px' }}>
                              {label}
                            </span>
                            <Form.Check
                              type="radio"
                              name="timeBlock"
                              checked={preferredTimeBlock === key}
                              onChange={() => {}}
                              style={{ pointerEvents: 'none' }}
                            />
                          </div>
                        </Col>
                      ))}
                    </Row>
                  </Form.Group>

                  <Form.Group className="mb-4">
                    <Form.Label className="fw-bold small text-muted">HORA ESPECÍFICA (APROXIMADA)</Form.Label>
                    <Form.Select
                      value={preferredTimeExact}
                      onChange={(e) => setPreferredTimeExact(e.target.value)}
                      size="lg"
                      style={{ borderRadius: '10px', borderColor: '#eed0c5' }}
                    >
                      <option value="10:00">10:00 hrs</option>
                      <option value="10:30">10:30 hrs</option>
                      <option value="11:00">11:00 hrs</option>
                      <option value="11:30">11:30 hrs</option>
                      <option value="12:00">12:00 hrs</option>
                      <option value="12:30">12:30 hrs</option>
                      <option value="14:30">14:30 hrs</option>
                      <option value="15:00">15:00 hrs</option>
                      <option value="15:30">15:30 hrs</option>
                      <option value="16:00">16:00 hrs</option>
                      <option value="16:30">16:30 hrs</option>
                      <option value="17:00">17:00 hrs</option>
                      <option value="17:30">17:30 hrs</option>
                      <option value="18:00">18:00 hrs</option>
                      <option value="18:30">18:30 hrs</option>
                      <option value="19:00">19:00 hrs</option>
                    </Form.Select>
                  </Form.Group>

                  <div className="d-flex gap-2">
                    <Button
                      variant="outline-secondary"
                      size="lg"
                      onClick={() => setStep(1)}
                      style={{ borderRadius: '12px' }}
                    >
                      &larr; Volver
                    </Button>
                    <Button
                      variant="primary"
                      size="lg"
                      className="w-100 fw-bold shadow-sm"
                      onClick={() => setStep(3)}
                      style={{ background: '#8c2a3e', borderColor: '#8c2a3e', borderRadius: '12px' }}
                    >
                      Continuar a tus Datos &rarr;
                    </Button>
                  </div>
                </div>
              )}

              {/* PASO 3: DATOS PERSONALES */}
              {step === 3 && (
                <Form onSubmit={handleSubmit}>
                  <div className="d-flex align-items-center gap-2 mb-3">
                    <FiUser className="text-danger" size={18} />
                    <h5 className="fw-bold mb-0" style={{ color: '#422314', fontSize: '1.1rem' }}>
                      Tus Datos de Contacto
                    </h5>
                  </div>

                  <Form.Group className="mb-3">
                    <Form.Label className="fw-bold small text-muted">NOMBRE Y APELLIDO *</Form.Label>
                    <Form.Control
                      type="text"
                      placeholder="Ej: Valentina Gómez"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                      size="lg"
                      style={{ borderRadius: '10px', borderColor: '#eed0c5' }}
                    />
                  </Form.Group>

                  <Form.Group className="mb-3">
                    <Form.Label className="fw-bold small text-muted">TELÉFONO WHATSAPP *</Form.Label>
                    <Form.Control
                      type="tel"
                      placeholder="+56 9 8765 4321 o 987654321"
                      value={phone}
                      onChange={(e) => handlePhoneChange(e.target.value)}
                      required
                      size="lg"
                      style={{ borderRadius: '10px', borderColor: '#eed0c5' }}
                    />
                    <Form.Text className="text-muted small">
                      Te contactaremos a este número para confirmar tu cita.
                    </Form.Text>
                  </Form.Group>

                  <Row className="g-2 mb-3">
                    <Col xs={12} sm={6}>
                      <Form.Group>
                        <Form.Label className="fw-bold small text-muted">RUT (OPCIONAL)</Form.Label>
                        <Form.Control
                          type="text"
                          placeholder="18.664.589-8 o 18664589-8"
                          value={rut}
                          onChange={(e) => setRut(e.target.value)}
                          style={{ borderRadius: '10px', borderColor: '#eed0c5' }}
                        />
                      </Form.Group>
                    </Col>
                    <Col xs={12} sm={6}>
                      <Form.Group>
                        <Form.Label className="fw-bold small text-muted">INSTAGRAM (OPCIONAL)</Form.Label>
                        <Form.Control
                          type="text"
                          placeholder="@tu_usuario"
                          value={instagram}
                          onChange={(e) => setInstagram(e.target.value)}
                          style={{ borderRadius: '10px', borderColor: '#eed0c5' }}
                        />
                      </Form.Group>
                    </Col>
                  </Row>

                  <Form.Group className="mb-3">
                    <Form.Label className="fw-bold small text-muted">EMAIL (OPCIONAL)</Form.Label>
                    <Form.Control
                      type="email"
                      placeholder="tu_email@ejemplo.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      style={{ borderRadius: '10px', borderColor: '#eed0c5' }}
                    />
                  </Form.Group>

                  <Form.Group className="mb-4">
                    <Form.Label className="fw-bold small text-muted">NOTAS / DISEÑO O RETIRO PREVIO</Form.Label>
                    <Form.Control
                      as="textarea"
                      rows={2}
                      placeholder="Ej: Tengo esmalte permanente anterior para retirar, quiero diseño de flores..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      style={{ borderRadius: '10px', borderColor: '#eed0c5' }}
                    />
                  </Form.Group>

                  <div className="d-flex gap-2">
                    <Button
                      variant="outline-secondary"
                      size="lg"
                      onClick={() => setStep(2)}
                      disabled={submitting}
                      style={{ borderRadius: '12px' }}
                    >
                      &larr; Volver
                    </Button>
                    <Button
                      type="submit"
                      variant="primary"
                      size="lg"
                      className="w-100 fw-bold shadow-sm"
                      disabled={submitting}
                      style={{ background: '#8c2a3e', borderColor: '#8c2a3e', borderRadius: '12px' }}
                    >
                      {submitting ? (
                        <>
                          <Spinner animation="border" size="sm" className="me-2" />
                          Enviando Solicitud...
                        </>
                      ) : (
                        '✨ Confirmar y Enviar Solicitud'
                      )}
                    </Button>
                  </div>
                </Form>
              )}
            </Card.Body>
          </Card>
        )}
      </Container>
    </div>
  );
};

export default PublicBookingPage;
