import React, { useState } from 'react';
import { Card, Row, Col, Form, Button, Badge, Alert } from 'react-bootstrap';
import { 
  FiCalendar, 
  FiClock, 
  FiTrash2, 
  FiPlus, 
  FiBell, 
  FiTag, 
  FiDroplet,
} from 'react-icons/fi';
import {
  ScheduleUnavailability,
  UnavailabilityColorConfig,
  UnavailabilityNotificationConfig,
  UnavailabilityType,
  QUICK_REASONS,
} from '../../types/unavailability.types';

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
    <Card className="shadow-sm border-0 mb-4" style={{ borderRadius: '16px', overflow: 'hidden' }}>
      <Card.Header 
        className="d-flex justify-content-between align-items-center py-3"
        style={{
          background: 'linear-gradient(135deg, #fdf4f2 0%, #fae6e2 100%)',
          borderBottom: '1px solid #eed0c5',
        }}
      >
        <div className="d-flex align-items-center gap-2">
          <div 
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: '#8c2a3e',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '18px',
            }}
          >
            <FiCalendar />
          </div>
          <div>
            <h5 className="mb-0 fw-bold" style={{ color: '#422314', fontSize: '1.05rem' }}>
              Bloqueos de Agenda y Días No Laborables
            </h5>
            <small style={{ color: '#825942' }}>
              Bloquea semanas completas, días festivos o franjas horarias con comentarios
            </small>
          </div>
        </div>

        <Button
          variant="outline-secondary"
          size="sm"
          onClick={() => setShowConfig(!showConfig)}
          style={{ borderRadius: '8px', fontSize: '0.85rem' }}
        >
          {showConfig ? 'Ocultar Opciones' : '🎨 Personalizar Colores y Avisos'}
        </Button>
      </Card.Header>

      <Card.Body className="p-4">
        {/* Panel de Configuración de Colores y Notificaciones (Desplegable) */}
        {showConfig && (
          <div 
            className="p-3 mb-4 rounded-3 border"
            style={{ background: '#fcf8f6', borderColor: '#f0ded6' }}
          >
            <Row className="g-3">
              <Col md={6}>
                <h6 className="fw-bold d-flex align-items-center gap-2 mb-2" style={{ color: '#5c3d2e' }}>
                  <FiDroplet /> Colores de Visualización en Calendarios
                </h6>
                <div className="mb-2 d-flex align-items-center gap-3">
                  <div className="d-flex align-items-center gap-2">
                    <Form.Control
                      type="color"
                      value={colors.fullDayColor}
                      onChange={(e) => onColorsChange({ ...colors, fullDayColor: e.target.value })}
                      style={{ width: '42px', height: '36px', padding: '2px', cursor: 'pointer' }}
                    />
                    <div>
                      <div className="small fw-semibold">Día Completo / Rango</div>
                      <small className="text-muted">Ej: Vacaciones, Feriados</small>
                    </div>
                  </div>
                </div>

                <div className="d-flex align-items-center gap-2">
                  <Form.Control
                    type="color"
                    value={colors.timeSlotColor}
                    onChange={(e) => onColorsChange({ ...colors, timeSlotColor: e.target.value })}
                    style={{ width: '42px', height: '36px', padding: '2px', cursor: 'pointer' }}
                  />
                  <div>
                    <div className="small fw-semibold">Horario Específico</div>
                    <small className="text-muted">Ej: Médico, Trámites (13:00 - 16:00)</small>
                  </div>
                </div>
              </Col>

              <Col md={6}>
                <h6 className="fw-bold d-flex align-items-center gap-2 mb-2" style={{ color: '#5c3d2e' }}>
                  <FiBell /> Notificaciones Push PWA
                </h6>
                <Form.Check
                  type="switch"
                  id="notif-enabled"
                  label="Habilitar avisos PWA para bloqueos"
                  checked={notifications.enabled}
                  onChange={(e) => onNotificationsChange({ ...notifications, enabled: e.target.checked })}
                  className="mb-2 small fw-semibold"
                />
                <Form.Check
                  type="switch"
                  id="notif-24h"
                  label="Avisar 24 horas antes del evento"
                  disabled={!notifications.enabled}
                  checked={notifications.notify24HoursBefore}
                  onChange={(e) => onNotificationsChange({ ...notifications, notify24HoursBefore: e.target.checked })}
                  className="mb-1 small"
                />
                <Form.Check
                  type="switch"
                  id="notif-1h"
                  label="Avisar 1 hora antes del horario bloqueado"
                  disabled={!notifications.enabled}
                  checked={notifications.notify1HourBefore}
                  onChange={(e) => onNotificationsChange({ ...notifications, notify1HourBefore: e.target.checked })}
                  className="small"
                />
              </Col>
            </Row>
          </div>
        )}

        {/* Selector de Tipo de Bloqueo */}
        <div className="d-flex gap-2 mb-3">
          <Button
            variant={blockType === 'FULL_DAY' ? 'primary' : 'outline-secondary'}
            onClick={() => setBlockType('FULL_DAY')}
            className="d-flex align-items-center gap-2"
            style={{ borderRadius: '10px', fontSize: '0.9rem' }}
          >
            <FiCalendar /> Día Completo o Semana / Vacaciones
          </Button>
          <Button
            variant={blockType === 'TIME_SLOT' ? 'primary' : 'outline-secondary'}
            onClick={() => setBlockType('TIME_SLOT')}
            className="d-flex align-items-center gap-2"
            style={{ borderRadius: '10px', fontSize: '0.9rem' }}
          >
            <FiClock /> Franja Horaria Específica
          </Button>
        </div>

        {/* Formulario de Alta de Bloqueo */}
        <div 
          className="p-3 mb-4 rounded-3"
          style={{ background: '#fff9f7', border: '1px solid #f2dfd8' }}
        >
          <Row className="g-3 align-items-end">
            {blockType === 'FULL_DAY' ? (
              <>
                <Col xs={12} sm={6} md={3}>
                  <Form.Label className="small fw-semibold text-muted mb-1">
                    Fecha Inicio / Día
                  </Form.Label>
                  <Form.Control
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    size="sm"
                    style={{ borderRadius: '8px' }}
                  />
                </Col>
                <Col xs={12} sm={6} md={3}>
                  <Form.Label className="small fw-semibold text-muted mb-1">
                    Fecha Fin (Opcional si es 1 día)
                  </Form.Label>
                  <Form.Control
                    type="date"
                    value={endDate}
                    min={startDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    size="sm"
                    placeholder="Mismo día"
                    style={{ borderRadius: '8px' }}
                  />
                </Col>
              </>
            ) : (
              <>
                <Col xs={12} sm={6} md={3}>
                  <Form.Label className="small fw-semibold text-muted mb-1">
                    Fecha del Bloqueo
                  </Form.Label>
                  <Form.Control
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    size="sm"
                    style={{ borderRadius: '8px' }}
                  />
                </Col>
                <Col xs={6} sm={3} md={2}>
                  <Form.Label className="small fw-semibold text-muted mb-1">
                    Hora Inicio
                  </Form.Label>
                  <Form.Control
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    size="sm"
                    style={{ borderRadius: '8px' }}
                  />
                </Col>
                <Col xs={6} sm={3} md={2}>
                  <Form.Label className="small fw-semibold text-muted mb-1">
                    Hora Fin
                  </Form.Label>
                  <Form.Control
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    size="sm"
                    style={{ borderRadius: '8px' }}
                  />
                </Col>
              </>
            )}

            <Col xs={12} md={blockType === 'FULL_DAY' ? 4 : 3}>
              <Form.Label className="small fw-semibold text-muted mb-1">
                Motivo / Comentario
              </Form.Label>
              <Form.Control
                type="text"
                placeholder={blockType === 'FULL_DAY' ? 'Ej: Vacaciones, Feriado' : 'Ej: Médico, Trámite'}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                size="sm"
                style={{ borderRadius: '8px' }}
              />
            </Col>

            <Col xs={12} md={2} className="d-grid">
              <Button
                variant="primary"
                size="sm"
                onClick={handleAdd}
                className="d-flex align-items-center justify-content-center gap-1"
                style={{ borderRadius: '8px', height: '34px' }}
              >
                <FiPlus /> Registrar
              </Button>
            </Col>
          </Row>

          {/* Chips de Sugerencias de Motivo */}
          <div className="d-flex flex-wrap gap-1 align-items-center mt-2 pt-1">
            <span className="small text-muted me-1 d-flex align-items-center gap-1">
              <FiTag size={12} /> Sugerencias:
            </span>
            {QUICK_REASONS.map((r) => (
              <Badge
                key={r}
                bg="light"
                text="dark"
                className="border"
                style={{
                  cursor: 'pointer',
                  fontWeight: 500,
                  fontSize: '0.75rem',
                  padding: '4px 8px',
                  borderRadius: '6px',
                  backgroundColor: reason === r ? '#fce8e4' : '#fff',
                  borderColor: reason === r ? '#c9897a' : '#eeddd6',
                }}
                onClick={() => setReason(r)}
              >
                {r}
              </Badge>
            ))}
          </div>
        </div>

        {/* Lista de Bloqueos Registrados */}
        <h6 className="fw-bold mb-3 d-flex align-items-center justify-content-between" style={{ color: '#422314' }}>
          <span>📋 Registros de Bloqueos ({unavailabilities.length})</span>
          {unavailabilities.length > 0 && (
            <small className="text-muted fw-normal" style={{ fontSize: '0.8rem' }}>
              Se reflejan automáticamente en Calendario y Dashboard
            </small>
          )}
        </h6>

        {unavailabilities.length === 0 ? (
          <Alert variant="light" className="text-center py-4 border rounded-3 mb-0">
            <div className="text-muted mb-1" style={{ fontSize: '1.5rem' }}>🗓️</div>
            <div className="fw-semibold text-muted">No hay bloqueos ni días cerrados configurados</div>
            <small className="text-muted">Utiliza el formulario superior para programar vacaciones, descansos o citas médicas.</small>
          </Alert>
        ) : (
          <div 
            className="d-flex flex-column gap-2"
            style={{ maxHeight: '350px', overflowY: 'auto', paddingRight: '4px' }}
          >
            {unavailabilities.map((item) => {
              const isFullDay = item.type === 'FULL_DAY';
              const isMultiDay = isFullDay && item.endDate && item.endDate !== item.startDate;

              return (
                <div
                  key={item.id}
                  className="d-flex justify-content-between align-items-center p-3 rounded-3 border"
                  style={{
                    background: isFullDay ? '#fff5f7' : '#fffaf2',
                    borderColor: isFullDay ? '#ffd0db' : '#fce3c7',
                    borderLeft: `5px solid ${isFullDay ? '#f87171' : '#f59e0b'}`,
                  }}
                >
                  <div className="d-flex align-items-start gap-3">
                    <div
                      style={{
                        padding: '6px 10px',
                        borderRadius: '8px',
                        background: isFullDay ? '#ffe0e6' : '#fef3c7',
                        color: isFullDay ? '#991b1b' : '#92400e',
                        fontWeight: 700,
                        fontSize: '0.8rem',
                        textAlign: 'center',
                        minWidth: '70px',
                      }}
                    >
                      {isFullDay ? (isMultiDay ? 'RANGO' : 'DÍA COMPLETO') : 'HORARIO'}
                    </div>

                    <div>
                      <div className="fw-bold" style={{ color: '#2d1a12', fontSize: '0.95rem' }}>
                        {item.reason}
                      </div>
                      <div className="small text-muted d-flex align-items-center gap-2 mt-1">
                        <span className="d-flex align-items-center gap-1">
                          <FiCalendar size={13} />
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
                          <span className="d-flex align-items-center gap-1 fw-semibold" style={{ color: '#b45309' }}>
                            <FiClock size={13} /> {item.startTime} a {item.endTime} hrs
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <Button
                    variant="outline-danger"
                    size="sm"
                    onClick={() => handleDelete(item.id)}
                    className="p-1 px-2 border-0"
                    title="Eliminar bloqueo"
                  >
                    <FiTrash2 size={16} />
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </Card.Body>
    </Card>
  );
};
