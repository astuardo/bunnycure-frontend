/**
 * Página de Configuración del Negocio (Rediseño Fase 3)
 * Organizada en pestañas temáticas: Identidad & Marca, Horarios & Agenda, Bloqueos,
 * Portal de Reservas, WhatsApp & Handoff, Notificaciones & Plantillas y Fidelización.
 */

import { useState, useEffect, useCallback } from 'react';
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
import { WhatsAppMetaSection } from '../../components/settings/WhatsAppMetaSection';
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
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';

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
  reminderHoursAhead: number;
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
  reminderHoursAhead: 12,
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

type TabType = 'identity' | 'hours' | 'blocks' | 'booking' | 'whatsapp' | 'notifications' | 'loyalty';

export default function SettingsPage() {
  const toast = useToast();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { tenant, refreshTenant } = useTenant();

  const [settings, setSettings] = useState<BusinessSettings>(defaultSettings);
  const [loading, setLoading] = useState<boolean>(false);
  const [initialLoading, setInitialLoading] = useState<boolean>(true);
  const [hasChanges, setHasChanges] = useState<boolean>(false);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [publicBookingEnabled, setPublicBookingEnabledState] = useState<boolean>(getPublicBookingEnabled());

  const activeTab = (searchParams.get('tab') as TabType) || 'identity';

  const {
    permission,
    isSubscribed,
    isLoading: isPushLoading,
    subscribe,
    unsubscribe,
    sendTestNotification,
    sendServerTestPush,
  } = useNotificationPermission();

  const handleTabChange = (tab: TabType) => {
    setSearchParams({ tab });
  };

  const handleTogglePublicBooking = (enabled: boolean) => {
    setPublicBookingEnabled(enabled);
    setPublicBookingEnabledState(enabled);
    toast.success(
      enabled 
        ? 'Portal público de reservas activado' 
        : 'Portal público de reservas pausado'
    );
  };

  const loadSettings = useCallback(async () => {
    try {
      const data = await settingsApi.getAll();
      
      let savedCalendarDisplay = DEFAULT_CALENDAR_DISPLAY_CONFIG;
      try {
        const rawCalendarDisplay = localStorage.getItem(CALENDAR_DISPLAY_STORAGE_KEY);
        if (rawCalendarDisplay) {
          savedCalendarDisplay = {
            ...DEFAULT_CALENDAR_DISPLAY_CONFIG,
            ...JSON.parse(rawCalendarDisplay),
          };
        }
      } catch (err) {
        console.warn('Error reading calendarDisplay config:', err);
      }

      setSettings({
        businessName: data.businessName || tenant?.name || defaultSettings.businessName,
        slogan: defaultSettings.slogan,
        email: data.businessEmail || defaultSettings.email,
        phone: data.businessPhone || defaultSettings.phone,
        address: data.businessAddress || defaultSettings.address,
        customDomain: tenant?.customDomain || defaultSettings.customDomain,
        slug: tenant?.slug || defaultSettings.slug,
        logoUrl: tenant?.logoUrl || defaultSettings.logoUrl,
        primaryColor: tenant?.primaryColor || defaultSettings.primaryColor,
        workingHours: {
          monday: { 
            start: data.mondayStart || '09:00', 
            end: data.mondayEnd || '18:00', 
            enabled: data.mondayEnabled ?? true 
          },
          tuesday: { 
            start: data.tuesdayStart || '09:00', 
            end: data.tuesdayEnd || '18:00', 
            enabled: data.tuesdayEnabled ?? true 
          },
          wednesday: { 
            start: data.wednesdayStart || '09:00', 
            end: data.wednesdayEnd || '18:00', 
            enabled: data.wednesdayEnabled ?? true 
          },
          thursday: { 
            start: data.thursdayStart || '09:00', 
            end: data.thursdayEnd || '18:00', 
            enabled: data.thursdayEnabled ?? true 
          },
          friday: { 
            start: data.fridayStart || '09:00', 
            end: data.fridayEnd || '18:00', 
            enabled: data.fridayEnabled ?? true 
          },
          saturday: { 
            start: data.saturdayStart || '09:00', 
            end: data.saturdayEnd || '14:00', 
            enabled: data.saturdayEnabled ?? true 
          },
          sunday: { 
            start: data.sundayStart || '10:00', 
            end: data.sundayEnd || '14:00', 
            enabled: data.sundayEnabled ?? false 
          },
        },
        appointmentDuration: data.appointmentDuration || 60,
        notificationsEnabled: data.emailNotificationsEnabled ?? true,
        whatsappEnabled: true,
        whatsappPhone: data.whatsappNumber || data.businessPhone || defaultSettings.whatsappPhone,
        reminderStrategy: data.reminderStrategy || 'TWO_HOURS',
        reminderHoursAhead: data.reminderHoursAhead ?? 12,
        whatsappHandoffEnabled: data.whatsappHandoffEnabled ?? true,
        whatsappHumanNumber: data.whatsappHumanNumber || defaultSettings.whatsappHumanNumber,
        whatsappHumanDisplayName: data.whatsappHumanDisplayName || defaultSettings.whatsappHumanDisplayName,
        whatsappHandoffClientMessage: data.whatsappHandoffClientMessage || defaultSettings.whatsappHandoffClientMessage,
        whatsappHandoffAdminPrefill: data.whatsappHandoffAdminPrefill || defaultSettings.whatsappHandoffAdminPrefill,
        unavailabilities: data.unavailabilities && data.unavailabilities.length > 0 
          ? data.unavailabilities 
          : loadCachedUnavailabilities(),
        unavailabilityColors: data.unavailabilityColors 
          ? data.unavailabilityColors 
          : loadCachedUnavailabilityColors(),
        unavailabilityNotifications: data.unavailabilityNotifications 
          ? data.unavailabilityNotifications 
          : loadCachedUnavailabilityNotifications(),
        calendarDisplay: savedCalendarDisplay,
      });
      setHasChanges(false);
    } catch (error) {
      console.error('Error loading settings:', error);
      toast.error('Error al cargar la configuración');
    } finally {
      setInitialLoading(false);
    }
  }, [tenant, toast]);

  useEffect(() => {
    void (async () => {
      await loadSettings();
    })();
  }, [loadSettings]);

  const handleChange = <K extends keyof BusinessSettings>(field: K, value: BusinessSettings[K]) => {
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
        reminderHoursAhead: settings.reminderHoursAhead,
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

  const handleTogglePushSubscription = async () => {
    try {
      if (isSubscribed) {
        await unsubscribe();
        toast.success('Dispositivo desuscrito de notificaciones push');
      } else {
        await subscribe();
        toast.success('✅ ¡Dispositivo suscrito con éxito a notificaciones push!');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al actualizar suscripción';
      toast.error(msg);
    }
  };

  const handleSendTestNotification = async () => {
    toast.info('Enviando notificación de prueba...');
    const success = await sendServerTestPush();
    if (success) {
      toast.success('🚀 Notificación push enviada desde el servidor');
    } else {
      sendTestNotification(
        `🐰 ${settings.businessName}`,
        '¡Notificación de prueba local! Las alertas están funcionando correctamente.'
      );
      toast.success('Notificación de prueba mostrada');
    }
  };

  const tabs: Array<{ key: TabType; label: string; icon: React.ReactNode }> = [
    { key: 'identity', label: 'Identidad & Marca', icon: <FiGlobe /> },
    { key: 'hours', label: 'Horarios & Agenda', icon: <FiClock /> },
    { key: 'blocks', label: 'Bloqueos & Feriados', icon: <FiSlash /> },
    { key: 'booking', label: 'Portal de Reservas', icon: <FiEye /> },
    { key: 'whatsapp', label: 'WhatsApp & Handoff', icon: <FaWhatsapp /> },
    { key: 'notifications', label: 'Notificaciones', icon: <FiBell /> },
    { key: 'loyalty', label: 'Fidelización', icon: <FiAward /> },
  ];

  if (initialLoading) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center py-24 text-bunny-text-muted">
          <Spinner size="lg" className="mb-3" />
          <p className="text-sm font-medium">Cargando configuración del salón...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 lg:p-8 space-y-6 pb-12 max-w-7xl mx-auto">
        {/* Encabezado y Barra de Guardado */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-bunny-text tracking-tight flex items-center gap-2">
              <FiSettings className="text-bunny-primary" />
              Configuración del Salón
            </h1>
            <p className="text-sm text-bunny-text-muted mt-1">
              Administra la identidad de tu negocio, horarios de atención, WhatsApp y portal de reservas
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <a
              href="/reservar"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-xl border border-bunny-border bg-white text-bunny-text hover:bg-bunny-paper transition-all"
            >
              <FiExternalLink />
              <span>Ver Portal Público</span>
            </a>
            <Button
              onClick={handleSave}
              disabled={!hasChanges || loading}
              isLoading={loading}
              leftIcon={<FiSave />}
            >
              Guardar Cambios
            </Button>
          </div>
        </div>

        {hasChanges && (
          <div className="p-4 rounded-xl border border-amber-300 bg-amber-50 text-amber-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm text-xs">
            <div>
              <strong>⚠️ Tienes modificaciones pendientes:</strong> Recuerda pulsar <strong>"Guardar Cambios"</strong> para que surtan efecto en el sistema.
            </div>
            <Button size="sm" variant="warning" onClick={handleSave} disabled={loading}>
              Guardar ahora
            </Button>
          </div>
        )}

        {/* Pestañas de Configuración */}
        <div className="flex flex-wrap gap-1.5 p-1.5 bg-white rounded-2xl shadow-bunny border border-bunny-border">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => handleTabChange(tab.key)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                activeTab === tab.key
                  ? 'bg-bunny-primary text-white shadow-sm'
                  : 'text-bunny-text hover:bg-bunny-paper'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* TAB 1: IDENTIDAD & MARCA */}
        {activeTab === 'identity' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-7">
              <Card className="h-full">
                <Card.Header>
                  <Card.Title>🏢 Datos Generales del Salón</Card.Title>
                </Card.Header>
                <Card.Body className="space-y-4">
                  <div>
                    <label htmlFor="settings-nombre-comercial-del-salon" className="block text-xs font-semibold text-bunny-text uppercase tracking-wider mb-1">
                      Nombre Comercial del Salón
                    </label>
                    <input id="settings-nombre-comercial-del-salon"
                      type="text"
                      value={settings.businessName}
                      onChange={(e) => handleChange('businessName', e.target.value)}
                      placeholder="Ej: BunnyCure Studio"
                      className="w-full rounded-xl border border-bunny-border bg-white px-3.5 py-2 text-xs text-bunny-text focus:outline-none focus:ring-2 focus:ring-bunny-primary/20 focus:border-bunny-primary"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="settings-correo-electronico-oficial" className="block text-xs font-semibold text-bunny-text uppercase tracking-wider mb-1">
                        Correo Electrónico Oficial
                      </label>
                      <input id="settings-correo-electronico-oficial"
                        type="email"
                        value={settings.email}
                        onChange={(e) => handleChange('email', e.target.value)}
                        placeholder="contacto@bunnycure.cl"
                        className="w-full rounded-xl border border-bunny-border bg-white px-3.5 py-2 text-xs text-bunny-text focus:outline-none focus:ring-2 focus:ring-bunny-primary/20 focus:border-bunny-primary"
                      />
                    </div>
                    <div>
                      <label htmlFor="settings-telefono-whatsapp-oficial" className="block text-xs font-semibold text-bunny-text uppercase tracking-wider mb-1">
                        Teléfono / WhatsApp Oficial
                      </label>
                      <input id="settings-telefono-whatsapp-oficial"
                        type="text"
                        value={settings.phone}
                        onChange={(e) => handleChange('phone', e.target.value)}
                        placeholder="+56983692046"
                        className="w-full rounded-xl border border-bunny-border bg-white px-3.5 py-2 text-xs text-bunny-text focus:outline-none focus:ring-2 focus:ring-bunny-primary/20 focus:border-bunny-primary"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="settings-direccion-fisica-del-salon" className="block text-xs font-semibold text-bunny-text uppercase tracking-wider mb-1">
                      Dirección Física del Salón
                    </label>
                    <input id="settings-direccion-fisica-del-salon"
                      type="text"
                      value={settings.address}
                      onChange={(e) => handleChange('address', e.target.value)}
                      placeholder="Av. Providencia 1234, Oficina 502, Santiago"
                      className="w-full rounded-xl border border-bunny-border bg-white px-3.5 py-2 text-xs text-bunny-text focus:outline-none focus:ring-2 focus:ring-bunny-primary/20 focus:border-bunny-primary"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="settings-dominio-propio-custom-domain" className="block text-xs font-semibold text-bunny-text uppercase tracking-wider mb-1">
                        Dominio Propio (Custom Domain)
                      </label>
                      <input id="settings-dominio-propio-custom-domain"
                        type="text"
                        value={settings.customDomain}
                        disabled
                        placeholder="app.bunnycure.cl"
                        className="w-full rounded-xl border border-bunny-border bg-bunny-paper px-3.5 py-2 text-xs text-bunny-text-muted cursor-not-allowed"
                      />
                      <span className="text-[11px] text-bunny-text-muted mt-0.5 block">
                        Configurado en el plan Multi-Tenant SaaS.
                      </span>
                    </div>
                    <div>
                      <label htmlFor="settings-identificador-slug" className="block text-xs font-semibold text-bunny-text uppercase tracking-wider mb-1">
                        Identificador (Slug)
                      </label>
                      <input id="settings-identificador-slug"
                        type="text"
                        value={settings.slug}
                        disabled
                        placeholder="bunnycure"
                        className="w-full rounded-xl border border-bunny-border bg-bunny-paper px-3.5 py-2 text-xs text-bunny-text-muted cursor-not-allowed"
                      />
                    </div>
                  </div>
                </Card.Body>
              </Card>
            </div>

            <div className="lg:col-span-5">
              <Card>
                <Card.Header>
                  <Card.Title>🎨 Color y Branding</Card.Title>
                </Card.Header>
                <Card.Body className="space-y-4">
                  <div>
                    <label htmlFor="settings-color-primario-de-marca" className="block text-xs font-semibold text-bunny-text uppercase tracking-wider mb-1.5">
                      Color Primario de Marca
                    </label>
                    <div className="flex items-center gap-3">
                      <input id="settings-color-primario-de-marca"
                        type="color"
                        value={settings.primaryColor}
                        onChange={(e) => handleChange('primaryColor', e.target.value)}
                        className="w-14 h-10 rounded-xl border border-bunny-border p-1 cursor-pointer bg-white"
                        title="Seleccionar color"
                      />
                      <input
                        type="text"
                        value={settings.primaryColor}
                        onChange={(e) => handleChange('primaryColor', e.target.value)}
                        placeholder="#d48b70"
                        className="flex-1 font-mono rounded-xl border border-bunny-border bg-white px-3.5 py-2 text-xs text-bunny-text focus:outline-none focus:ring-2 focus:ring-bunny-primary/20 focus:border-bunny-primary"
                      />
                    </div>
                  </div>

                  <div className="p-4 bg-bunny-paper/40 rounded-xl border border-bunny-border mt-3">
                    <span className="text-[10px] text-bunny-text-muted font-bold block uppercase tracking-wider mb-2">
                      VISTA PREVIA EN VIVO
                    </span>
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      <button
                        type="button"
                        style={{ backgroundColor: settings.primaryColor }}
                        className="px-4 py-2 rounded-xl text-white text-xs font-semibold shadow-sm"
                      >
                        Botón Principal
                      </button>
                      <span
                        style={{ backgroundColor: settings.primaryColor }}
                        className="px-2.5 py-1 rounded-full text-white text-xs font-semibold"
                      >
                        Insignia de Estado
                      </span>
                    </div>
                    <p className="text-[11px] text-bunny-text-muted mt-2">
                      Este color se aplicará dinámicamente a todos los botones, títulos y componentes de la PWA.
                    </p>
                  </div>
                </Card.Body>
              </Card>
            </div>
          </div>
        )}

        {/* TAB 2: HORARIOS & AGENDA */}
        {activeTab === 'hours' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-8">
              <Card>
                <Card.Header className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <Card.Title>🕒 Horarios de Atención Semanales</Card.Title>
                  <Badge variant="neutral">Zona Horaria: Santiago (CLT)</Badge>
                </Card.Header>
                <Card.Body className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-bunny-paper/60 text-bunny-text-muted font-semibold border-b border-bunny-border uppercase tracking-wider">
                        <tr>
                          <th className="py-3 px-4 w-32">Día</th>
                          <th className="py-3 px-4 w-32">Estado</th>
                          <th className="py-3 px-4">Apertura</th>
                          <th className="py-3 px-4">Cierre</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-bunny-border/30">
                        {(Object.keys(settings.workingHours) as Array<keyof BusinessSettings['workingHours']>).map((day) => {
                          const hours = settings.workingHours[day];
                          return (
                            <tr key={day} className={`hover:bg-bunny-paper/40 transition-colors ${!hours.enabled ? 'bg-bunny-paper/70 text-bunny-text-muted/70' : ''}`}>
                              <td className="py-3 px-4 font-semibold text-bunny-text">{dayNames[day]}</td>
                              <td className="py-3 px-4">
                                <label className="flex items-center gap-2 cursor-pointer font-medium text-xs">
                                  <input
                                    type="checkbox"
                                    className="w-4 h-4 rounded text-bunny-primary focus:ring-bunny-primary/30 border-bunny-border accent-bunny-primary"
                                    checked={hours.enabled}
                                    onChange={(e) => handleWorkingHoursChange(day, 'enabled', e.target.checked)}
                                  />
                                  <span>{hours.enabled ? 'Abierto' : 'Cerrado'}</span>
                                </label>
                              </td>
                              <td className="py-3 px-4">
                                <input
                                  type="time"
                                  value={hours.start}
                                  disabled={!hours.enabled}
                                  onChange={(e) => handleWorkingHoursChange(day, 'start', e.target.value)}
                                  className="w-32 rounded-lg border border-bunny-border bg-white px-2.5 py-1 text-xs text-bunny-text focus:outline-none focus:ring-1 focus:ring-bunny-primary disabled:bg-bunny-sand disabled:text-bunny-text-muted/70"
                                />
                              </td>
                              <td className="py-3 px-4">
                                <input
                                  type="time"
                                  value={hours.end}
                                  disabled={!hours.enabled}
                                  onChange={(e) => handleWorkingHoursChange(day, 'end', e.target.value)}
                                  className="w-32 rounded-lg border border-bunny-border bg-white px-2.5 py-1 text-xs text-bunny-text focus:outline-none focus:ring-1 focus:ring-bunny-primary disabled:bg-bunny-sand disabled:text-bunny-text-muted/70"
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
            </div>

            <div className="lg:col-span-4 space-y-6">
              <Card>
                <Card.Header>
                  <Card.Title>⏱️ Duración de Citas</Card.Title>
                </Card.Header>
                <Card.Body className="space-y-3">
                  <div>
                    <label htmlFor="settings-duracion-estandar-minutos" className="block text-xs font-semibold text-bunny-text uppercase tracking-wider mb-1">
                      Duración Estándar (Minutos)
                    </label>
                    <select id="settings-duracion-estandar-minutos"
                      value={settings.appointmentDuration}
                      onChange={(e) => handleChange('appointmentDuration', Number(e.target.value))}
                      className="w-full rounded-xl border border-bunny-border bg-white px-3.5 py-2 text-xs text-bunny-text focus:outline-none focus:ring-2 focus:ring-bunny-primary/20 focus:border-bunny-primary"
                    >
                      <option value={30}>30 minutos</option>
                      <option value={45}>45 minutos</option>
                      <option value={60}>60 minutos (1 hora)</option>
                      <option value={75}>75 minutos</option>
                      <option value={90}>90 minutos (1.5 horas)</option>
                      <option value={120}>120 minutos (2 horas)</option>
                    </select>
                    <span className="text-[11px] text-bunny-text-muted mt-1 block">
                      Se utiliza como bloque predeterminado al agendar nuevas citas.
                    </span>
                  </div>
                </Card.Body>
              </Card>

              <Card>
                <Card.Header>
                  <Card.Title>🎨 Franjas del Calendario</Card.Title>
                </Card.Header>
                <Card.Body className="space-y-3">
                  <div>
                    <label htmlFor="settings-manana" className="text-[10px] font-bold text-bunny-text-muted uppercase tracking-wider block mb-1">
                      MAÑANA
                    </label>
                    <div className="flex items-center gap-2">
                      <input id="settings-manana"
                        type="time"
                        value={settings.calendarDisplay.morning.start}
                        onChange={(e) => handleCalendarDisplayChange('morning', 'start', e.target.value)}
                        className="w-24 rounded-lg border border-bunny-border px-2 py-1 text-xs"
                      />
                      <span className="text-xs text-bunny-text-muted">a</span>
                      <input
                        type="time"
                        value={settings.calendarDisplay.morning.end}
                        onChange={(e) => handleCalendarDisplayChange('morning', 'end', e.target.value)}
                        className="w-24 rounded-lg border border-bunny-border px-2 py-1 text-xs"
                      />
                      <input
                        type="color"
                        value={settings.calendarDisplay.morning.color}
                        onChange={(e) => handleCalendarDisplayChange('morning', 'color', e.target.value)}
                        className="w-10 h-8 rounded-lg border border-bunny-border cursor-pointer p-0.5 bg-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="settings-tarde" className="text-[10px] font-bold text-bunny-text-muted uppercase tracking-wider block mb-1">
                      TARDE
                    </label>
                    <div className="flex items-center gap-2">
                      <input id="settings-tarde"
                        type="time"
                        value={settings.calendarDisplay.afternoon.start}
                        onChange={(e) => handleCalendarDisplayChange('afternoon', 'start', e.target.value)}
                        className="w-24 rounded-lg border border-bunny-border px-2 py-1 text-xs"
                      />
                      <span className="text-xs text-bunny-text-muted">a</span>
                      <input
                        type="time"
                        value={settings.calendarDisplay.afternoon.end}
                        onChange={(e) => handleCalendarDisplayChange('afternoon', 'end', e.target.value)}
                        className="w-24 rounded-lg border border-bunny-border px-2 py-1 text-xs"
                      />
                      <input
                        type="color"
                        value={settings.calendarDisplay.afternoon.color}
                        onChange={(e) => handleCalendarDisplayChange('afternoon', 'color', e.target.value)}
                        className="w-10 h-8 rounded-lg border border-bunny-border cursor-pointer p-0.5 bg-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="settings-noche" className="text-[10px] font-bold text-bunny-text-muted uppercase tracking-wider block mb-1">
                      NOCHE
                    </label>
                    <div className="flex items-center gap-2">
                      <input id="settings-noche"
                        type="time"
                        value={settings.calendarDisplay.night.start}
                        onChange={(e) => handleCalendarDisplayChange('night', 'start', e.target.value)}
                        className="w-24 rounded-lg border border-bunny-border px-2 py-1 text-xs"
                      />
                      <span className="text-xs text-bunny-text-muted">a</span>
                      <input
                        type="time"
                        value={settings.calendarDisplay.night.end}
                        onChange={(e) => handleCalendarDisplayChange('night', 'end', e.target.value)}
                        className="w-24 rounded-lg border border-bunny-border px-2 py-1 text-xs"
                      />
                      <input
                        type="color"
                        value={settings.calendarDisplay.night.color}
                        onChange={(e) => handleCalendarDisplayChange('night', 'color', e.target.value)}
                        className="w-10 h-8 rounded-lg border border-bunny-border cursor-pointer p-0.5 bg-white"
                      />
                    </div>
                  </div>
                </Card.Body>
              </Card>
            </div>
          </div>
        )}

        {/* TAB 3: BLOQUEOS & FERIADOS */}
        {activeTab === 'blocks' && (
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
        )}

        {/* TAB 4: PORTAL DE RESERVAS */}
        {activeTab === 'booking' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-8">
              <Card>
                <Card.Header>
                  <Card.Title>🌐 Portal Público de Agendamiento</Card.Title>
                </Card.Header>
                <Card.Body className="space-y-4">
                  <div className="flex justify-between items-center p-4 bg-bunny-paper/40 rounded-xl border border-bunny-border">
                    <div>
                      <h4 className="text-xs font-bold text-bunny-text uppercase tracking-wider">
                        Estado del Portal de Reservas
                      </h4>
                      <p className="text-xs text-bunny-text-muted mt-0.5">
                        Permite a tus clientas agendar citas directamente desde tu página web oficial.
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={publicBookingEnabled}
                        onChange={(e) => handleTogglePublicBooking(e.target.checked)}
                        className="w-5 h-5 rounded text-bunny-primary focus:ring-bunny-primary/30 border-bunny-border accent-bunny-primary cursor-pointer"
                      />
                    </label>
                  </div>

                  <div>
                    <label htmlFor="settings-enlace-directo-de-reservas" className="block text-xs font-semibold text-bunny-text uppercase tracking-wider mb-1.5">
                      Enlace Directo de Reservas
                    </label>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <input id="settings-enlace-directo-de-reservas"
                        type="text"
                        value={`${window.location.origin}/reservar`}
                        readOnly
                        className="flex-1 rounded-xl border border-bunny-border bg-bunny-paper px-3.5 py-2 text-xs font-mono text-bunny-text"
                      />
                      <Button
                        variant={copiedLink ? "success" : "outline"}
                        size="sm"
                        onClick={handleCopyBookingLink}
                        leftIcon={copiedLink ? <FiCheck /> : <FiCopy />}
                      >
                        {copiedLink ? 'Copiado' : 'Copiar'}
                      </Button>
                      <a
                        href="/reservar"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-bunny-primary text-white hover:bg-bunny-primary-hover shadow-bunny transition-all"
                      >
                        <FiExternalLink />
                        <span>Abrir</span>
                      </a>
                    </div>
                    <span className="text-[11px] text-bunny-text-muted mt-1 block">
                      Comparte este link en tu biografía de Instagram, WhatsApp o sitio web.
                    </span>
                  </div>
                </Card.Body>
              </Card>
            </div>

            <div className="lg:col-span-4">
              <div className="rounded-2xl shadow-bunny p-6 text-white bg-gradient-to-br from-bunny-primary to-bunny-cocoa-dark">
                <h3 className="text-base font-bold mb-2">📱 Experiencia de la Clienta</h3>
                <p className="text-xs text-white/90 leading-relaxed mb-4">
                  El portal de reservas está optimizado para teléfonos móviles (PWA). Permite selección de servicios, horarios disponibles, verificación de teléfono y descarga de tarjeta a Google Wallet.
                </p>
                <a
                  href="/reservar"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-white text-bunny-primary text-xs font-bold shadow-sm hover:bg-white/90 transition-all"
                >
                  Probar Flujo de Reserva
                </a>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: WHATSAPP & HANDOFF */}
        {activeTab === 'whatsapp' && (
          <div className="space-y-6">
            <WhatsAppMetaSection />

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-8">
                <Card>
                  <Card.Header>
                    <Card.Title>💬 Asistente WhatsApp &amp; Derivación Humana</Card.Title>
                  </Card.Header>
                  <Card.Body className="space-y-4">
                    <div className="flex justify-between items-center p-4 bg-bunny-paper/40 rounded-xl border border-bunny-border">
                      <div>
                        <h4 className="text-xs font-bold text-bunny-text uppercase tracking-wider">
                          Habilitar Derivación a Operadora (Handoff)
                        </h4>
                        <p className="text-xs text-bunny-text-muted mt-0.5">
                          Cuando el cliente solicita hablar con una persona, el bot envía un enlace de contacto directo.
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={settings.whatsappHandoffEnabled}
                        onChange={(e) => handleChange('whatsappHandoffEnabled', e.target.checked)}
                        className="w-5 h-5 rounded text-bunny-primary focus:ring-bunny-primary/30 border-bunny-border accent-bunny-primary cursor-pointer"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="settings-telefono-de-derivacion-operadora" className="block text-xs font-semibold text-bunny-text uppercase tracking-wider mb-1">
                          Teléfono de Derivación (Operadora)
                        </label>
                        <input id="settings-telefono-de-derivacion-operadora"
                          type="text"
                          value={settings.whatsappHumanNumber}
                          onChange={(e) => handleChange('whatsappHumanNumber', e.target.value)}
                          placeholder="+56983692046"
                          className="w-full rounded-xl border border-bunny-border bg-white px-3.5 py-2 text-xs text-bunny-text focus:outline-none focus:ring-2 focus:ring-bunny-primary/20 focus:border-bunny-primary"
                        />
                      </div>
                      <div>
                        <label htmlFor="settings-nombre-visible-de-la" className="block text-xs font-semibold text-bunny-text uppercase tracking-wider mb-1">
                          Nombre Visible de la Operadora
                        </label>
                        <input id="settings-nombre-visible-de-la"
                          type="text"
                          value={settings.whatsappHumanDisplayName}
                          onChange={(e) => handleChange('whatsappHumanDisplayName', e.target.value)}
                          placeholder="Atención BunnyCure"
                          className="w-full rounded-xl border border-bunny-border bg-white px-3.5 py-2 text-xs text-bunny-text focus:outline-none focus:ring-2 focus:ring-bunny-primary/20 focus:border-bunny-primary"
                        />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="settings-mensaje-de-derivacion-al" className="block text-xs font-semibold text-bunny-text uppercase tracking-wider mb-1">
                        Mensaje de Derivación al Cliente
                      </label>
                      <textarea id="settings-mensaje-de-derivacion-al"
                        rows={2}
                        value={settings.whatsappHandoffClientMessage}
                        onChange={(e) => handleChange('whatsappHandoffClientMessage', e.target.value)}
                        className="w-full rounded-xl border border-bunny-border bg-white px-3.5 py-2 text-xs text-bunny-text focus:outline-none focus:ring-2 focus:ring-bunny-primary/20 focus:border-bunny-primary"
                      />
                    </div>

                    <div>
                      <label htmlFor="settings-prefijo-de-asistencia-pre" className="block text-xs font-semibold text-bunny-text uppercase tracking-wider mb-1">
                        Prefijo de Asistencia Pre-rellenado
                      </label>
                      <input id="settings-prefijo-de-asistencia-pre"
                        type="text"
                        value={settings.whatsappHandoffAdminPrefill}
                        onChange={(e) => handleChange('whatsappHandoffAdminPrefill', e.target.value)}
                        className="w-full rounded-xl border border-bunny-border bg-white px-3.5 py-2 text-xs text-bunny-text focus:outline-none focus:ring-2 focus:ring-bunny-primary/20 focus:border-bunny-primary"
                      />
                    </div>

                    <hr className="border-bunny-border/50" />

                    <div>
                      <h4 className="text-xs font-bold text-bunny-text uppercase tracking-wider mb-2">
                        ⏰ Estrategia de Recordatorios Automáticos
                      </h4>
                      <div>
                        <label htmlFor="settings-momento-del-recordatorio" className="text-[11px] text-bunny-text-muted mb-1 block">Momento del recordatorio</label>
                        <select id="settings-momento-del-recordatorio"
                          value={settings.reminderStrategy}
                          onChange={(e) => handleChange('reminderStrategy', e.target.value as BusinessSettings['reminderStrategy'])}
                          className="w-full rounded-xl border border-bunny-border bg-white px-3.5 py-2 text-xs text-bunny-text focus:outline-none focus:ring-2 focus:ring-bunny-primary/20 focus:border-bunny-primary"
                        >
                          <option value="TWO_HOURS">Horas antes de la cita (Configurable)</option>
                          <option value="MORNING">En la mañana del mismo día (08:30 AM)</option>
                          <option value="DAY_BEFORE">El día anterior (18:00 PM)</option>
                          <option value="BOTH">Doble recordatorio (Día anterior + Horas antes)</option>
                        </select>
                      </div>

                      {(settings.reminderStrategy === 'TWO_HOURS' || settings.reminderStrategy === 'BOTH') && (
                        <div className="p-4 bg-bunny-paper/40 rounded-xl border border-bunny-border mt-3 space-y-2">
                          <label htmlFor="settings-horas-de-anticipacion-del" className="text-xs font-semibold text-bunny-text block">
                            ⏰ Horas de anticipación del recordatorio previo:
                          </label>
                          <div className="flex items-center gap-2">
                            <input id="settings-horas-de-anticipacion-del"
                              type="number"
                              min={1}
                              max={72}
                              value={settings.reminderHoursAhead ?? 12}
                              onChange={(e) => {
                                const val = parseInt(e.target.value, 10);
                                handleChange('reminderHoursAhead', isNaN(val) ? 12 : Math.max(1, Math.min(72, val)));
                              }}
                              className="w-24 rounded-lg border border-bunny-border bg-white px-3 py-1.5 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-bunny-primary"
                            />
                            <span className="text-xs text-bunny-text-muted">horas antes de la cita</span>
                          </div>
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {[1, 2, 6, 12, 24].map((hours) => (
                              <button
                                key={hours}
                                type="button"
                                className={`text-[11px] px-2.5 py-0.5 rounded-lg border font-medium transition-all ${
                                  settings.reminderHoursAhead === hours
                                    ? 'bg-bunny-primary text-white border-bunny-primary'
                                    : 'bg-white border-bunny-border text-bunny-text hover:bg-bunny-paper'
                                }`}
                                onClick={() => handleChange('reminderHoursAhead', hours)}
                              >
                                {hours}h
                              </button>
                            ))}
                          </div>
                          <span className="text-[11px] text-bunny-text-muted block mt-1">
                            El recordatorio automático se enviará cuando falten aproximadamente <strong>{settings.reminderHoursAhead ?? 12} horas</strong> para la cita.
                          </span>
                        </div>
                      )}
                    </div>
                  </Card.Body>
                </Card>
              </div>
            </div>
          </div>
        )}

        {/* TAB 6: NOTIFICACIONES & PLANTILLAS */}
        {activeTab === 'notifications' && (
          <div className="space-y-6">
            <Card>
              <Card.Header>
                <div className="flex items-center justify-between">
                  <Card.Title>🔔 Notificaciones Web Push (Nativo en Celular y Desktop)</Card.Title>
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                    isSubscribed
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                      : permission === 'granted'
                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                      : 'bg-bunny-sand text-bunny-text dark:bg-zinc-800 dark:text-bunny-text-muted/70'
                  }`}>
                    {isSubscribed ? '● Suscrito y Activo' : permission === 'granted' ? '● Permiso Concedido' : '● Sin Suscribir'}
                  </span>
                </div>
              </Card.Header>
              <Card.Body>
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border border-bunny-border bg-bunny-paper/40">
                    <div className="space-y-1">
                      <h4 className="text-sm font-semibold text-bunny-text">
                        Alertas y Recordatorios en Segundo Plano
                      </h4>
                      <p className="text-xs text-bunny-text-muted leading-relaxed">
                        Permiso del navegador: <strong>{permission === 'granted' ? '✅ Concedido' : permission === 'denied' ? '❌ Denegado' : '⏳ Pendiente'}</strong>
                        {' · '}
                        Servidor Web Push: <strong>{isSubscribed ? '🟢 Vinculado a este equipo' : '⚪ No vinculado'}</strong>
                      </p>
                      <p className="text-xs text-bunny-text-muted/80">
                        {isSubscribed
                          ? 'Este dispositivo recibirá avisos de citas y alertas del sistema aunque la app esté cerrada.'
                          : 'Activa las alertas para recibir recordatorios directos en la barra de notificaciones de tu teléfono.'}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      <Button
                        variant={isSubscribed ? 'outline' : 'primary'}
                        size="sm"
                        onClick={handleTogglePushSubscription}
                        disabled={isPushLoading}
                        className={!isSubscribed ? 'bg-pink-500 hover:bg-pink-600 text-white' : ''}
                      >
                        {isPushLoading
                          ? 'Procesando...'
                          : isSubscribed
                          ? 'Desactivar en este equipo'
                          : 'Activar en este Celular / PC'}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleSendTestNotification}
                        disabled={permission !== 'granted'}
                      >
                        Enviar Prueba Push
                      </Button>
                    </div>
                  </div>

                  <div className="text-xs text-bunny-text-muted bg-pink-50/50 dark:bg-pink-950/20 border border-pink-100 dark:border-pink-900/40 rounded-xl p-3">
                    💡 <strong>Consejo para celular (iOS / Android):</strong> En iPhone añade BunnyCure a la pantalla de inicio desde Safari (Compartir &gt; Agregar a Inicio) para habilitar notificaciones push nativas en iOS 16.4+. En Android funciona directo desde Chrome o la PWA instalada.
                  </div>
                </div>
              </Card.Body>
            </Card>

            <NotificationTemplatesSection />
          </div>
        )}

        {/* TAB 7: PROGRAMA DE FIDELIZACIÓN */}
        {activeTab === 'loyalty' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-8">
              <Card>
                <Card.Header>
                  <Card.Title>⭐ Configuración de Fidelización &amp; Sellos</Card.Title>
                </Card.Header>
                <Card.Body className="space-y-4">
                  <p className="text-xs text-bunny-text leading-relaxed">
                    El sistema de fidelización de BunnyCure acumula sellos en las visitas 1 a 10. Al alcanzar 10 sellos, la visita #11 aplica un premio exclusivo configurable.
                  </p>
                  <div>
                    <Button 
                      onClick={() => navigate('/settings/loyalty')}
                      leftIcon={<FiAward />}
                    >
                      Gestionar Premios y Ranking de Clientas
                    </Button>
                  </div>
                </Card.Body>
              </Card>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
