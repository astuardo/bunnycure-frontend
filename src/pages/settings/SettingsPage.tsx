/**
 * Página de Configuración del Negocio (Rediseño Fase 3)
 * Organizada en pestañas temáticas: Identidad & Marca, Horarios & Agenda, Bloqueos,
 * Portal de Reservas, WhatsApp & Handoff, Notificaciones & Plantillas y Fidelización.
 */

import { useState, useEffect, useCallback } from 'react';
import { Container, Row, Col, Card, Form, Button, Alert, Spinner, Badge, Nav, InputGroup } from 'react-bootstrap';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  FiSave, 
  FiSettings, 
  FiGlobe, 
  FiClock, 
  FiSlash, 
  FiBell, 
  FiAward, 
  FiCopy, 
  FiExternalLink, 
  FiCheck,
  FiEye
} from 'react-icons/fi';
import { FaWhatsapp } from 'react-icons/fa';
import DashboardLayout from '../../components/common/DashboardLayout';
import { useToast } from '../../hooks/useToast';
import { 
  settingsApi, 
  SettingsData, 
  loadCachedUnavailabilities, 
  loadCachedUnavailabilityColors, 
  loadCachedUnavailabilityNotifications 
} from '../../api/settings.api';
import { useNotificationPermission } from '../../hooks/useNotificationPermission';
import { NotificationTemplatesSection } from '../../components/settings/NotificationTemplatesSection';
import { ScheduleUnavailabilitySection } from '../../components/settings/ScheduleUnavailabilitySection';
import {
  ScheduleUnavailability,
  UnavailabilityColorConfig,
  UnavailabilityNotificationConfig,
  DEFAULT_UNAVAILABILITY_COLORS,
  DEFAULT_UNAVAILABILITY_NOTIFICATIONS,
} from '../../types/unavailability.types';
import { CALENDAR_DISPLAY_STORAGE_KEY, DEFAULT_CALENDAR_DISPLAY_CONFIG } from '@/utils/calendarDisplay';
import {
  getPublicBookingEnabled,
  setPublicBookingEnabled,
} from '../../utils/bookingSettingsUtils';
import { useTenant } from '../../context/TenantContext';

interface BusinessSettings {
  businessName: string;
  slogan: string;
  email: string;
  phone: string;
  address: string;
  customDomain: string;
  slug: string;
  logoUrl: string;
  primaryColor: string;
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
  unavailabilities: ScheduleUnavailability[];
  unavailabilityColors: UnavailabilityColorConfig;
  unavailabilityNotifications: UnavailabilityNotificationConfig;
  calendarDisplay: {
    morning: { start: string; end: string; color: string };
    afternoon: { start: string; end: string; color: string };
    night: { start: string; end: string; color: string };
  };
}

const defaultSettings: BusinessSettings = {
  businessName: 'BunnyCure',
  slogan: 'Arte en tus manos ✨',
  email: 'contacto@bunnycure.cl',
  phone: '+56983692046',
  address: 'Santiago, Chile',
  customDomain: 'app.bunnycure.cl',
  slug: 'bunnycure',
  logoUrl: '/images/logo.png',
  primaryColor: '#d48b70',
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
  whatsappEnabled: true,
  whatsappPhone: '+56983692046',
  reminderStrategy: 'TWO_HOURS',
  whatsappHandoffEnabled: true,
  whatsappHumanNumber: '+56983692046',
  whatsappHumanDisplayName: 'Atención BunnyCure',
  whatsappHandoffClientMessage: 'Te estoy conectando con nuestro equipo oficial (+56 9 8369 2046)...',
  whatsappHandoffAdminPrefill: 'Hola, la clienta {customer} necesita asistencia para su cita de {service}',
  unavailabilities: [],
  unavailabilityColors: DEFAULT_UNAVAILABILITY_COLORS,
  unavailabilityNotifications: DEFAULT_UNAVAILABILITY_NOTIFICATIONS,
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

type SettingsTab = 'identity' | 'hours' | 'blocks' | 'booking' | 'whatsapp' | 'notifications' | 'loyalty';

export default function SettingsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = (searchParams.get('tab') as SettingsTab) || 'identity';
  const [activeTab, setActiveTab] = useState<SettingsTab>(initialTab);
  
  const toast = useToast();
  const { tenant, refreshTenant } = useTenant();
  const [settings, setSettings] = useState<BusinessSettings>(defaultSettings);
  const [loading, setLoading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [publicBookingEnabled, setPublicBookingEnabledState] = useState<boolean>(getPublicBookingEnabled());
  const { permission, requestPermission, sendTestNotification } = useNotificationPermission();

  useEffect(() => {
    const tabParam = searchParams.get('tab') as SettingsTab;
    if (tabParam) setActiveTab(tabParam);
  }, [searchParams]);

  const handleTabChange = (tab: SettingsTab) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  const handleTogglePublicBooking = async (checked: boolean) => {
    setPublicBookingEnabledState(checked);
    await setPublicBookingEnabled(checked);
    if (checked) {
      toast.success('✅ Portal público de reservas (/reservar) habilitado');
    } else {
      toast.info('⏸️ Portal público de reservas (/reservar) pausado');
    }
  };

  const loadSettings = useCallback(async () => {
    setLoading(true);
    try {
      const serverSettings = await settingsApi.getAll();
      const cachedUnavailabilities = loadCachedUnavailabilities();
      const cachedUnavailabilityColors = loadCachedUnavailabilityColors();
      const cachedUnavailabilityNotifications = loadCachedUnavailabilityNotifications();

      const rawStoredCalendarDisplay = localStorage.getItem(CALENDAR_DISPLAY_STORAGE_KEY);
      let parsedCalendarDisplay = defaultSettings.calendarDisplay;
      if (rawStoredCalendarDisplay) {
        try {
          parsedCalendarDisplay = {
            ...defaultSettings.calendarDisplay,
            ...JSON.parse(rawStoredCalendarDisplay),
          };
        } catch {
          // ignore
        }
      }

      setSettings({
        businessName: serverSettings.businessName || tenant.name || 'BunnyCure',
        slogan: 'Arte en tus manos ✨',
        email: serverSettings.businessEmail || tenant.email || 'contacto@bunnycure.cl',
        phone: serverSettings.businessPhone || tenant.phone || '+56983692046',
        address: serverSettings.businessAddress || tenant.address || 'Santiago, Chile',
        customDomain: tenant.customDomain || 'app.bunnycure.cl',
        slug: tenant.slug || 'bunnycure',
        logoUrl: tenant.logoUrl || '/images/logo.png',
        primaryColor: tenant.primaryColor || '#d48b70',
        workingHours: {
          monday: {
            start: serverSettings.mondayStart || '09:00',
            end: serverSettings.mondayEnd || '18:00',
            enabled: serverSettings.mondayEnabled ?? true,
          },
          tuesday: {
            start: serverSettings.tuesdayStart || '09:00',
            end: serverSettings.tuesdayEnd || '18:00',
            enabled: serverSettings.tuesdayEnabled ?? true,
          },
          wednesday: {
            start: serverSettings.wednesdayStart || '09:00',
            end: serverSettings.wednesdayEnd || '18:00',
            enabled: serverSettings.wednesdayEnabled ?? true,
          },
          thursday: {
            start: serverSettings.thursdayStart || '09:00',
            end: serverSettings.thursdayEnd || '18:00',
            enabled: serverSettings.thursdayEnabled ?? true,
          },
          friday: {
            start: serverSettings.fridayStart || '09:00',
            end: serverSettings.fridayEnd || '18:00',
            enabled: serverSettings.fridayEnabled ?? true,
          },
          saturday: {
            start: serverSettings.saturdayStart || '09:00',
            end: serverSettings.saturdayEnd || '14:00',
            enabled: serverSettings.saturdayEnabled ?? true,
          },
          sunday: {
            start: serverSettings.sundayStart || '10:00',
            end: serverSettings.sundayEnd || '14:00',
            enabled: serverSettings.sundayEnabled ?? false,
          },
        },
        appointmentDuration: serverSettings.appointmentDuration || 60,
        notificationsEnabled: serverSettings.emailNotificationsEnabled ?? true,
        whatsappEnabled: true,
        whatsappPhone: serverSettings.whatsappNumber || '+56983692046',
        reminderStrategy: serverSettings.reminderStrategy || 'TWO_HOURS',
        whatsappHandoffEnabled: serverSettings.whatsappHandoffEnabled ?? true,
        whatsappHumanNumber: serverSettings.whatsappHumanNumber || '+56983692046',
        whatsappHumanDisplayName: serverSettings.whatsappHumanDisplayName || 'Atención BunnyCure',
        whatsappHandoffClientMessage: serverSettings.whatsappHandoffClientMessage || defaultSettings.whatsappHandoffClientMessage,
        whatsappHandoffAdminPrefill: serverSettings.whatsappHandoffAdminPrefill || defaultSettings.whatsappHandoffAdminPrefill,
        unavailabilities: serverSettings.unavailabilities || cachedUnavailabilities,
        unavailabilityColors: serverSettings.unavailabilityColors || cachedUnavailabilityColors,
        unavailabilityNotifications: serverSettings.unavailabilityNotifications || cachedUnavailabilityNotifications,
        calendarDisplay: parsedCalendarDisplay,
      });
      setHasChanges(false);
    } catch (error) {
      console.error('Error loading settings:', error);
      toast.error('Error al cargar la configuración');
    } finally {
      setLoading(false);
    }
  }, [tenant, toast]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const handleChange = <K extends keyof BusinessSettings>(
    key: K,
    value: BusinessSettings[K]
  ) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
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
        unavailabilities: settings.unavailabilities,
        unavailabilityColors: settings.unavailabilityColors,
        unavailabilityNotifications: settings.unavailabilityNotifications,
      };
      
      await settingsApi.saveAll(settingsData);
      localStorage.setItem(CALENDAR_DISPLAY_STORAGE_KEY, JSON.stringify(settings.calendarDisplay));
      
      // Actualizar variables de branding si cambió el color primario
      if (settings.primaryColor) {
        document.documentElement.style.setProperty('--primary-color', settings.primaryColor);
        document.documentElement.style.setProperty('--bs-primary', settings.primaryColor);
      }
      
      await refreshTenant();
      toast.success('✅ Configuración guardada en el servidor');
      setHasChanges(false);
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('❌ Error al guardar la configuración');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyBookingLink = () => {
    const fullUrl = `${window.location.origin}/reservar`;
    navigator.clipboard.writeText(fullUrl);
    setCopiedLink(true);
    toast.success('📋 Enlace de reservas copiado al portapapeles');
    setTimeout(() => setCopiedLink(false), 3000);
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
      `🐰 ${settings.businessName}`,
      '¡Esta es una notificación de prueba! Las notificaciones están funcionando correctamente.'
    );
    toast.success('Notificación de prueba enviada');
  };

  return (
    <DashboardLayout>
      <Container fluid className="bunny-page pb-5">
        {/* Encabezado y Barra de Guardado */}
        <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-3 mb-4">
          <div>
            <h1 className="mb-1 d-flex align-items-center gap-2">
              <FiSettings className="text-primary" />
              Configuración del Salón
            </h1>
            <p className="text-muted mb-0 small">
              Administra la identidad de tu negocio, horarios de atención, WhatsApp y portal de reservas
            </p>
          </div>

          <div className="d-flex gap-2 w-100 w-md-auto flex-wrap">
            <Button
              as="a"
              href="/reservar"
              target="_blank"
              rel="noopener noreferrer"
              variant="outline-secondary"
              className="d-flex align-items-center gap-2 flex-fill flex-md-grow-0"
            >
              <FiExternalLink />
              <span>Ver Portal Público</span>
            </Button>
            <Button
              variant="primary"
              onClick={handleSave}
              disabled={!hasChanges || loading}
              className="d-flex align-items-center justify-content-center gap-2 flex-fill flex-md-grow-0 shadow-sm"
            >
              {loading ? (
                <>
                  <Spinner animation="border" size="sm" />
                  <span>Guardando...</span>
                </>
              ) : (
                <>
                  <FiSave />
                  <span>Guardar Cambios</span>
                </>
              )}
            </Button>
          </div>
        </div>

        {hasChanges && (
          <Alert variant="warning" className="d-flex justify-content-between align-items-center mb-4 shadow-sm border-0">
            <div>
              <strong>⚠️ Tienes modificaciones pendientes:</strong> Recuerda pulsar <strong>"Guardar Cambios"</strong> para que surtan efecto en el sistema.
            </div>
            <Button size="sm" variant="warning" onClick={handleSave} disabled={loading}>
              Guardar ahora
            </Button>
          </Alert>
        )}

        {/* Pestañas de Configuración */}
        <Nav variant="pills" className="mb-4 gap-2 flex-wrap bg-white p-2 rounded-3 shadow-sm border">
          <Nav.Item>
            <Nav.Link 
              active={activeTab === 'identity'} 
              onClick={() => handleTabChange('identity')}
              className="d-flex align-items-center gap-2 py-2 px-3"
            >
              <FiGlobe />
              <span>Identidad &amp; Marca</span>
            </Nav.Link>
          </Nav.Item>
          <Nav.Item>
            <Nav.Link 
              active={activeTab === 'hours'} 
              onClick={() => handleTabChange('hours')}
              className="d-flex align-items-center gap-2 py-2 px-3"
            >
              <FiClock />
              <span>Horarios &amp; Agenda</span>
            </Nav.Link>
          </Nav.Item>
          <Nav.Item>
            <Nav.Link 
              active={activeTab === 'blocks'} 
              onClick={() => handleTabChange('blocks')}
              className="d-flex align-items-center gap-2 py-2 px-3"
            >
              <FiSlash />
              <span>Bloqueos &amp; Feriados</span>
            </Nav.Link>
          </Nav.Item>
          <Nav.Item>
            <Nav.Link 
              active={activeTab === 'booking'} 
              onClick={() => handleTabChange('booking')}
              className="d-flex align-items-center gap-2 py-2 px-3"
            >
              <FiEye />
              <span>Portal de Reservas</span>
            </Nav.Link>
          </Nav.Item>
          <Nav.Item>
            <Nav.Link 
              active={activeTab === 'whatsapp'} 
              onClick={() => handleTabChange('whatsapp')}
              className="d-flex align-items-center gap-2 py-2 px-3"
            >
              <FaWhatsapp />
              <span>WhatsApp &amp; Handoff</span>
            </Nav.Link>
          </Nav.Item>
          <Nav.Item>
            <Nav.Link 
              active={activeTab === 'notifications'} 
              onClick={() => handleTabChange('notifications')}
              className="d-flex align-items-center gap-2 py-2 px-3"
            >
              <FiBell />
              <span>Notificaciones</span>
            </Nav.Link>
          </Nav.Item>
          <Nav.Item>
            <Nav.Link 
              active={activeTab === 'loyalty'} 
              onClick={() => handleTabChange('loyalty')}
              className="d-flex align-items-center gap-2 py-2 px-3"
            >
              <FiAward />
              <span>Fidelización</span>
            </Nav.Link>
          </Nav.Item>
        </Nav>

        {/* ─────────────────────────────────────────────────────────────────────────────
            TAB 1: IDENTIDAD & MARCA
        ───────────────────────────────────────────────────────────────────────────── */}
        {activeTab === 'identity' && (
          <Row>
            <Col lg={7} className="mb-4">
              <Card className="shadow-sm border-0 h-100">
                <Card.Header className="bg-light py-3">
                  <h5 className="mb-0 fs-6 fw-bold">🏢 Datos Generales del Salón</h5>
                </Card.Header>
                <Card.Body className="p-4">
                  <Row className="g-3">
                    <Col md={12}>
                      <Form.Group>
                        <Form.Label className="fw-semibold">Nombre Comercial del Salón</Form.Label>
                        <Form.Control
                          type="text"
                          value={settings.businessName}
                          onChange={(e) => handleChange('businessName', e.target.value)}
                          placeholder="Ej: BunnyCure Studio"
                        />
                      </Form.Group>
                    </Col>

                    <Col md={6}>
                      <Form.Group>
                        <Form.Label className="fw-semibold">Correo Electrónico Oficial</Form.Label>
                        <Form.Control
                          type="email"
                          value={settings.email}
                          onChange={(e) => handleChange('email', e.target.value)}
                          placeholder="contacto@bunnycure.cl"
                        />
                      </Form.Group>
                    </Col>

                    <Col md={6}>
                      <Form.Group>
                        <Form.Label className="fw-semibold">Teléfono / WhatsApp Oficial</Form.Label>
                        <Form.Control
                          type="text"
                          value={settings.phone}
                          onChange={(e) => handleChange('phone', e.target.value)}
                          placeholder="+56983692046"
                        />
                      </Form.Group>
                    </Col>

                    <Col md={12}>
                      <Form.Group>
                        <Form.Label className="fw-semibold">Dirección Física del Salón</Form.Label>
                        <Form.Control
                          type="text"
                          value={settings.address}
                          onChange={(e) => handleChange('address', e.target.value)}
                          placeholder="Av. Providencia 1234, Oficina 502, Santiago"
                        />
                      </Form.Group>
                    </Col>

                    <Col md={6}>
                      <Form.Group>
                        <Form.Label className="fw-semibold">Dominio Propio (Custom Domain)</Form.Label>
                        <Form.Control
                          type="text"
                          value={settings.customDomain}
                          disabled
                          className="bg-light text-muted"
                          placeholder="app.bunnycure.cl"
                        />
                        <Form.Text className="text-muted">
                          Configurado en el plan Multi-Tenant SaaS.
                        </Form.Text>
                      </Form.Group>
                    </Col>

                    <Col md={6}>
                      <Form.Group>
                        <Form.Label className="fw-semibold">Identificador (Slug)</Form.Label>
                        <Form.Control
                          type="text"
                          value={settings.slug}
                          disabled
                          className="bg-light text-muted"
                          placeholder="bunnycure"
                        />
                      </Form.Group>
                    </Col>
                  </Row>
                </Card.Body>
              </Card>
            </Col>

            {/* Selector de Color y Vista Previa de Marca */}
            <Col lg={5} className="mb-4">
              <Card className="shadow-sm border-0 mb-4">
                <Card.Header className="bg-light py-3">
                  <h5 className="mb-0 fs-6 fw-bold">🎨 Color y Branding</h5>
                </Card.Header>
                <Card.Body className="p-4">
                  <Form.Group className="mb-3">
                    <Form.Label className="fw-semibold">Color Primario de Marca</Form.Label>
                    <div className="d-flex align-items-center gap-3">
                      <Form.Control
                        type="color"
                        value={settings.primaryColor}
                        onChange={(e) => handleChange('primaryColor', e.target.value)}
                        style={{ width: '60px', height: '42px', padding: '2px', cursor: 'pointer' }}
                        title="Seleccionar color"
                      />
                      <Form.Control
                        type="text"
                        value={settings.primaryColor}
                        onChange={(e) => handleChange('primaryColor', e.target.value)}
                        placeholder="#d48b70"
                        style={{ fontFamily: 'monospace' }}
                      />
                    </div>
                  </Form.Group>

                  <div className="p-3 bg-light rounded-3 mt-3 border">
                    <small className="text-muted d-block fw-bold mb-2">VISTA PREVIA EN VIVO</small>
                    <div className="d-flex align-items-center gap-2 flex-wrap mb-2">
                      <Button style={{ backgroundColor: settings.primaryColor, borderColor: settings.primaryColor, color: '#fff' }}>
                        Botón Principal
                      </Button>
                      <Badge style={{ backgroundColor: settings.primaryColor, color: '#fff' }} className="p-2">
                        Insignia de Estado
                      </Badge>
                    </div>
                    <small className="text-muted">
                      Este color se aplicará dinámicamente a todos los botones, títulos y componentes de la PWA.
                    </small>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        )}

        {/* ─────────────────────────────────────────────────────────────────────────────
            TAB 2: HORARIOS & AGENDA
        ───────────────────────────────────────────────────────────────────────────── */}
        {activeTab === 'hours' && (
          <Row>
            <Col lg={8} className="mb-4">
              <Card className="shadow-sm border-0">
                <Card.Header className="bg-light py-3 d-flex justify-content-between align-items-center">
                  <h5 className="mb-0 fs-6 fw-bold">🕒 Horarios de Atención Semanales</h5>
                  <Badge bg="secondary">Zona Horaria: Santiago (CLT)</Badge>
                </Card.Header>
                <Card.Body className="p-4">
                  <div className="table-responsive">
                    <table className="table align-middle">
                      <thead>
                        <tr>
                          <th style={{ width: '140px' }}>Día</th>
                          <th style={{ width: '120px' }}>Estado</th>
                          <th>Apertura</th>
                          <th>Cierre</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(Object.keys(settings.workingHours) as Array<keyof BusinessSettings['workingHours']>).map((day) => {
                          const hours = settings.workingHours[day];
                          return (
                            <tr key={day} className={!hours.enabled ? 'text-muted bg-light' : ''}>
                              <td className="fw-semibold">{dayNames[day]}</td>
                              <td>
                                <Form.Check
                                  type="switch"
                                  id={`switch-${day}`}
                                  label={hours.enabled ? 'Abierto' : 'Cerrado'}
                                  checked={hours.enabled}
                                  onChange={(e) => handleWorkingHoursChange(day, 'enabled', e.target.checked)}
                                />
                              </td>
                              <td>
                                <Form.Control
                                  type="time"
                                  size="sm"
                                  value={hours.start}
                                  disabled={!hours.enabled}
                                  onChange={(e) => handleWorkingHoursChange(day, 'start', e.target.value)}
                                  style={{ maxWidth: '130px' }}
                                />
                              </td>
                              <td>
                                <Form.Control
                                  type="time"
                                  size="sm"
                                  value={hours.end}
                                  disabled={!hours.enabled}
                                  onChange={(e) => handleWorkingHoursChange(day, 'end', e.target.value)}
                                  style={{ maxWidth: '130px' }}
                                />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </Card.Body>
              </Card>
            </Col>

            <Col lg={4} className="mb-4">
              <Card className="shadow-sm border-0 mb-4">
                <Card.Header className="bg-light py-3">
                  <h5 className="mb-0 fs-6 fw-bold">⏱️ Duración de Citas</h5>
                </Card.Header>
                <Card.Body className="p-4">
                  <Form.Group>
                    <Form.Label className="fw-semibold">Duración Estándar (Minutos)</Form.Label>
                    <Form.Select
                      value={settings.appointmentDuration}
                      onChange={(e) => handleChange('appointmentDuration', Number(e.target.value))}
                    >
                      <option value={30}>30 minutos</option>
                      <option value={45}>45 minutos</option>
                      <option value={60}>60 minutos (1 hora)</option>
                      <option value={75}>75 minutos</option>
                      <option value={90}>90 minutos (1.5 horas)</option>
                      <option value={120}>120 minutos (2 horas)</option>
                    </Form.Select>
                    <Form.Text className="text-muted">
                      Se utiliza como bloque predeterminado al agendar nuevas citas.
                    </Form.Text>
                  </Form.Group>
                </Card.Body>
              </Card>

              <Card className="shadow-sm border-0">
                <Card.Header className="bg-light py-3">
                  <h5 className="mb-0 fs-6 fw-bold">🎨 Franjas del Calendario</h5>
                </Card.Header>
                <Card.Body className="p-4">
                  <div className="d-flex flex-column gap-3">
                    <div>
                      <label className="small fw-semibold text-muted d-block mb-1">MAÑANA</label>
                      <div className="d-flex align-items-center gap-2">
                        <Form.Control
                          type="time"
                          size="sm"
                          value={settings.calendarDisplay.morning.start}
                          onChange={(e) => handleCalendarDisplayChange('morning', 'start', e.target.value)}
                        />
                        <span>a</span>
                        <Form.Control
                          type="time"
                          size="sm"
                          value={settings.calendarDisplay.morning.end}
                          onChange={(e) => handleCalendarDisplayChange('morning', 'end', e.target.value)}
                        />
                        <Form.Control
                          type="color"
                          value={settings.calendarDisplay.morning.color}
                          onChange={(e) => handleCalendarDisplayChange('morning', 'color', e.target.value)}
                          style={{ width: '45px', height: '31px', padding: '1px' }}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="small fw-semibold text-muted d-block mb-1">TARDE</label>
                      <div className="d-flex align-items-center gap-2">
                        <Form.Control
                          type="time"
                          size="sm"
                          value={settings.calendarDisplay.afternoon.start}
                          onChange={(e) => handleCalendarDisplayChange('afternoon', 'start', e.target.value)}
                        />
                        <span>a</span>
                        <Form.Control
                          type="time"
                          size="sm"
                          value={settings.calendarDisplay.afternoon.end}
                          onChange={(e) => handleCalendarDisplayChange('afternoon', 'end', e.target.value)}
                        />
                        <Form.Control
                          type="color"
                          value={settings.calendarDisplay.afternoon.color}
                          onChange={(e) => handleCalendarDisplayChange('afternoon', 'color', e.target.value)}
                          style={{ width: '45px', height: '31px', padding: '1px' }}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="small fw-semibold text-muted d-block mb-1">NOCHE</label>
                      <div className="d-flex align-items-center gap-2">
                        <Form.Control
                          type="time"
                          size="sm"
                          value={settings.calendarDisplay.night.start}
                          onChange={(e) => handleCalendarDisplayChange('night', 'start', e.target.value)}
                        />
                        <span>a</span>
                        <Form.Control
                          type="time"
                          size="sm"
                          value={settings.calendarDisplay.night.end}
                          onChange={(e) => handleCalendarDisplayChange('night', 'end', e.target.value)}
                        />
                        <Form.Control
                          type="color"
                          value={settings.calendarDisplay.night.color}
                          onChange={(e) => handleCalendarDisplayChange('night', 'color', e.target.value)}
                          style={{ width: '45px', height: '31px', padding: '1px' }}
                        />
                      </div>
                    </div>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        )}

        {/* ─────────────────────────────────────────────────────────────────────────────
            TAB 3: BLOQUEOS & FERIADOS
        ───────────────────────────────────────────────────────────────────────────── */}
        {activeTab === 'blocks' && (
          <Row>
            <Col lg={12}>
              <Card className="shadow-sm border-0">
                <Card.Header className="bg-light py-3">
                  <h5 className="mb-0 fs-6 fw-bold">🚫 Bloqueos de Agenda, Feriados y Excepciones</h5>
                </Card.Header>
                <Card.Body className="p-4">
                  <ScheduleUnavailabilitySection
                    unavailabilities={settings.unavailabilities}
                    colors={settings.unavailabilityColors}
                    notifications={settings.unavailabilityNotifications}
                    onUnavailabilitiesChange={(unavailabilities: ScheduleUnavailability[]) => {
                      setSettings((prev) => ({ ...prev, unavailabilities }));
                      setHasChanges(true);
                    }}
                    onColorsChange={(unavailabilityColors) => {
                      setSettings((prev) => ({ ...prev, unavailabilityColors }));
                      setHasChanges(true);
                    }}
                    onNotificationsChange={(unavailabilityNotifications) => {
                      setSettings((prev) => ({ ...prev, unavailabilityNotifications }));
                      setHasChanges(true);
                    }}
                  />
                </Card.Body>
              </Card>
            </Col>
          </Row>
        )}

        {/* ─────────────────────────────────────────────────────────────────────────────
            TAB 4: PORTAL DE RESERVAS
        ───────────────────────────────────────────────────────────────────────────── */}
        {activeTab === 'booking' && (
          <Row>
            <Col lg={8} className="mb-4">
              <Card className="shadow-sm border-0">
                <Card.Header className="bg-light py-3">
                  <h5 className="mb-0 fs-6 fw-bold">🌐 Portal Público de Agendamiento</h5>
                </Card.Header>
                <Card.Body className="p-4">
                  <div className="d-flex justify-content-between align-items-center p-3 bg-light rounded-3 mb-4 border">
                    <div>
                      <h6 className="mb-1 fw-bold">Estado del Portal de Reservas</h6>
                      <p className="text-muted mb-0 small">
                        Permite a tus clientas agendar citas directamente desde tu página web oficial.
                      </p>
                    </div>
                    <Form.Check
                      type="switch"
                      id="public-booking-switch"
                      checked={publicBookingEnabled}
                      onChange={(e) => handleTogglePublicBooking(e.target.checked)}
                      style={{ fontSize: '1.2rem' }}
                    />
                  </div>

                  <Form.Group className="mb-4">
                    <Form.Label className="fw-semibold">Enlace Directo de Reservas</Form.Label>
                    <InputGroup>
                      <Form.Control
                        type="text"
                        value={`${window.location.origin}/reservar`}
                        readOnly
                        className="bg-light"
                      />
                      <Button 
                        variant={copiedLink ? "success" : "outline-primary"}
                        onClick={handleCopyBookingLink}
                        className="d-flex align-items-center gap-2"
                      >
                        {copiedLink ? <FiCheck /> : <FiCopy />}
                        <span>{copiedLink ? 'Copiado' : 'Copiar'}</span>
                      </Button>
                      <Button
                        as="a"
                        href="/reservar"
                        target="_blank"
                        rel="noopener noreferrer"
                        variant="primary"
                        className="d-flex align-items-center gap-2"
                      >
                        <FiExternalLink />
                        <span>Abrir</span>
                      </Button>
                    </InputGroup>
                    <Form.Text className="text-muted">
                      Comparte este link en tu biografía de Instagram, WhatsApp o sitio web.
                    </Form.Text>
                  </Form.Group>
                </Card.Body>
              </Card>
            </Col>

            <Col lg={4} className="mb-4">
              <Card className="shadow-sm border-0 bg-primary text-white">
                <Card.Body className="p-4">
                  <h5 className="text-white fw-bold mb-3">📱 Experiencia de la Clienta</h5>
                  <p className="small mb-3 text-white-50">
                    El portal de reservas está optimizado para teléfonos móviles (PWA). Permite selección de servicios, horarios disponibles, verificación de teléfono y descarga de tarjeta a Google Wallet.
                  </p>
                  <Button 
                    variant="light" 
                    className="w-100 text-primary fw-bold"
                    as="a"
                    href="/reservar"
                    target="_blank"
                  >
                    Probar Flujo de Reserva
                  </Button>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        )}

        {/* ─────────────────────────────────────────────────────────────────────────────
            TAB 5: WHATSAPP & HANDOFF
        ───────────────────────────────────────────────────────────────────────────── */}
        {activeTab === 'whatsapp' && (
          <Row>
            <Col lg={8} className="mb-4">
              <Card className="shadow-sm border-0">
                <Card.Header className="bg-light py-3">
                  <h5 className="mb-0 fs-6 fw-bold">💬 Asistente WhatsApp &amp; Derivación Humana</h5>
                </Card.Header>
                <Card.Body className="p-4">
                  <div className="d-flex justify-content-between align-items-center p-3 bg-light rounded-3 mb-4 border">
                    <div>
                      <h6 className="mb-1 fw-bold">Habilitar Derivación a Operadora (Handoff)</h6>
                      <p className="text-muted mb-0 small">
                        Cuando el cliente solicita hablar con una persona, el bot envía un enlace de contacto directo.
                      </p>
                    </div>
                    <Form.Check
                      type="switch"
                      id="whatsapp-handoff-switch"
                      checked={settings.whatsappHandoffEnabled}
                      onChange={(e) => handleChange('whatsappHandoffEnabled', e.target.checked)}
                      style={{ fontSize: '1.2rem' }}
                    />
                  </div>

                  <Row className="g-3 mb-3">
                    <Col md={6}>
                      <Form.Group>
                        <Form.Label className="fw-semibold">Teléfono de Derivación (Operadora)</Form.Label>
                        <Form.Control
                          type="text"
                          value={settings.whatsappHumanNumber}
                          onChange={(e) => handleChange('whatsappHumanNumber', e.target.value)}
                          placeholder="+56983692046"
                        />
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group>
                        <Form.Label className="fw-semibold">Nombre Visible de la Operadora</Form.Label>
                        <Form.Control
                          type="text"
                          value={settings.whatsappHumanDisplayName}
                          onChange={(e) => handleChange('whatsappHumanDisplayName', e.target.value)}
                          placeholder="Atención BunnyCure"
                        />
                      </Form.Group>
                    </Col>
                  </Row>

                  <Form.Group className="mb-3">
                    <Form.Label className="fw-semibold">Mensaje de Derivación al Cliente</Form.Label>
                    <Form.Control
                      as="textarea"
                      rows={2}
                      value={settings.whatsappHandoffClientMessage}
                      onChange={(e) => handleChange('whatsappHandoffClientMessage', e.target.value)}
                    />
                  </Form.Group>

                  <Form.Group className="mb-3">
                    <Form.Label className="fw-semibold">Prefijo de Asistencia Pre-rellenado</Form.Label>
                    <Form.Control
                      type="text"
                      value={settings.whatsappHandoffAdminPrefill}
                      onChange={(e) => handleChange('whatsappHandoffAdminPrefill', e.target.value)}
                    />
                  </Form.Group>

                  <hr className="my-4" />

                  <h6 className="fw-bold mb-3">⏰ Estrategia de Recordatorios Automáticos</h6>
                  <Form.Group>
                    <Form.Select
                      value={settings.reminderStrategy}
                      onChange={(e) => handleChange('reminderStrategy', e.target.value as BusinessSettings['reminderStrategy'])}
                    >
                      <option value="TWO_HOURS">2 Horas antes de la cita (Recomendado)</option>
                      <option value="MORNING">En la mañana del mismo día (08:30 AM)</option>
                      <option value="DAY_BEFORE">El día anterior (18:00 PM)</option>
                      <option value="BOTH">Doble recordatorio (Día anterior + 2 Horas antes)</option>
                    </Form.Select>
                  </Form.Group>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        )}

        {/* ─────────────────────────────────────────────────────────────────────────────
            TAB 6: NOTIFICACIONES & PLANTILLAS
        ───────────────────────────────────────────────────────────────────────────── */}
        {activeTab === 'notifications' && (
          <Row>
            <Col lg={12} className="mb-4">
              <Card className="shadow-sm border-0 mb-4">
                <Card.Header className="bg-light py-3">
                  <h5 className="mb-0 fs-6 fw-bold">🔔 Notificaciones Web Push (Navegador)</h5>
                </Card.Header>
                <Card.Body className="p-4">
                  <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-3 p-3 bg-light rounded-3 border">
                    <div>
                      <h6 className="mb-1 fw-bold">Alertas en Tiempo Real en tu Computador o Móvil</h6>
                      <p className="text-muted mb-0 small">
                        Estado actual: <strong>{permission === 'granted' ? '✅ Concedido' : permission === 'denied' ? '❌ Denegado' : '⏳ Pendiente'}</strong>
                      </p>
                    </div>
                    <div className="d-flex gap-2">
                      <Button
                        variant="outline-primary"
                        onClick={handleRequestNotificationPermission}
                      >
                        Solicitar Permisos
                      </Button>
                      <Button
                        variant="outline-secondary"
                        onClick={handleSendTestNotification}
                        disabled={permission !== 'granted'}
                      >
                        Enviar Prueba
                      </Button>
                    </div>
                  </div>
                </Card.Body>
              </Card>

              <Card className="shadow-sm border-0">
                <Card.Header className="bg-light py-3">
                  <h5 className="mb-0 fs-6 fw-bold">📝 Plantillas de Mensajes WhatsApp</h5>
                </Card.Header>
                <Card.Body className="p-4">
                  <NotificationTemplatesSection />
                </Card.Body>
              </Card>
            </Col>
          </Row>
        )}

        {/* ─────────────────────────────────────────────────────────────────────────────
            TAB 7: PROGRAMA DE FIDELIZACIÓN
        ───────────────────────────────────────────────────────────────────────────── */}
        {activeTab === 'loyalty' && (
          <Row>
            <Col lg={8} className="mb-4">
              <Card className="shadow-sm border-0">
                <Card.Header className="bg-primary text-white py-3">
                  <h5 className="mb-0 fs-6 fw-bold text-white">⭐ Configuración de Fidelización &amp; Sellos</h5>
                </Card.Header>
                <Card.Body className="p-4">
                  <p className="mb-3">
                    El sistema de fidelización de BunnyCure acumula sellos en las visitas 1 a 10. Al alcanzar 10 sellos, la visita #11 aplica un premio exclusivo configurable.
                  </p>
                  <div className="d-flex gap-3">
                    <Button 
                      variant="primary" 
                      onClick={() => navigate('/settings/loyalty')}
                      className="d-flex align-items-center gap-2"
                    >
                      <FiAward />
                      <span>Gestionar Premios y Ranking de Clientas</span>
                    </Button>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        )}
      </Container>
    </DashboardLayout>
  );
}
