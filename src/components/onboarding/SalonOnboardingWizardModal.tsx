import { useState, useEffect } from 'react';
import { 
  Building2, 
  Clock, 
  Scissors, 
  Users, 
  ArrowRight, 
  ArrowLeft, 
  Check, 
  Copy, 
  Share2, 
  ExternalLink, 
  X,
  Phone,
  MapPin,
  CheckCircle2,
  Plus,
  Trash2,
  CalendarCheck,
  Loader2
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useTenant } from '../../context/TenantContext';
import { settingsApi, SettingsData } from '../../api/settings.api';
import { servicesApi } from '../../api/services.api';
import { usersApi } from '../../api/users.api';
import { useToast } from '../../hooks/useToast';
import { ServiceFormData } from '../../types/service.types';

export interface SalonOnboardingWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCompleted?: () => void;
}

interface PresetService {
  id: string;
  name: string;
  category: string;
  durationMinutes: number;
  price: number;
  description: string;
  selected: boolean;
}

const PRESET_SERVICES_CATALOG: PresetService[] = [
  {
    id: 'p1',
    name: 'Manicura Rusa / Combinada',
    category: 'Manicura',
    durationMinutes: 60,
    price: 18000,
    description: 'Limpieza profunda de cutículas con torno y acabado pulcro.',
    selected: true,
  },
  {
    id: 'p2',
    name: 'Esmaltado Permanente',
    category: 'Manicura',
    durationMinutes: 45,
    price: 15000,
    description: 'Esmaltado en gel curado en lámpara LED con duración 2-3 semanas.',
    selected: true,
  },
  {
    id: 'p3',
    name: 'Kapping en Gel / Acrigel',
    category: 'Estructura',
    durationMinutes: 75,
    price: 24000,
    description: 'Capa protectora fortalecedora sobre uña natural para evitar quiebres.',
    selected: true,
  },
  {
    id: 'p4',
    name: 'Retiro de Esmaltado o Acrílico',
    category: 'Retiro',
    durationMinutes: 30,
    price: 6000,
    description: 'Remoción segura sin dañar la lámina ungueal.',
    selected: true,
  },
  {
    id: 'p5',
    name: 'Pedicura Spa Completa',
    category: 'Pedicura',
    durationMinutes: 60,
    price: 22000,
    description: 'Exfoliación, hidratación profunda, tratamiento de talones y esmaltado.',
    selected: false,
  },
  {
    id: 'p6',
    name: 'Diseño Nail Art por Uña',
    category: 'Diseño',
    durationMinutes: 15,
    price: 2500,
    description: 'Mano alzada, cristalería, foil o degradados artísticos.',
    selected: false,
  },
];

export default function SalonOnboardingWizardModal({
  isOpen,
  onClose,
  onCompleted,
}: SalonOnboardingWizardModalProps) {
  const { tenant, refreshTenant } = useTenant();
  const toast = useToast();

  const [currentStep, setCurrentStep] = useState<number>(1);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isLoadingInitialData, setIsLoadingInitialData] = useState<boolean>(false);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);

  // ─── Paso 1: Identidad ───
  const [businessName, setBusinessName] = useState<string>(tenant?.name || '');
  const [businessSlogan, setBusinessSlogan] = useState<string>(tenant?.slogan || 'Especialistas en Manicura & Belleza');
  const [businessPhone, setBusinessPhone] = useState<string>(tenant?.phone || '+56 9 ');
  const [businessAddress, setBusinessAddress] = useState<string>(tenant?.address || 'Santiago, Chile');
  const [appointmentDuration, setAppointmentDuration] = useState<number>(60);

  // ─── Paso 2: Horarios ───
  const [daysConfig, setDaysConfig] = useState({
    monday: { enabled: true, start: '10:00', end: '19:30' },
    tuesday: { enabled: true, start: '10:00', end: '19:30' },
    wednesday: { enabled: true, start: '10:00', end: '19:30' },
    thursday: { enabled: true, start: '10:00', end: '19:30' },
    friday: { enabled: true, start: '10:00', end: '19:30' },
    saturday: { enabled: true, start: '10:00', end: '18:00' },
    sunday: { enabled: false, start: '11:00', end: '16:00' },
  });

  // ─── Paso 3: Servicios ───
  const [presetServices, setPresetServices] = useState<PresetService[]>(PRESET_SERVICES_CATALOG);
  const [customServiceName, setCustomServiceName] = useState('');
  const [customServicePrice, setCustomServicePrice] = useState('18000');
  const [customServiceDuration, setCustomServiceDuration] = useState('60');

  // ─── Paso 4: Especialistas ───
  const [specialists, setSpecialists] = useState<string[]>([
    'Especialista Principal',
    'Colaboradora Nail Art'
  ]);
  const [newSpecialistName, setNewSpecialistName] = useState('');

  // Cargar configuraciones reales, servicios reales y colaboradores al abrir el asistente
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    setIsLoadingInitialData(true);

    const loadInitialData = async () => {
      try {
        const [settingsRes, servicesRes, usersRes] = await Promise.allSettled([
          settingsApi.getAll(),
          servicesApi.list(false),
          usersApi.list(),
        ]);

        if (!isMounted) return;

        // 1. Configuraciones de identidad y horarios del negocio
        if (settingsRes.status === 'fulfilled' && settingsRes.value) {
          const data = settingsRes.value;

          if (data.businessName) {
            setBusinessName(data.businessName);
          } else if (tenant?.name) {
            setBusinessName(tenant.name);
          }

          if (data.businessPhone) {
            setBusinessPhone(data.businessPhone);
          } else if (tenant?.phone) {
            setBusinessPhone(tenant.phone);
          }

          if (data.businessAddress) {
            setBusinessAddress(data.businessAddress);
          } else if (tenant?.address) {
            setBusinessAddress(tenant.address);
          }

          if (data.appointmentDuration) {
            setAppointmentDuration(data.appointmentDuration);
          }

          setDaysConfig((prev) => ({
            monday: {
              enabled: data.mondayEnabled ?? prev.monday.enabled,
              start: data.mondayStart || prev.monday.start,
              end: data.mondayEnd || prev.monday.end,
            },
            tuesday: {
              enabled: data.tuesdayEnabled ?? prev.tuesday.enabled,
              start: data.tuesdayStart || prev.tuesday.start,
              end: data.tuesdayEnd || prev.tuesday.end,
            },
            wednesday: {
              enabled: data.wednesdayEnabled ?? prev.wednesday.enabled,
              start: data.wednesdayStart || prev.wednesday.start,
              end: data.wednesdayEnd || prev.wednesday.end,
            },
            thursday: {
              enabled: data.thursdayEnabled ?? prev.thursday.enabled,
              start: data.thursdayStart || prev.thursday.start,
              end: data.thursdayEnd || prev.thursday.end,
            },
            friday: {
              enabled: data.fridayEnabled ?? prev.friday.enabled,
              start: data.fridayStart || prev.friday.start,
              end: data.fridayEnd || prev.friday.end,
            },
            saturday: {
              enabled: data.saturdayEnabled ?? prev.saturday.enabled,
              start: data.saturdayStart || prev.saturday.start,
              end: data.saturdayEnd || prev.saturday.end,
            },
            sunday: {
              enabled: data.sundayEnabled ?? prev.sunday.enabled,
              start: data.sundayStart || prev.sunday.start,
              end: data.sundayEnd || prev.sunday.end,
            },
          }));
        } else if (tenant) {
          if (tenant.name) setBusinessName(tenant.name);
          if (tenant.phone) setBusinessPhone(tenant.phone);
          if (tenant.address) setBusinessAddress(tenant.address);
        }

        // 2. Servicios ya configurados en la base de datos
        if (servicesRes.status === 'fulfilled' && servicesRes.value && servicesRes.value.length > 0) {
          const loaded: PresetService[] = servicesRes.value.map((s) => ({
            id: String(s.id),
            name: s.name,
            category: 'Servicio',
            durationMinutes: s.durationMinutes,
            price: Number(s.price),
            description: s.description || '',
            selected: s.active,
          }));
          setPresetServices(loaded);
        }

        // 3. Especialistas existentes
        if (usersRes.status === 'fulfilled' && usersRes.value && usersRes.value.length > 0) {
          const userNames = usersRes.value
            .map((u) => u.fullName?.trim() || u.username?.trim())
            .filter((n): n is string => Boolean(n && n.length > 0));
          if (userNames.length > 0) {
            setSpecialists(userNames);
          }
        }
      } catch (err) {
        console.warn('Error al cargar datos en asistente de salón:', err);
      } finally {
        if (isMounted) {
          setIsLoadingInitialData(false);
        }
      }
    };

    loadInitialData();

    return () => {
      isMounted = false;
    };
  }, [isOpen, tenant]);

  if (!isOpen) return null;

  // URL pública de reservas calculada
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const bookingSlug = tenant?.slug || 'mi-salon';
  const publicBookingUrl = `${origin}/reservar?salon=${bookingSlug}`;

  // ─── Handlers de Horarios ───
  const handleToggleDay = (day: keyof typeof daysConfig) => {
    setDaysConfig((prev) => ({
      ...prev,
      [day]: { ...prev[day], enabled: !prev[day].enabled },
    }));
  };

  const handleChangeDayTime = (
    day: keyof typeof daysConfig,
    field: 'start' | 'end',
    value: string
  ) => {
    setDaysConfig((prev) => ({
      ...prev,
      [day]: { ...prev[day], [field]: value },
    }));
  };

  const handleApplyMondayToAll = () => {
    const monday = daysConfig.monday;
    setDaysConfig((prev) => ({
      ...prev,
      tuesday: { ...prev.tuesday, start: monday.start, end: monday.end },
      wednesday: { ...prev.wednesday, start: monday.start, end: monday.end },
      thursday: { ...prev.thursday, start: monday.start, end: monday.end },
      friday: { ...prev.friday, start: monday.start, end: monday.end },
      saturday: { ...prev.saturday, start: monday.start, end: monday.end },
      sunday: { ...prev.sunday, start: monday.start, end: monday.end },
    }));
    toast.success('Horario de lunes aplicado a toda la semana');
  };

  // ─── Handlers de Servicios ───
  const handleTogglePresetService = (id: string) => {
    setPresetServices((prev) =>
      prev.map((s) => (s.id === id ? { ...s, selected: !s.selected } : s))
    );
  };

  const handleAddCustomService = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customServiceName.trim()) {
      toast.warning('Ingresa el nombre del servicio');
      return;
    }
    const newService: PresetService = {
      id: `custom-${Date.now()}`,
      name: customServiceName.trim(),
      category: 'Personalizado',
      durationMinutes: parseInt(customServiceDuration, 10) || 60,
      price: parseInt(customServicePrice.replace(/\D/g, ''), 10) || 15000,
      description: 'Servicio agregado manualmente en asistente inicial.',
      selected: true,
    };
    setPresetServices((prev) => [...prev, newService]);
    setCustomServiceName('');
    toast.success(`Servicio "${newService.name}" agregado`);
  };

  // ─── Handlers de Especialistas ───
  const handleAddSpecialist = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSpecialistName.trim()) return;
    setSpecialists((prev) => [...prev, newSpecialistName.trim()]);
    setNewSpecialistName('');
  };

  const handleRemoveSpecialist = (index: number) => {
    if (specialists.length <= 1) {
      toast.warning('Debe existir al menos un puesto o especialista en el salón');
      return;
    }
    setSpecialists((prev) => prev.filter((_, i) => i !== index));
  };

  // ─── Guardar Configuración Consolidada ───
  const handleSaveAndFinish = async () => {
    setIsSaving(true);
    try {
      // 1. Guardar configuraciones del negocio en backend
      const settingsPayload: SettingsData = {
        businessName: businessName.trim() || 'Mi Salón de Belleza',
        businessPhone: businessPhone.trim(),
        businessAddress: businessAddress.trim(),
        appointmentDuration: appointmentDuration || 60,
        mondayEnabled: daysConfig.monday.enabled,
        mondayStart: daysConfig.monday.start,
        mondayEnd: daysConfig.monday.end,
        tuesdayEnabled: daysConfig.tuesday.enabled,
        tuesdayStart: daysConfig.tuesday.start,
        tuesdayEnd: daysConfig.tuesday.end,
        wednesdayEnabled: daysConfig.wednesday.enabled,
        wednesdayStart: daysConfig.wednesday.start,
        wednesdayEnd: daysConfig.wednesday.end,
        thursdayEnabled: daysConfig.thursday.enabled,
        thursdayStart: daysConfig.thursday.start,
        thursdayEnd: daysConfig.thursday.end,
        fridayEnabled: daysConfig.friday.enabled,
        fridayStart: daysConfig.friday.start,
        fridayEnd: daysConfig.friday.end,
        saturdayEnabled: daysConfig.saturday.enabled,
        saturdayStart: daysConfig.saturday.start,
        saturdayEnd: daysConfig.saturday.end,
        sundayEnabled: daysConfig.sunday.enabled,
        sundayStart: daysConfig.sunday.start,
        sundayEnd: daysConfig.sunday.end,
      };

      await settingsApi.saveAll(settingsPayload);

      // 2. Crear o actualizar servicios seleccionados
      let syncedCount = 0;
      for (let i = 0; i < presetServices.length; i++) {
        const s = presetServices[i];
        const numId = Number(s.id);
        const isExisting = !isNaN(numId) && numId > 0;

        if (isExisting) {
          const payload: ServiceFormData = {
            name: s.name,
            description: s.description,
            durationMinutes: s.durationMinutes,
            price: s.price,
            displayOrder: i + 1,
            active: s.selected,
          };
          try {
            await servicesApi.update(numId, payload);
            syncedCount++;
          } catch (err) {
            console.warn(`No se pudo actualizar servicio ${s.name}:`, err);
          }
        } else if (s.selected) {
          const payload: ServiceFormData = {
            name: s.name,
            description: s.description,
            durationMinutes: s.durationMinutes,
            price: s.price,
            displayOrder: i + 1,
            active: true,
          };
          try {
            await servicesApi.create(payload);
            syncedCount++;
          } catch (err) {
            console.warn(`No se pudo crear automáticamente el servicio ${s.name}:`, err);
          }
        }
      }

      // 3. Marcar onboarding como completado en localStorage
      const storageKey = `bunny_onboarding_completed_${bookingSlug}`;
      localStorage.setItem(storageKey, 'true');

      // 4. Refrescar branding
      await refreshTenant();

      toast.success(
        `¡Salón configurado con éxito! Se sincronizaron ${syncedCount} servicios y los horarios del negocio.`
      );

      if (onCompleted) {
        onCompleted();
      }
      onClose();
    } catch (err) {
      console.error('Error al guardar la configuración inicial:', err);
      toast.error('Ocurrió un inconveniente al guardar. Por favor, reintenta.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(publicBookingUrl);
    setCopiedLink(true);
    toast.success('¡Enlace de reservas copiado al portapapeles!');
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleShareWhatsApp = () => {
    const text = encodeURIComponent(
      `¡Hola! Ya puedes agendar tu cita online en ${businessName || 'nuestro salón'} directamente desde aquí: ${publicBookingUrl}`
    );
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  const dayLabels: Record<keyof typeof daysConfig, string> = {
    monday: 'Lunes',
    tuesday: 'Martes',
    wednesday: 'Miércoles',
    thursday: 'Jueves',
    friday: 'Viernes',
    saturday: 'Sábado',
    sunday: 'Domingo',
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-fadeIn">
      <div 
        className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-[#F0E0D8] overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ─── Encabezado del Wizard con Barra de Progreso ─── */}
        <div className="bg-gradient-to-r from-[#FDF0EC] via-white to-[#FDF0EC] p-5 sm:p-6 border-b border-[#F0E0D8] shrink-0">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <span className="text-2xl">✨</span>
              <div>
                <h2 className="text-lg sm:text-xl font-extrabold text-[#5C3D2E] tracking-tight">
                  Configuración Inicial de tu Salón
                </h2>
                <p className="text-xs text-[#9E7B6E]">
                  Paso {currentStep} de 5: {
                    currentStep === 1 ? 'Identidad y Contacto' :
                    currentStep === 2 ? 'Horarios de Atención' :
                    currentStep === 3 ? 'Catálogo de Servicios' :
                    currentStep === 4 ? 'Equipo y Colaboradores' :
                    '¡Lanzamiento y Código QR!'
                  }
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              type="button"
              className="text-[#9E7B6E] hover:text-[#5C3D2E] p-1.5 rounded-full hover:bg-white/80 transition-colors"
              title="Cerrar asistente"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Stepper Visual */}
          <div className="flex items-center justify-between gap-1 sm:gap-2">
            {[1, 2, 3, 4, 5].map((stepNum) => {
              const isPast = stepNum < currentStep;
              const isCurrent = stepNum === currentStep;
              return (
                <div key={stepNum} className="flex-1 flex flex-col items-center gap-1">
                  <div
                    className={`h-2 w-full rounded-full transition-all duration-300 ${
                      isPast
                        ? 'bg-[#4B856E]'
                        : isCurrent
                        ? 'bg-[#C9897A] shadow-xs'
                        : 'bg-[#F0E0D8]'
                    }`}
                  />
                  <span
                    className={`text-[10px] font-bold ${
                      isCurrent ? 'text-[#7C3A2D]' : isPast ? 'text-[#4B856E]' : 'text-[#C5B3AA]'
                    }`}
                  >
                    {stepNum === 1 ? 'Identidad' :
                     stepNum === 2 ? 'Horarios' :
                     stepNum === 3 ? 'Servicios' :
                     stepNum === 4 ? 'Equipo' : 'Listo'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* ─── Contenedor Scrollable del Paso Actual ─── */}
        <div className="p-5 sm:p-7 overflow-y-auto space-y-6 flex-1 text-sm text-[#5C3D2E]">
          {isLoadingInitialData && (
            <div className="flex items-center gap-2.5 p-3 bg-[#FAF4F0] border border-[#E8D5CE] rounded-xl text-xs text-[#7A5B50] animate-pulse">
              <Loader2 className="w-4 h-4 animate-spin text-[#C9897A] shrink-0" />
              <span>Cargando configuración actual y servicios registrados...</span>
            </div>
          )}

          {/* PASO 1: IDENTIDAD */}
          {currentStep === 1 && (
            <div className="space-y-4 animate-fadeIn">
              <div className="bg-[#FAF8F5] p-3.5 rounded-2xl border border-[#F0E0D8] text-xs text-[#7A5B50] flex gap-3 items-center">
                <Building2 className="w-5 h-5 text-[#C9897A] shrink-0" />
                <span>
                  Ingresa los datos esenciales de tu salón. Esta información aparecerá en tu página de reservas y en los mensajes automáticos enviados a tus clientas.
                </span>
              </div>

              <div className="space-y-3.5">
                <div>
                  <label className="block text-xs font-bold text-[#5C3D2E] mb-1">
                    Nombre del Salón o Estudio *
                  </label>
                  <input
                    type="text"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    placeholder="Ej: BunnyCure Nails & Beauty"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#E8CFC4] bg-white focus:outline-none focus:ring-2 focus:ring-[#C9897A] text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#5C3D2E] mb-1">
                    Eslogan o Especialidad
                  </label>
                  <input
                    type="text"
                    value={businessSlogan}
                    onChange={(e) => setBusinessSlogan(e.target.value)}
                    placeholder="Ej: Expertas en Manicura Rusa, Kapping y Pestañas"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#E8CFC4] bg-white focus:outline-none focus:ring-2 focus:ring-[#C9897A] text-sm"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-bold text-[#5C3D2E] mb-1 flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5 text-[#C9897A]" /> Teléfono / WhatsApp de Atención *
                    </label>
                    <input
                      type="text"
                      value={businessPhone}
                      onChange={(e) => setBusinessPhone(e.target.value)}
                      placeholder="+56 9 1234 5678"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#E8CFC4] bg-white focus:outline-none focus:ring-2 focus:ring-[#C9897A] text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#5C3D2E] mb-1 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-[#C9897A]" /> Duración Base por Cita
                    </label>
                    <select
                      value={appointmentDuration}
                      onChange={(e) => setAppointmentDuration(Number(e.target.value))}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#E8CFC4] bg-white focus:outline-none focus:ring-2 focus:ring-[#C9897A] text-sm"
                    >
                      <option value={30}>30 minutos</option>
                      <option value={45}>45 minutos</option>
                      <option value={60}>60 minutos (Estándar)</option>
                      <option value={90}>90 minutos</option>
                      <option value={120}>120 minutos</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#5C3D2E] mb-1 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-[#C9897A]" /> Dirección Física y Comuna
                  </label>
                  <input
                    type="text"
                    value={businessAddress}
                    onChange={(e) => setBusinessAddress(e.target.value)}
                    placeholder="Ej: Av. Providencia 1234, Of. 402, Providencia, Santiago"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#E8CFC4] bg-white focus:outline-none focus:ring-2 focus:ring-[#C9897A] text-sm"
                  />
                </div>
              </div>
            </div>
          )}

          {/* PASO 2: HORARIOS */}
          {currentStep === 2 && (
            <div className="space-y-4 animate-fadeIn">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-[#FAF8F5] p-3.5 rounded-2xl border border-[#F0E0D8]">
                <div className="text-xs text-[#7A5B50] flex gap-2 items-center">
                  <Clock className="w-4 h-4 text-[#C9897A] shrink-0" />
                  <span>Define los días y horas en que tu salón está disponible para agendar.</span>
                </div>
                <button
                  type="button"
                  onClick={handleApplyMondayToAll}
                  className="text-xs font-bold text-[#7C3A2D] bg-[#FDF0EC] hover:bg-[#F9E2DB] border border-[#E8CFC4] px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap"
                >
                  Copiar Lunes a toda la semana
                </button>
              </div>

              <div className="space-y-2 border border-[#F0E0D8] rounded-2xl p-3 bg-white divide-y divide-[#F0E0D8]/60">
                {(Object.keys(daysConfig) as Array<keyof typeof daysConfig>).map((dayKey) => {
                  const day = daysConfig[dayKey];
                  return (
                    <div key={dayKey} className="pt-2 pb-2 first:pt-0 last:pb-0 flex items-center justify-between gap-3 flex-wrap">
                      <div className="flex items-center gap-3 w-32">
                        <input
                          type="checkbox"
                          id={`day-${dayKey}`}
                          checked={day.enabled}
                          onChange={() => handleToggleDay(dayKey)}
                          className="w-4 h-4 rounded-md text-[#C9897A] focus:ring-[#C9897A] border-[#E8CFC4]"
                        />
                        <label
                          htmlFor={`day-${dayKey}`}
                          className={`text-xs font-bold cursor-pointer ${
                            day.enabled ? 'text-[#5C3D2E]' : 'text-[#A6887D] line-through'
                          }`}
                        >
                          {dayLabels[dayKey]}
                        </label>
                      </div>

                      {day.enabled ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="time"
                            value={day.start}
                            onChange={(e) => handleChangeDayTime(dayKey, 'start', e.target.value)}
                            className="px-2 py-1 text-xs rounded-lg border border-[#E8CFC4] bg-white text-[#5C3D2E]"
                          />
                          <span className="text-xs text-[#9E7B6E]">a</span>
                          <input
                            type="time"
                            value={day.end}
                            onChange={(e) => handleChangeDayTime(dayKey, 'end', e.target.value)}
                            className="px-2 py-1 text-xs rounded-lg border border-[#E8CFC4] bg-white text-[#5C3D2E]"
                          />
                        </div>
                      ) : (
                        <span className="text-xs text-[#A6887D] italic">Cerrado</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* PASO 3: CATÁLOGO DE SERVICIOS */}
          {currentStep === 3 && (
            <div className="space-y-4 animate-fadeIn">
              <div className="bg-[#FAF8F5] p-3.5 rounded-2xl border border-[#F0E0D8] text-xs text-[#7A5B50] flex gap-3 items-center">
                <Scissors className="w-5 h-5 text-[#C9897A] shrink-0" />
                <span>
                  Selecciona los servicios iniciales con los que quieres comenzar. Podrás editarlos o añadir más en cualquier momento desde la sección de Servicios.
                </span>
              </div>

              {/* Lista de Servicios Predefinidos Populares */}
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {presetServices.map((s) => (
                  <div
                    key={s.id}
                    onClick={() => handleTogglePresetService(s.id)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                      s.selected
                        ? 'border-[#C9897A] bg-[#FDF0EC]/60 shadow-xs'
                        : 'border-[#F0E0D8] bg-white hover:bg-[#FAF8F5] opacity-75'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-5 h-5 rounded-md flex items-center justify-center transition-colors ${
                          s.selected ? 'bg-[#C9897A] text-white' : 'border border-[#E8CFC4] bg-white'
                        }`}
                      >
                        {s.selected && <Check className="w-3.5 h-3.5" />}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-[#5C3D2E]">{s.name}</div>
                        <div className="text-[11px] text-[#9E7B6E]">{s.description}</div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-xs font-extrabold text-[#7C3A2D]">
                        ${s.price.toLocaleString('es-CL')}
                      </div>
                      <div className="text-[10px] text-[#9E7B6E]">{s.durationMinutes} min</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Formulario Rápido para añadir servicio personalizado */}
              <div className="pt-2 border-t border-[#F0E0D8]">
                <div className="text-xs font-bold text-[#7C3A2D] mb-2 flex items-center gap-1.5">
                  <Plus className="w-3.5 h-3.5" /> ¿Deseas añadir otro servicio ahora?
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                  <div className="sm:col-span-5">
                    <input
                      type="text"
                      placeholder="Nombre del servicio"
                      value={customServiceName}
                      onChange={(e) => setCustomServiceName(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg border border-[#E8CFC4] bg-white text-xs"
                    />
                  </div>
                  <div className="sm:col-span-3">
                    <input
                      type="number"
                      placeholder="Precio CLP"
                      value={customServicePrice}
                      onChange={(e) => setCustomServicePrice(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg border border-[#E8CFC4] bg-white text-xs"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <select
                      value={customServiceDuration}
                      onChange={(e) => setCustomServiceDuration(e.target.value)}
                      className="w-full px-2 py-1.5 rounded-lg border border-[#E8CFC4] bg-white text-xs"
                    >
                      <option value="30">30 min</option>
                      <option value="45">45 min</option>
                      <option value="60">60 min</option>
                      <option value="90">90 min</option>
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <button
                      type="button"
                      onClick={handleAddCustomService}
                      className="w-full py-1.5 bg-[#C9897A] text-white text-xs font-bold rounded-lg hover:bg-[#B77768] transition-colors"
                    >
                      Añadir
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* PASO 4: ESPECIALISTAS */}
          {currentStep === 4 && (
            <div className="space-y-4 animate-fadeIn">
              <div className="bg-[#FAF8F5] p-3.5 rounded-2xl border border-[#F0E0D8] text-xs text-[#7A5B50] flex gap-3 items-center">
                <Users className="w-5 h-5 text-[#C9897A] shrink-0" />
                <span>
                  Configura a las manicuristas o puestos de atención. Las clientas podrán seleccionar a su especialista preferida al reservar.
                </span>
              </div>

              <div className="space-y-2">
                {specialists.map((name, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 rounded-xl border border-[#F0E0D8] bg-white shadow-xs"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#FDF0EC] text-[#7C3A2D] font-bold text-xs flex items-center justify-center border border-[#E8CFC4]">
                        {index + 1}
                      </div>
                      <span className="text-xs font-bold text-[#5C3D2E]">{name}</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveSpecialist(index)}
                      className="text-[#9E7B6E] hover:text-rose-600 p-1 transition-colors"
                      title="Eliminar especialista"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex gap-2 pt-2">
                <input
                  type="text"
                  placeholder="Nombre de otra manicurista o colaboradora..."
                  value={newSpecialistName}
                  onChange={(e) => setNewSpecialistName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddSpecialist(e);
                    }
                  }}
                  className="flex-1 px-3.5 py-2 rounded-xl border border-[#E8CFC4] bg-white text-xs"
                />
                <button
                  type="button"
                  onClick={handleAddSpecialist}
                  className="px-4 py-2 bg-[#FAF8F5] hover:bg-[#FDF0EC] border border-[#E8CFC4] text-[#7C3A2D] font-bold text-xs rounded-xl transition-colors"
                >
                  Agregar
                </button>
              </div>
            </div>
          )}

          {/* PASO 5: LISTO / LANZAMIENTO */}
          {currentStep === 5 && (
            <div className="space-y-5 animate-fadeIn text-center">
              <div className="inline-flex p-3 rounded-full bg-[#e8f7ee] text-[#128C7E] mb-1">
                <CheckCircle2 className="w-10 h-10" />
              </div>

              <div>
                <h3 className="text-xl font-extrabold text-[#5C3D2E]">
                  ¡Todo Listo para Recibir Reservas!
                </h3>
                <p className="text-xs text-[#9E7B6E] max-w-md mx-auto mt-1">
                  Tu salón <strong>{businessName}</strong> ya cuenta con sus servicios y horarios iniciales configurados.
                </p>
              </div>

              {/* Tarjeta de Código QR y Enlace */}
              <div className="bg-[#FAF8F5] border border-[#F0E0D8] rounded-2xl p-5 max-w-sm mx-auto shadow-sm flex flex-col items-center">
                <div className="bg-white p-3 rounded-xl border border-[#E8CFC4] shadow-xs mb-3">
                  <QRCodeSVG 
                    value={publicBookingUrl} 
                    size={150}
                    level="H"
                    includeMargin={true}
                  />
                </div>
                <div className="text-xs font-bold text-[#5C3D2E] mb-1">
                  Código QR de Reservas
                </div>
                <div className="text-[11px] text-[#9E7B6E] mb-3">
                  Imprímelo o colócalo en tu mostrador o vitrina.
                </div>

                {/* Enlace y botón copiar */}
                <div className="w-full flex items-center gap-1.5 p-1.5 rounded-lg border border-[#E8CFC4] bg-white text-xs mb-3">
                  <span className="truncate flex-1 text-left px-2 text-[#7A5B50] text-[11px]">
                    {publicBookingUrl}
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="p-1.5 rounded-md bg-[#FDF0EC] text-[#7C3A2D] hover:bg-[#F9E2DB] transition-colors shrink-0"
                    title="Copiar enlace"
                  >
                    {copiedLink ? <Check className="w-3.5 h-3.5 text-[#4B856E]" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>

                <div className="flex gap-2 w-full">
                  <button
                    type="button"
                    onClick={handleShareWhatsApp}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-[#25D366] text-white text-xs font-bold hover:bg-[#20bd5a] transition-colors shadow-xs"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span>WhatsApp</span>
                  </button>

                  <a
                    href={publicBookingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-white border border-[#E8CFC4] text-[#5C3D2E] text-xs font-bold hover:bg-[#FDF0EC] transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Ver Portal</span>
                  </a>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ─── Footer de Navegación del Wizard ─── */}
        <div className="bg-[#FAF8F5] p-4 sm:p-5 border-t border-[#F0E0D8] flex items-center justify-between shrink-0">
          {currentStep > 1 ? (
            <button
              type="button"
              onClick={() => setCurrentStep((prev) => prev - 1)}
              disabled={isSaving}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-[#E8CFC4] bg-white text-xs font-bold text-[#5C3D2E] hover:bg-[#FDF0EC] transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Anterior</span>
            </button>
          ) : (
            <div />
          )}

          {currentStep < 5 ? (
            <button
              type="button"
              onClick={() => {
                if (currentStep === 1 && !businessName.trim()) {
                  toast.warning('Ingresa el nombre de tu salón');
                  return;
                }
                setCurrentStep((prev) => prev + 1);
              }}
              className="inline-flex items-center gap-1.5 px-6 py-2.5 rounded-xl bg-[#C9897A] hover:bg-[#B77768] text-white text-xs font-bold transition-all shadow-bunny active:scale-98"
            >
              <span>Siguiente</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSaveAndFinish}
              disabled={isSaving}
              className="inline-flex items-center gap-2 px-7 py-2.5 rounded-xl bg-[#4B856E] hover:bg-[#3f705d] text-white text-xs font-bold transition-all shadow-md active:scale-98"
            >
              <CalendarCheck className="w-4 h-4" />
              <span>{isSaving ? 'Guardando en la nube...' : 'Finalizar y Entrar al Panel'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
