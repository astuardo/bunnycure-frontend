/**
 * Página de Configuración del Negocio
 * Permite al administrador configurar información del negocio, horarios, notificaciones.
 * Ahora con persistencia en servidor vía API
 */

import { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Form, Button, Alert, Spinner } from 'react-bootstrap';
import { FiSave, FiSettings } from 'react-icons/fi';
import { FaWhatsapp } from 'react-icons/fa';
import DashboardLayout from '../../components/common/DashboardLayout';
import { useToast } from '../../hooks/useToast';
import { settingsApi, SettingsData } from '../../api/settings.api';

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
  const toast = useToast();
  const [settings, setSettings] = useState<BusinessSettings>(defaultSettings);
  const [loading, setLoading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const serverSettings = await settingsApi.getAll();
      
      // Convertir de SettingsData a BusinessSettings
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
      };
      
      setSettings(mappedSettings);
    } catch (error) {
      console.error('Error loading settings from server:', error);
      toast.error('Error al cargar configuración del servidor');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: keyof BusinessSettings, value: string | number | boolean) => {
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
      };
      
      await settingsApi.saveAll(settingsData);
      toast.success('✅ Configuración guardada en servidor');
      setHasChanges(false);
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('❌ Error al guardar la configuración');
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <Container fluid className="py-4">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div>
            <h2 className="mb-1">
              <FiSettings className="me-2" />
              Configuración
            </h2>
            <p className="text-muted mb-0">Administra la configuración de tu negocio</p>
          </div>
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
                Guardar Cambios
              </>
            )}
          </Button>
        </div>

        {hasChanges && (
          <Alert variant="warning" className="mb-4">
            <strong>Tienes cambios sin guardar.</strong> No olvides guardar tu configuración.
          </Alert>
        )}

        <Row>
          <Col lg={6} className="mb-4">
            <Card>
              <Card.Header>
                <h5 className="mb-0">Información del Negocio</h5>
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
            <Card>
              <Card.Header>
                <h5 className="mb-0">Configuración de Citas</h5>
              </Card.Header>
              <Card.Body>
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
                  <Form.Label>Estrategia de Recordatorios</Form.Label>
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
                  WhatsApp Integration
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
                      <Form.Label>Número de WhatsApp Business</Form.Label>
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
                          <Form.Label>Número Agente Humano</Form.Label>
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
                          <Form.Label>Nombre del Equipo</Form.Label>
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
                          <Form.Label>Texto Pre-escrito Admin</Form.Label>
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
          <Col lg={12}>
            <Card>
              <Card.Header>
                <h5 className="mb-0">Horario de Atención</h5>
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
      </Container>
    </DashboardLayout>
  );
}
