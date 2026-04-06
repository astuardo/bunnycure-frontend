/**
 * Página de Configuración del Negocio
 * Permite al administrador configurar información del negocio, horarios, notificaciones.
 */

import { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Form, Button, Alert, Spinner } from 'react-bootstrap';
import { FiSave, FiSettings } from 'react-icons/fi';
import DashboardLayout from '../../components/common/DashboardLayout';
import { useToast } from '../../hooks/useToast';

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

  const loadSettings = () => {
    const saved = localStorage.getItem('businessSettings');
    if (saved) {
      try {
        setSettings(JSON.parse(saved));
      } catch (error) {
        console.error('Error loading settings:', error);
      }
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
      localStorage.setItem('businessSettings', JSON.stringify(settings));
      await new Promise(resolve => setTimeout(resolve, 500));
      toast.success('Configuración guardada exitosamente');
      setHasChanges(false);
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Error al guardar la configuración');
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

                <hr />

                <h6 className="mb-3">WhatsApp Integration</h6>

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
