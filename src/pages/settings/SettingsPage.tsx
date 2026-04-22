/**
 * Página de Configuración del Negocio
 * Permite al administrador configurar información del negocio, horarios, notificaciones.
 * Ahora con persistencia en servidor vía API
 */

import { useState, useEffect, useCallback } from 'react';
import { Container, Row, Col, Card, Form, Button, Alert, Spinner, Badge } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { FiSave, FiSettings } from 'react-icons/fi';
import { FaWhatsapp, FaBell } from 'react-icons/fa';
import DashboardLayout from '../../components/common/DashboardLayout';
import { useToast } from '../../hooks/useToast';
import { settingsApi, SettingsData } from '../../api/settings.api';
import { useNotificationPermission } from '../../hooks/useNotificationPermission';
import { NotificationTemplatesSection } from '../../components/settings/NotificationTemplatesSection';
import { CALENDAR_DISPLAY_STORAGE_KEY, DEFAULT_CALENDAR_DISPLAY_CONFIG } from '@/utils/calendarDisplay';

interface ScheduleBlock {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  reason: string;
}

interface BusinessSettings {
  businessName: string;
  email: string;
  phone: string;
  address: string;
  workingHours: {
    monday: { start: string; end: string; enabled: boolean };
    tuesday: { start: string; end: string; enabled: boolean };
    wednesday: { start: string; end: string; enabled: boolean };
    thursday: { start: string; end: string; enabled: boolean };
    friday: { start: string; end: string; enabled: boolean };
    saturday: { start: string; end: string; enabled: boolean };
    sunday: { start: string; end: string; enabled: boolean };
  };
  appointmentDuration: number;
  notificationsEnabled: boolean;
  whatsappEnabled: boolean;
  whatsappPhone: string;
  reminderStrategy: 'TWO_HOURS' | 'MORNING' | 'DAY_BEFORE' | 'BOTH';
  whatsappHandoffEnabled: boolean;
  whatsappHumanNumber: string;
  whatsappHumanDisplayName: string;
  whatsappHandoffClientMessage: string;
  whatsappHandoffAdminPrefill: string;
  holidays: string[];
  scheduleBlocks: ScheduleBlock[];
  calendarDisplay: {
    morning: { start: string; end: string; color: string };
    afternoon: { start: string; end: string; color: string };
    night: { start: string; end: string; color: string };
  };
}

const defaultSettings: BusinessSettings = {
  businessName: 'BunnyCure',
  email: 'info@bunnycure.com',
  phone: '+56912345678',
  address: 'Santiago, Chile',
  workingHours: {
    monday: { start: '09:00', end: '18:00', enabled: true },
    tuesday: { start: '09:00', end: '18:00', enabled: true },
    wednesday: { start: '09:00', end: '18:00', enabled: true },
    thursday: { start: '09:00', end: '18:00', enabled: true },
    friday: { start: '09:00', end: '18:00', enabled: true },
    saturday: { start: '09:00', end: '14:00', enabled: true },
    sunday: { start: '10:00', end: '14:00', enabled: false },
  },
  appointmentDuration: 60,
  notificationsEnabled: true,
  whatsappEnabled: false,
  whatsappPhone: '',
  reminderStrategy: 'TWO_HOURS',
  whatsappHandoffEnabled: false,
  whatsappHumanNumber: '',
  whatsappHumanDisplayName: 'Equipo BunnyCure',
  whatsappHandoffClientMessage: 'Te estoy conectando con un miembro de nuestro equipo...',
  whatsappHandoffAdminPrefill: 'Hola, el cliente {customer} necesita ayuda con {service}',
  holidays: [],
  scheduleBlocks: [],
  calendarDisplay: {
    morning: {
      start: DEFAULT_CALENDAR_DISPLAY_CONFIG.morning.start,
      end: DEFAULT_CALENDAR_DISPLAY_CONFIG.morning.end,
      color: DEFAULT_CALENDAR_DISPLAY_CONFIG.morning.color,
    },
    afternoon: {
      start: DEFAULT_CALENDAR_DISPLAY_CONFIG.afternoon.start,
      end: DEFAULT_CALENDAR_DISPLAY_CONFIG.afternoon.end,
      color: DEFAULT_CALENDAR_DISPLAY_CONFIG.afternoon.color,
    },
    night: {
      start: DEFAULT_CALENDAR_DISPLAY_CONFIG.night.start,
      end: DEFAULT_CALENDAR_DISPLAY_CONFIG.night.end,
      color: DEFAULT_CALENDAR_DISPLAY_CONFIG.night.color,
    },
  },
};

const dayNames: Record<keyof BusinessSettings['workingHours'], string> = {
  monday: 'Lunes',
  tuesday: 'Martes',
  wednesday: 'Miércoles',
  thursday: 'Jueves',
  friday: 'Viernes',
  saturday: 'Sábado',
  sunday: 'Domingo',
};

export default function SettingsPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const [settings, setSettings] = useState<BusinessSettings>(defaultSettings);
  const [loading, setLoading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const { permission, isSupported, requestPermission, sendTestNotification } = useNotificationPermission();

  const loadSettings = useCallback(async () => {
    setLoading(true);
    try {
      const serverSettings = await settingsApi.getAll();
      
      // Convertir de SettingsData a BusinessSettings
      const localCalendarRaw = localStorage.getItem(CALENDAR_DISPLAY_STORAGE_KEY);
      let localCalendar: BusinessSettings['calendarDisplay'] | null = null;
      if (localCalendarRaw) {
        try {
          localCalendar = JSON.parse(localCalendarRaw) as BusinessSettings['calendarDisplay'];
        } catch {
          localStorage.removeItem(CALENDAR_DISPLAY_STORAGE_KEY);
        }
      }

      const mappedSettings: BusinessSettings = {
        businessName: serverSettings.businessName || defaultSettings.businessName,
        email: serverSettings.businessEmail || defaultSettings.email,
        phone: serverSettings.businessPhone || defaultSettings.phone,
        address: serverSettings.businessAddress || defaultSettings.address,
        workingHours: {
          monday: {
            enabled: serverSettings.mondayEnabled ?? defaultSettings.workingHours.monday.enabled,
            start: serverSettings.mondayStart || defaultSettings.workingHours.monday.start,
            end: serverSettings.mondayEnd || defaultSettings.workingHours.monday.end,
          },
          tuesday: {
            enabled: serverSettings.tuesdayEnabled ?? defaultSettings.workingHours.tuesday.enabled,
            start: serverSettings.tuesdayStart || defaultSettings.workingHours.tuesday.start,
            end: serverSettings.tuesdayEnd || defaultSettings.workingHours.tuesday.end,
          },
          wednesday: {
            enabled: serverSettings.wednesdayEnabled ?? defaultSettings.workingHours.wednesday.enabled,
            start: serverSettings.wednesdayStart || defaultSettings.workingHours.wednesday.start,
            end: serverSettings.wednesdayEnd || defaultSettings.workingHours.wednesday.end,
          },
          thursday: {
            enabled: serverSettings.thursdayEnabled ?? defaultSettings.workingHours.thursday.enabled,
            start: serverSettings.thursdayStart || defaultSettings.workingHours.thursday.start,
            end: serverSettings.thursdayEnd || defaultSettings.workingHours.thursday.end,
          },
          friday: {
            enabled: serverSettings.fridayEnabled ?? defaultSettings.workingHours.friday.enabled,
            start: serverSettings.fridayStart || defaultSettings.workingHours.friday.start,
            end: serverSettings.fridayEnd || defaultSettings.workingHours.friday.end,
          },
          saturday: {
            enabled: serverSettings.saturdayEnabled ?? defaultSettings.workingHours.saturday.enabled,
            start: serverSettings.saturdayStart || defaultSettings.workingHours.saturday.start,
            end: serverSettings.saturdayEnd || defaultSettings.workingHours.saturday.end,
          },
          sunday: {
            enabled: serverSettings.sundayEnabled ?? defaultSettings.workingHours.sunday.enabled,
            start: serverSettings.sundayStart || defaultSettings.workingHours.sunday.start,
            end: serverSettings.sundayEnd || defaultSettings.workingHours.sunday.end,
          },
        },
        appointmentDuration: serverSettings.appointmentDuration || defaultSettings.appointmentDuration,
        notificationsEnabled: serverSettings.emailNotificationsEnabled ?? defaultSettings.notificationsEnabled,
        whatsappEnabled: !!serverSettings.whatsappNumber,
        whatsappPhone: serverSettings.whatsappNumber || defaultSettings.whatsappPhone,
        reminderStrategy: serverSettings.reminderStrategy || 'TWO_HOURS',
        whatsappHandoffEnabled: serverSettings.whatsappHandoffEnabled ?? false,
        whatsappHumanNumber: serverSettings.whatsappHumanNumber || '',
        whatsappHumanDisplayName: serverSettings.whatsappHumanDisplayName || '',
        whatsappHandoffClientMessage: serverSettings.whatsappHandoffClientMessage || '',
        whatsappHandoffAdminPrefill: serverSettings.whatsappHandoffAdminPrefill || '',
        holidays: serverSettings.holidays ? JSON.parse(serverSettings.holidays) : [],
        scheduleBlocks: serverSettings.scheduleBlocks ? JSON.parse(serverSettings.scheduleBlocks) : [],
        calendarDisplay: {
          morning: {
            start: localCalendar?.morning?.start || serverSettings.calendarMorningStart || defaultSettings.calendarDisplay.morning.start,
            end: localCalendar?.morning?.end || serverSettings.calendarMorningEnd || defaultSettings.calendarDisplay.morning.end,
            color: localCalendar?.morning?.color || serverSettings.calendarMorningColor || defaultSettings.calendarDisplay.morning.color,
          },
          afternoon: {
            start: localCalendar?.afternoon?.start || serverSettings.calendarAfternoonStart || defaultSettings.calendarDisplay.afternoon.start,
            end: localCalendar?.afternoon?.end || serverSettings.calendarAfternoonEnd || defaultSettings.calendarDisplay.afternoon.end,
            color: localCalendar?.afternoon?.color || serverSettings.calendarAfternoonColor || defaultSettings.calendarDisplay.afternoon.color,
          },
          night: {
            start: localCalendar?.night?.start || serverSettings.calendarNightStart || defaultSettings.calendarDisplay.night.start,
            end: localCalendar?.night?.end || serverSettings.calendarNightEnd || defaultSettings.calendarDisplay.night.end,
            color: localCalendar?.night?.color || serverSettings.calendarNightColor || defaultSettings.calendarDisplay.night.color,
          },
        },
      };
      
      setSettings(mappedSettings);
    } catch (error) {
      console.error('Error loading settings from server:', error);
      toast.error('Error al cargar configuración del servidor');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const handleChange = (field: keyof BusinessSettings, value: string | number | boolean | string[] | ScheduleBlock[]) => {
    setSettings(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleWorkingHoursChange = (
    day: keyof BusinessSettings['workingHours'],
    field: 'start' | 'end' | 'enabled',
    value: string | boolean
  ) => {
    setSettings(prev => ({
      ...prev,
      workingHours: {
        ...prev.workingHours,
        [day]: {
          ...prev.workingHours[day],
          [field]: value,
        },
      },
    }));
    setHasChanges(true);
  };

  const handleCalendarDisplayChange = (
    slot: 'morning' | 'afternoon' | 'night',
    field: 'start' | 'end' | 'color',
    value: string
  ) => {
    setSettings((prev) => ({
      ...prev,
      calendarDisplay: {
        ...prev.calendarDisplay,
        [slot]: {
          ...prev.calendarDisplay[slot],
          [field]: value,
        },
      },
    }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      // Convertir de BusinessSettings a SettingsData
      const settingsData: SettingsData = {
        businessName: settings.businessName,
        businessEmail: settings.email,
        businessPhone: settings.phone,
        businessAddress: settings.address,
        
        mondayEnabled: settings.workingHours.monday.enabled,
        mondayStart: settings.workingHours.monday.start,
        mondayEnd: settings.workingHours.monday.end,
        
        tuesdayEnabled: settings.workingHours.tuesday.enabled,
        tuesdayStart: settings.workingHours.tuesday.start,
        tuesdayEnd: settings.workingHours.tuesday.end,
        
        wednesdayEnabled: settings.workingHours.wednesday.enabled,
        wednesdayStart: settings.workingHours.wednesday.start,
        wednesdayEnd: settings.workingHours.wednesday.end,
        
        thursdayEnabled: settings.workingHours.thursday.enabled,
        thursdayStart: settings.workingHours.thursday.start,
        thursdayEnd: settings.workingHours.thursday.end,
        
        fridayEnabled: settings.workingHours.friday.enabled,
        fridayStart: settings.workingHours.friday.start,
        fridayEnd: settings.workingHours.friday.end,
        
        saturdayEnabled: settings.workingHours.saturday.enabled,
        saturdayStart: settings.workingHours.saturday.start,
        saturdayEnd: settings.workingHours.saturday.end,
        
        sundayEnabled: settings.workingHours.sunday.enabled,
        sundayStart: settings.workingHours.sunday.start,
        sundayEnd: settings.workingHours.sunday.end,
        
        appointmentDuration: settings.appointmentDuration,
        emailNotificationsEnabled: settings.notificationsEnabled,
        whatsappNumber: settings.whatsappPhone,
        
        reminderStrategy: settings.reminderStrategy,
        whatsappHandoffEnabled: settings.whatsappHandoffEnabled,
        whatsappHumanNumber: settings.whatsappHumanNumber,
        whatsappHumanDisplayName: settings.whatsappHumanDisplayName,
        whatsappHandoffClientMessage: settings.whatsappHandoffClientMessage,
        whatsappHandoffAdminPrefill: settings.whatsappHandoffAdminPrefill,
        holidays: JSON.stringify(settings.holidays),
        scheduleBlocks: JSON.stringify(settings.scheduleBlocks),
      };
      
      await settingsApi.saveAll(settingsData);
      localStorage.setItem(CALENDAR_DISPLAY_STORAGE_KEY, JSON.stringify(settings.calendarDisplay));
      toast.success('✅ Configuración guardada en servidor');
      setHasChanges(false);
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('❌ Error al guardar la configuración');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestNotificationPermission = async () => {
    try {
      const result = await requestPermission();
      if (result === 'granted') {
        toast.success('✅ Permisos de notificaciones concedidos');
      } else if (result === 'denied') {
        toast.error('❌ Permisos de notificaciones denegados');
      }
    } catch {
      toast.error('Error al solicitar permisos');
    }
  };

  const handleSendTestNotification = () => {
    sendTestNotification(
      '🐰 BunnyCure',
      'Esta es una notificación de prueba. Las notificaciones están funcionando correctamente!'
    );
    toast.success('Notificación de prueba enviada');
  };

  return (
    <DashboardLayout>
      <Container fluid className="bunny-page">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div>
            <h2 className="mb-1">
              <FiSettings className="me-2" />
              Configuración
            </h2>
            <p className="text-muted mb-0">Ajustes de identidad, portal de reservas y WhatsApp</p>
          </div>
          <div className="d-flex gap-2">
            <Button
              as="a"
              href="/reservar"
              target="_blank"
              rel="noopener noreferrer"
              variant="outline-secondary"
            >
              Ver portal público
            </Button>
            <Button
              variant="primary"
              onClick={handleSave}
              disabled={!hasChanges || loading}
            >
              {loading ? (
                <>
                  <Spinner animation="border" size="sm" className="me-2" />
                  Guardando...
                </>
              ) : (
                <>
                  <FiSave className="me-2" />
                  Guardar Configuración
                </>
              )}
            </Button>
          </div>
        </div>

        {hasChanges && (
          <Alert variant="warning" className="mb-4">
            <strong>Tienes cambios sin guardar.</strong> No olvides guardar tu configuración.
          </Alert>
        )}

        <Row>
          <Col lg={6} className="mb-4">
            <Card className="border-primary shadow-sm h-100">
              <Card.Header className="bg-primary text-white">
                <h5 className="mb-0 text-white">⭐ Programa de Fidelización</h5>
              </Card.Header>
              <Card.Body className="d-flex flex-column">
                <p>Configura la lista de premios que tus clientes ganarán al completar ciclos de 10 visitas.</p>
                <div className="mt-auto d-grid">
                  <Button variant="outline-primary" onClick={() => navigate('/settings/loyalty')}>
                    Gestionar Premios y Ciclos
                  </Button>
                </div>
              </Card.Body>
            </Card>
          </Col>

          <Col lg={6} className="mb-4">
              <Card className="h-100">
              <Card.Header>
                <h5 className="mb-0">Identidad del Negocio</h5>
              </Card.Header>
              <Card.Body>
                <Form.Group className="mb-3">
                  <Form.Label>Nombre del Negocio</Form.Label>
                  <Form.Control
                    type="text"
                    value={settings.businessName}
                    onChange={(e) => handleChange('businessName', e.target.value)}
                    placeholder="Ej: BunnyCure"
                  />
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>Email</Form.Label>
                  <Form.Control
                    type="email"
                    value={settings.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    placeholder="info@bunnycure.com"
                  />
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>Teléfono</Form.Label>
                  <Form.Control
                    type="tel"
                    value={settings.phone}
                    onChange={(e) => handleChange('phone', e.target.value)}
                    placeholder="+56912345678"
                  />
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>Dirección</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={2}
                    value={settings.address}
                    onChange={(e) => handleChange('address', e.target.value)}
                    placeholder="Dirección completa"
                  />
                </Form.Group>
              </Card.Body>
            </Card>
          </Col>

          <Col lg={6} className="mb-4">
            <Card className="border-danger shadow-sm">
              <Card.Header className="bg-danger text-white d-flex justify-content-between align-items-center">
                <h5 className="mb-0 text-white">📅 Días Feriados (Cerrado)</h5>
              </Card.Header>
              <Card.Body>
                <div className="d-flex gap-2 mb-3">
                  <Form.Control 
                    type="date" 
                    id="new-holiday"
                  />
                  <Button variant="danger" size="sm" onClick={() => {
                    const el = document.getElementById('new-holiday') as HTMLInputElement;
                    if (el.value) {
                      if (!settings.holidays.includes(el.value)) {
                        handleChange('holidays', [...settings.holidays, el.value].sort());
                      }
                      el.value = '';
                    }
                  }}>Añadir</Button>
                </div>
                <div className="d-flex flex-wrap gap-2">
                  {settings.holidays.length === 0 ? (
                    <small className="text-muted">No hay feriados configurados</small>
                  ) : (
                    settings.holidays.map(h => (
                      <Badge key={h} bg="danger" className="p-2 d-flex align-items-center gap-2">
                        {new Date(h + 'T12:00:00').toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' })}
                        <span style={{ cursor: 'pointer' }} onClick={() => handleChange('holidays', settings.holidays.filter(x => x !== h))}>✕</span>
                      </Badge>
                    ))
                  )}
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        <Row>
          <Col lg={6} className="mb-4">
            <Card className="border-warning shadow-sm">
              <Card.Header className="bg-warning text-dark d-flex justify-content-between align-items-center">
                <h5 className="mb-0">🚫 Bloqueos de Agenda</h5>
              </Card.Header>
              <Card.Body>
                <div className="small text-muted mb-3">Define rangos de horas donde no habrá disponibilidad.</div>
                
                {settings.scheduleBlocks.length > 0 && (
                  <div className="mb-3 border rounded p-2 bg-white" style={{ maxHeight: '200px', overflowY: 'auto' }}>
                    {settings.scheduleBlocks.map(b => (
                      <div key={b.id} className="d-flex justify-content-between align-items-center border-bottom py-2 px-1">
                        <div>
                          <div className="fw-bold small">{new Date(b.date + 'T12:00:00').toLocaleDateString('es-CL')}</div>
                          <div className="small text-muted">{b.startTime} - {b.endTime} • {b.reason || 'Sin motivo'}</div>
                        </div>
                        <Button variant="link" size="sm" className="text-danger" onClick={() => handleChange('scheduleBlocks', settings.scheduleBlocks.filter(x => x.id !== b.id))}>Eliminar</Button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="border p-3 rounded bg-light shadow-inner">
                  <Row className="g-2">
                    <Col xs={12} sm={6}>
                      <Form.Label className="small mb-1">Fecha</Form.Label>
                      <Form.Control size="sm" type="date" id="block-date" />
                    </Col>
                    <Col xs={6} sm={3}>
                      <Form.Label className="small mb-1">Inicio</Form.Label>
                      <Form.Control size="sm" type="time" id="block-start" defaultValue="14:00" />
                    </Col>
                    <Col xs={6} sm={3}>
                      <Form.Label className="small mb-1">Fin</Form.Label>
                      <Form.Control size="sm" type="time" id="block-end" defaultValue="16:00" />
                    </Col>
                    <Col xs={12} sm={9}>
                      <Form.Label className="small mb-1">Motivo</Form.Label>
                      <Form.Control size="sm" type="text" id="block-reason" placeholder="Ej: Almuerzo, trámite..." />
                    </Col>
                    <Col xs={12} sm={3} className="d-grid align-items-end">
                      <Button variant="warning" size="sm" onClick={() => {
                        const d = document.getElementById('block-date') as HTMLInputElement;
                        const s = document.getElementById('block-start') as HTMLInputElement;
                        const e = document.getElementById('block-end') as HTMLInputElement;
                        const r = document.getElementById('block-reason') as HTMLInputElement;
                        if (d.value && s.value && e.value) {
                          const newBlock: ScheduleBlock = {
                            id: Date.now().toString(),
                            date: d.value,
                            startTime: s.value,
                            endTime: e.value,
                            reason: r.value
                          };
                          handleChange('scheduleBlocks', [...settings.scheduleBlocks, newBlock].sort((a,b) => a.date.localeCompare(b.date)));
                          d.value = ''; r.value = '';
                        }
                      }}>Bloquear</Button>
                    </Col>
                  </Row>
                </div>
              </Card.Body>
            </Card>
          </Col>

          <Col lg={6} className="mb-4">
              <Card>
              <Card.Header>
                <h5 className="mb-0">Configuración de Citas</h5>
              </Card.Header>
              <Card.Body>
                <Alert variant="info" className="small">
                  Esta sección configura el WhatsApp de atención humana y recordatorios de citas.
                </Alert>

                <Form.Group className="mb-3">
                  <Form.Label>Duración por defecto de citas (minutos)</Form.Label>
                  <Form.Select
                    value={settings.appointmentDuration}
                    onChange={(e) => handleChange('appointmentDuration', parseInt(e.target.value))}
                  >
                    <option value={15}>15 minutos</option>
                    <option value={30}>30 minutos</option>
                    <option value={45}>45 minutos</option>
                    <option value={60}>60 minutos</option>
                    <option value={90}>90 minutos</option>
                    <option value={120}>120 minutos</option>
                  </Form.Select>
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Check
                    type="switch"
                    id="notifications-switch"
                    label="Habilitar notificaciones por email"
                    checked={settings.notificationsEnabled}
                    onChange={(e) => handleChange('notificationsEnabled', e.target.checked)}
                  />
                  <Form.Text className="text-muted">
                    Envía recordatorios automáticos a los clientes
                  </Form.Text>
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>Cuándo enviar el recordatorio</Form.Label>
                  <Form.Select
                    value={settings.reminderStrategy}
                    onChange={(e) => handleChange('reminderStrategy', e.target.value as BusinessSettings['reminderStrategy'])}
                  >
                    <option value="TWO_HOURS">⏰ 2 horas antes de la cita</option>
                    <option value="MORNING">🌅 Mañana del día (9 AM)</option>
                    <option value="DAY_BEFORE">📅 Un día antes (6 PM)</option>
                    <option value="BOTH">🔔 Ambos (día antes + 2 horas)</option>
                  </Form.Select>
                  <Form.Text className="text-muted">
                    Define cuándo enviar recordatorios automáticos
                  </Form.Text>
                </Form.Group>

                <hr />

                <h6 className="mb-3">
                  <FaWhatsapp className="me-2" />
                  Portal de Reservas y WhatsApp
                </h6>

                <Form.Group className="mb-3">
                  <Form.Check
                    type="switch"
                    id="whatsapp-switch"
                    label="Habilitar integración WhatsApp"
                    checked={settings.whatsappEnabled}
                    onChange={(e) => handleChange('whatsappEnabled', e.target.checked)}
                  />
                </Form.Group>

                {settings.whatsappEnabled && (
                  <>
                    <Form.Group className="mb-3">
                      <Form.Label>Número WhatsApp del negocio</Form.Label>
                      <Form.Control
                        type="tel"
                        value={settings.whatsappPhone}
                        onChange={(e) => handleChange('whatsappPhone', e.target.value)}
                        placeholder="+56912345678"
                      />
                      <Form.Text className="text-muted">
                        Número con código de país (ej: +56912345678)
                      </Form.Text>
                    </Form.Group>

                    <hr />

                    <h6 className="mb-3">🤝 Traspaso a Agente Humano</h6>

                    <Form.Group className="mb-3">
                      <Form.Check
                        type="switch"
                        id="handoff-switch"
                        label="Habilitar traspaso manual"
                        checked={settings.whatsappHandoffEnabled}
                        onChange={(e) => handleChange('whatsappHandoffEnabled', e.target.checked)}
                      />
                      <Form.Text className="text-muted">
                        Permite transferir conversaciones del bot a un agente humano
                      </Form.Text>
                    </Form.Group>

                    {settings.whatsappHandoffEnabled && (
                      <>
                        <Form.Group className="mb-3">
                          <Form.Label>Número WhatsApp humano</Form.Label>
                          <Form.Control
                            type="tel"
                            value={settings.whatsappHumanNumber}
                            onChange={(e) => handleChange('whatsappHumanNumber', e.target.value)}
                            placeholder="+56987654321"
                          />
                          <Form.Text className="text-muted">
                            Número del agente que recibirá las conversaciones
                          </Form.Text>
                        </Form.Group>

                        <Form.Group className="mb-3">
                          <Form.Label>Nombre visible del canal humano</Form.Label>
                          <Form.Control
                            type="text"
                            value={settings.whatsappHumanDisplayName}
                            onChange={(e) => handleChange('whatsappHumanDisplayName', e.target.value)}
                            placeholder="Equipo BunnyCure"
                          />
                          <Form.Text className="text-muted">
                            Nombre que verá el cliente cuando sea transferido
                          </Form.Text>
                        </Form.Group>

                        <Form.Group className="mb-3">
                          <Form.Label>Mensaje al Cliente</Form.Label>
                          <Form.Control
                            as="textarea"
                            rows={2}
                            value={settings.whatsappHandoffClientMessage}
                            onChange={(e) => handleChange('whatsappHandoffClientMessage', e.target.value)}
                            placeholder="Te estoy conectando con un miembro de nuestro equipo..."
                          />
                          <Form.Text className="text-muted">
                            Mensaje que recibe el cliente antes de ser transferido
                          </Form.Text>
                        </Form.Group>

                        <Form.Group className="mb-3">
                          <Form.Label>Mensaje pre-escrito para admin</Form.Label>
                          <Form.Control
                            as="textarea"
                            rows={3}
                            value={settings.whatsappHandoffAdminPrefill}
                            onChange={(e) => handleChange('whatsappHandoffAdminPrefill', e.target.value)}
                            placeholder="Hola, el cliente {customer} necesita ayuda con {service}"
                          />
                          <Form.Text className="text-muted">
                            Variables disponibles: {'{customer}'}, {'{service}'}, {'{date}'}, {'{time}'}
                          </Form.Text>
                        </Form.Group>
                      </>
                    )}
                  </>
                )}
              </Card.Body>
            </Card>
          </Col>
        </Row>

        <Row>
          <Col lg={6} className="mb-4">
            <Card>
              <Card.Header>
                <h5 className="mb-0">
                  <FaBell className="me-2" />
                  Notificaciones Push (PWA)
                </h5>
              </Card.Header>
              <Card.Body>
                {!isSupported && (
                  <Alert variant="warning">
                    <strong>⚠️ No soportado</strong><br />
                    Tu navegador no soporta notificaciones push. Prueba con Chrome o Safari moderno.
                  </Alert>
                )}

                {isSupported && (
                  <>
                    <div className="mb-3">
                      <strong>Estado de Permisos:</strong>{' '}
                      {permission === 'default' && (
                        <Badge bg="secondary">No solicitados</Badge>
                      )}
                      {permission === 'granted' && (
                        <Badge bg="success">✅ Concedidos</Badge>
                      )}
                      {permission === 'denied' && (
                        <Badge bg="danger">❌ Denegados</Badge>
                      )}
                    </div>

                    {permission === 'default' && (
                      <div className="d-grid gap-2 mb-3">
                        <Button 
                          variant="primary" 
                          onClick={handleRequestNotificationPermission}
                        >
                          <FaBell className="me-2" />
                          Solicitar Permisos de Notificaciones
                        </Button>
                      </div>
                    )}

                    {permission === 'granted' && (
                      <div className="d-grid gap-2 mb-3">
                        <Button 
                          variant="success" 
                          onClick={handleSendTestNotification}
                        >
                          🔔 Enviar Notificación de Prueba
                        </Button>
                      </div>
                    )}

                    {permission === 'denied' && (
                      <Alert variant="danger">
                        <strong>Permisos denegados</strong><br />
                        Debes habilitar las notificaciones manualmente en la configuración de tu navegador.
                      </Alert>
                    )}

                    <hr />

                    <div className="small text-muted">
                      <strong>💡 Sobre las notificaciones PWA:</strong>
                      <ul className="mt-2 mb-0">
                        <li>Funciona en Chrome Android, Safari iOS 16.4+</li>
                        <li>Requiere HTTPS (ya configurado en Vercel)</li>
                        <li>Las notificaciones aparecen incluso con la app cerrada</li>
                        <li>Ideal para recordatorios de citas</li>
                      </ul>
                    </div>
                  </>
                )}
              </Card.Body>
            </Card>
          </Col>

          <Col lg={12}>
            <Card>
              <Card.Header>
                <h5 className="mb-0">Bloques Horarios</h5>
              </Card.Header>
              <Card.Body>
                {Object.entries(settings.workingHours).map(([day, hours]) => (
                  <Row key={day} className="mb-3 align-items-center">
                    <Col md={3}>
                      <Form.Check
                        type="switch"
                        id={`day-${day}`}
                        label={dayNames[day as keyof typeof dayNames]}
                        checked={hours.enabled}
                        onChange={(e) =>
                          handleWorkingHoursChange(
                            day as keyof BusinessSettings['workingHours'],
                            'enabled',
                            e.target.checked
                          )
                        }
                      />
                    </Col>
                    <Col md={4}>
                      <Form.Group>
                        <Form.Label className="small text-muted">Desde</Form.Label>
                        <Form.Control
                          type="time"
                          value={hours.start}
                          disabled={!hours.enabled}
                          onChange={(e) =>
                            handleWorkingHoursChange(
                              day as keyof BusinessSettings['workingHours'],
                              'start',
                              e.target.value
                            )
                          }
                        />
                      </Form.Group>
                    </Col>
                    <Col md={4}>
                      <Form.Group>
                        <Form.Label className="small text-muted">Hasta</Form.Label>
                        <Form.Control
                          type="time"
                          value={hours.end}
                          disabled={!hours.enabled}
                          onChange={(e) =>
                            handleWorkingHoursChange(
                              day as keyof BusinessSettings['workingHours'],
                              'end',
                              e.target.value
                            )
                          }
                        />
                      </Form.Group>
                    </Col>
                  </Row>
                ))}
              </Card.Body>
            </Card>
          </Col>
        </Row>

        <Row>
          <Col lg={12} className="mb-4">
            <Card>
              <Card.Header>
                <h5 className="mb-0">🎨 Calendario: Franjas Horarias y Colores</h5>
              </Card.Header>
              <Card.Body>
                <p className="text-muted small mb-3">
                  Estos colores se usan en el calendario general y en el calendario del dashboard.
                </p>

                {(['morning', 'afternoon', 'night'] as const).map((slot) => {
                  const slotLabel: Record<'morning' | 'afternoon' | 'night', string> = {
                    morning: 'Mañana',
                    afternoon: 'Tarde',
                    night: 'Noche',
                  };

                  return (
                    <Row key={slot} className="align-items-end g-3 mb-3">
                      <Col md={3}>
                        <Form.Label className="fw-semibold">{slotLabel[slot]}</Form.Label>
                      </Col>
                      <Col md={3}>
                        <Form.Label className="small text-muted">Desde</Form.Label>
                        <Form.Control
                          type="time"
                          value={settings.calendarDisplay[slot].start}
                          onChange={(e) => handleCalendarDisplayChange(slot, 'start', e.target.value)}
                        />
                      </Col>
                      <Col md={3}>
                        <Form.Label className="small text-muted">Hasta</Form.Label>
                        <Form.Control
                          type="time"
                          value={settings.calendarDisplay[slot].end}
                          onChange={(e) => handleCalendarDisplayChange(slot, 'end', e.target.value)}
                        />
                      </Col>
                      <Col md={3}>
                        <Form.Label className="small text-muted">Color</Form.Label>
                        <Form.Control
                          type="color"
                          value={settings.calendarDisplay[slot].color}
                          onChange={(e) => handleCalendarDisplayChange(slot, 'color', e.target.value)}
                        />
                      </Col>
                    </Row>
                  );
                })}
              </Card.Body>
            </Card>
          </Col>
        </Row>

        <NotificationTemplatesSection />
      </Container>
    </DashboardLayout>
  );
}
