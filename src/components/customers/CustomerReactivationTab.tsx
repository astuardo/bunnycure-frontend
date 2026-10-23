import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FaWhatsapp,
  FaCopy,
  FaEye,
  FaCheckCircle,
  FaClock,
  FaTimes,
  FaCommentDots,
} from 'react-icons/fa';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Customer } from '@/types/customer.types';
import { Appointment } from '@/types/appointment.types';
import { ServiceCatalog } from '@/types/service.types';
import {
  InactiveCustomer,
  InactivityRange,
  ContactStatusFilter,
  ReactivationFilterOptions,
} from '@/types/reactivation.types';
import {
  computeInactiveCustomers,
  computeSummaryMetrics,
  filterInactiveCustomers,
  recordCustomerContact,
  buildReactivationMessage,
  buildReactivationWhatsAppUrl,
  BUNNYCURE_OFFICIAL_PHONE,
  clearCustomerContact,
} from '@/utils/reactivationUtils';
import { Button, Badge, Card, Spinner } from '@/components/ui';
import ReactivationMessageModal from './ReactivationMessageModal';
import { useToast } from '@/hooks/useToast';
import { confirmDialog } from '../ui/confirmDialog';

const TEMPLATE_SEND_STORAGE_KEY = 'bunnycure_reactivation_template_enabled_v1';

interface CustomerReactivationTabProps {
  customers: Customer[];
  appointments: Appointment[];
  services: ServiceCatalog[];
  loading?: boolean;
}

export default function CustomerReactivationTab({
  customers,
  appointments,
  services,
  loading = false,
}: CustomerReactivationTabProps) {
  const navigate = useNavigate();
  const toast = useToast();

  // Control Switch Maestro para Habilitar/Deshabilitar Envío Directo (1-clic) por Plantilla
  const [templateSendEnabled, setTemplateSendEnabled] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem(TEMPLATE_SEND_STORAGE_KEY);
      return stored !== null ? stored === 'true' : true;
    } catch {
      return true;
    }
  });

  const handleToggleTemplateSend = (enabled: boolean) => {
    setTemplateSendEnabled(enabled);
    try {
      localStorage.setItem(TEMPLATE_SEND_STORAGE_KEY, String(enabled));
    } catch (err) {
      console.error('Error saving template send setting:', err);
    }
    toast.info(
      enabled
        ? '✅ Envío de WhatsApp (1-clic) HABILITADO'
        : '⚪ Envío de WhatsApp (1-clic) DESHABILITADO (puedes seguir usando Personalizar y Copiar)'
    );
  };

  // Filtros
  const [inactivityRange, setInactivityRange] = useState<InactivityRange>('ALL_20_PLUS');
  const [selectedServiceId, setSelectedServiceId] = useState<number | 'ALL'>('ALL');
  const [contactStatus, setContactStatus] = useState<ContactStatusFilter>('ALL');
  const [search, setSearch] = useState('');

  // Control modal de personalización
  const [modalItem, setModalItem] = useState<InactiveCustomer | null>(null);
  const [showModal, setShowModal] = useState(false);

  // Forzar re-render tras registrar contacto
  const [contactCounter, setContactCounter] = useState(0);

  // 1. Calcular lista base de inactivas
  const allInactive = useMemo(() => {
    if (contactCounter < 0) return [];
    return computeInactiveCustomers(customers, appointments);
  }, [customers, appointments, contactCounter]);

  // 2. Calcular métricas KPI
  const metrics = useMemo(() => {
    return computeSummaryMetrics(allInactive);
  }, [allInactive]);

  // 3. Filtrar según opciones
  const filters: ReactivationFilterOptions = useMemo(
    () => ({
      inactivityRange,
      serviceId: selectedServiceId,
      contactStatus,
      search,
    }),
    [inactivityRange, selectedServiceId, contactStatus, search]
  );

  const filteredInactive = useMemo(() => {
    return filterInactiveCustomers(allInactive, filters);
  }, [allInactive, filters]);

  // Envío WhatsApp 1-clic directo
  const handleQuickWhatsApp = useCallback(
    async (item: InactiveCustomer) => {
      if (!templateSendEnabled) {
        toast.info('El envío 1-clic está desactivado. Usa "Personalizar" o "Copiar"');
        return;
      }

      if (item.isContactedRecently) {
        const confirmSend = await confirmDialog({
          title: 'Volver a contactar',
          message: `${item.customer.fullName} ya fue contactada hace ${item.daysSinceLastContact} día(s).\n¿Deseas volver a enviarle un mensaje por WhatsApp?`,
          confirmLabel: 'Enviar WhatsApp',
        });
        if (!confirmSend) return;
      }

      // Grabar contacto
      recordCustomerContact(item.customer.id, item.lastServiceName, 'WHATSAPP');
      setContactCounter((prev) => prev + 1);

      // Armar mensaje sugerido
      const message = buildReactivationMessage({
        customer: item.customer,
        lastServiceName: item.lastServiceName,
        daysSinceLast: item.daysSinceLastAppointment,
        tone: item.daysSinceLastAppointment >= 45 ? 'SPECIAL_OFFER' : item.daysSinceLastAppointment >= 30 ? 'MISS_YOU' : 'MAINTENANCE',
        businessPhone: BUNNYCURE_OFFICIAL_PHONE,
      });

      const url = buildReactivationWhatsAppUrl(item.customer.phone, message);
      window.open(url, '_blank', 'noopener,noreferrer');
      toast.success(`Abriendo WhatsApp para ${item.customer.fullName}`);
    },
    [templateSendEnabled, toast]
  );

  // Copiar mensaje rápido al portapapeles
  const handleQuickCopy = useCallback(
    async (item: InactiveCustomer) => {
      const message = buildReactivationMessage({
        customer: item.customer,
        lastServiceName: item.lastServiceName,
        daysSinceLast: item.daysSinceLastAppointment,
        tone: item.daysSinceLastAppointment >= 45 ? 'SPECIAL_OFFER' : item.daysSinceLastAppointment >= 30 ? 'MISS_YOU' : 'MAINTENANCE',
        businessPhone: BUNNYCURE_OFFICIAL_PHONE,
      });

      try {
        await navigator.clipboard.writeText(message);
        toast.success(`Mensaje copiado para ${item.customer.fullName}`);
      } catch {
        toast.error('Error al copiar al portapapeles');
      }
    },
    [toast]
  );

  const handleOpenCustomizeModal = (item: InactiveCustomer) => {
    setModalItem(item);
    setShowModal(true);
  };

  const handleResetContact = (customerId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    clearCustomerContact(customerId);
    setContactCounter((prev) => prev + 1);
    toast.info('Estado de contacto restablecido a disponible');
  };

  const getInactivityBadge = (days: number) => {
    if (days >= 45) {
      return <Badge variant="danger" className="px-2 py-1">🚨 {days} días (Crítica)</Badge>;
    }
    if (days >= 30) {
      return <Badge variant="warning" className="px-2 py-1">⚠️ {days} días (Seguimiento)</Badge>;
    }
    return <Badge variant="info" className="px-2 py-1">💅 {days} días (Mantención)</Badge>;
  };

  return (
    <div className="space-y-4">
      {/* Banner de Campaña Masiva Meta WhatsApp */}
      <Card className="border border-bunny-accent/40 bg-gradient-to-r from-pink-50/70 via-white to-pink-50/40 shadow-sm">
        <Card.Body className="p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <Badge variant="danger" className="text-[11px] bg-bunny-primary text-white">
                🚀 CAMPAÑA MASIVA WHATSAPP
              </Badge>
              <span className="font-bold text-bunny-dark text-sm sm:text-base">
                ¿Quieres reactivar a todas tus clientas inactivas en 1 clic?
              </span>
            </div>
            <p className="text-bunny-text-muted text-xs sm:text-sm mb-0 max-w-2xl">
              Usa la plantilla oficial de WhatsApp aprobada por Meta para llegar a todo tu segmento inactivo de forma automática con botones interactivos de reserva.
            </p>
          </div>
          <Button
            variant="primary"
            onClick={() => navigate('/marketing?template=bunnycure_reactivacion_clienta&audience=INACTIVE_30_DAYS')}
            className="whitespace-nowrap text-xs sm:text-sm font-semibold"
          >
            📣 Lanzar Campaña en 1 Clic &rarr;
          </Button>
        </Card.Body>
      </Card>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        <div
          onClick={() => setInactivityRange('ALL_20_PLUS')}
          className={`p-3.5 rounded-xl border bg-bunny-paper cursor-pointer transition-all ${
            inactivityRange === 'ALL_20_PLUS' ? 'ring-2 ring-bunny-primary border-transparent shadow-sm' : 'border-bunny-border hover:border-bunny-border-strong'
          }`}
        >
          <div className="text-bunny-text-muted text-xs font-semibold">Total Inactivas</div>
          <div className="text-2xl font-bold text-bunny-text my-0.5">{metrics.totalInactive20Plus}</div>
          <div className="text-[11px] text-bunny-text-muted/70">≥20 días sin agendar</div>
        </div>

        <div
          onClick={() => setInactivityRange('20_TO_29')}
          className={`p-3.5 rounded-xl border bg-sky-50/70 cursor-pointer transition-all ${
            inactivityRange === '20_TO_29' ? 'ring-2 ring-sky-500 border-transparent shadow-sm' : 'border-sky-200 hover:border-sky-300'
          }`}
        >
          <div className="text-sky-700 text-xs font-semibold">20 - 29 Días</div>
          <div className="text-2xl font-bold text-sky-700 my-0.5">{metrics.maintenance20To29}</div>
          <div className="text-[11px] text-sky-600/70">Ventana mantención</div>
        </div>

        <div
          onClick={() => setInactivityRange('30_TO_44')}
          className={`p-3.5 rounded-xl border bg-amber-50/70 cursor-pointer transition-all ${
            inactivityRange === '30_TO_44' ? 'ring-2 ring-amber-500 border-transparent shadow-sm' : 'border-amber-200 hover:border-amber-300'
          }`}
        >
          <div className="text-amber-700 text-xs font-semibold">30 - 44 Días</div>
          <div className="text-2xl font-bold text-amber-700 my-0.5">{metrics.followUp30To44}</div>
          <div className="text-[11px] text-amber-600/70">Alerta seguimiento</div>
        </div>

        <div
          onClick={() => setInactivityRange('45_PLUS')}
          className={`p-3.5 rounded-xl border bg-rose-50/70 cursor-pointer transition-all ${
            inactivityRange === '45_PLUS' ? 'ring-2 ring-rose-500 border-transparent shadow-sm' : 'border-rose-200 hover:border-rose-300'
          }`}
        >
          <div className="text-rose-700 text-xs font-semibold">45+ Días (Críticas)</div>
          <div className="text-2xl font-bold text-rose-700 my-0.5">{metrics.critical45Plus}</div>
          <div className="text-[11px] text-rose-600/70">Alto riesgo de fuga</div>
        </div>

        <div className="col-span-2 md:col-span-1 p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/70">
          <div className="text-emerald-700 text-xs font-semibold">Contactadas Recientemente</div>
          <div className="text-2xl font-bold text-emerald-700 my-0.5">{metrics.contactedRecently}</div>
          <div className="text-[11px] text-emerald-600/70">Últimos 7 días</div>
        </div>
      </div>

      {/* Switch Maestro de Envío Directo 1-Clic */}
      <Card className="border border-bunny-border shadow-sm bg-white">
        <Card.Body className="p-3.5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center text-xl shrink-0 transition-colors ${
                templateSendEnabled ? 'bg-emerald-100 text-emerald-600' : 'bg-bunny-sand text-bunny-text-muted/70'
              }`}
            >
              <FaWhatsapp />
            </div>
            <div>
              <div className="font-bold text-xs sm:text-sm flex items-center gap-2 text-bunny-text">
                <span>Envío Rápido de WhatsApp (1-clic) mediante Plantilla</span>
                <Badge variant={templateSendEnabled ? 'success' : 'secondary'}>
                  {templateSendEnabled ? '🟢 Habilitado' : '⚪ Deshabilitado'}
                </Badge>
              </div>
              <p className="text-bunny-text-muted text-xs mt-0.5 mb-0">
                {templateSendEnabled
                  ? 'El botón "WhatsApp" (1-clic) abrirá la plantilla en WhatsApp directamente (+56 9 8887 3031).'
                  : 'Envío en 1-clic apagado. Las opciones de "Personalizar" (modal) y "Copiar mensaje" continúan 100% activas.'}
              </p>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer shrink-0">
            <input
              type="checkbox"
              checked={templateSendEnabled}
              onChange={(e) => handleToggleTemplateSend(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-bunny-border peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-bunny-border-strong after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
            <span className="ml-2 text-xs font-semibold text-bunny-text select-none">
              {templateSendEnabled ? 'ON' : 'OFF'}
            </span>
          </label>
        </Card.Body>
      </Card>

      {/* Barra de Filtros */}
      <Card className="border border-bunny-border shadow-sm bg-white">
        <Card.Body className="p-3.5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-center">
            {/* Rango de Inactividad */}
            <div>
              <label htmlFor="customer-reactivation-dias-de-inactividad" className="block text-xs font-semibold text-bunny-text-muted mb-1">📅 Días de Inactividad:</label>
              <select id="customer-reactivation-dias-de-inactividad"
                value={inactivityRange}
                onChange={(e) => setInactivityRange(e.target.value as InactivityRange)}
                className="w-full text-xs rounded-lg border border-bunny-border-strong p-2 focus:outline-none focus:ring-1 focus:ring-bunny-primary"
              >
                <option value="ALL_20_PLUS">Todos los Inactivos (≥20 días)</option>
                <option value="20_TO_29">20 - 29 días (Mantención Ideal)</option>
                <option value="30_TO_44">30 - 44 días (Seguimiento)</option>
                <option value="45_PLUS">45+ días (Crítico / Fuga)</option>
              </select>
            </div>

            {/* Servicio Previo */}
            <div>
              <label htmlFor="customer-reactivation-servicio-previo" className="block text-xs font-semibold text-bunny-text-muted mb-1">💅 Servicio Previo:</label>
              <select id="customer-reactivation-servicio-previo"
                value={selectedServiceId}
                onChange={(e) => {
                  const val = e.target.value;
                  setSelectedServiceId(val === 'ALL' ? 'ALL' : Number(val));
                }}
                className="w-full text-xs rounded-lg border border-bunny-border-strong p-2 focus:outline-none focus:ring-1 focus:ring-bunny-primary"
              >
                <option value="ALL">Todos los servicios</option>
                {services.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Estado Anti-Spam */}
            <div>
              <label htmlFor="customer-reactivation-estado-anti-spam" className="block text-xs font-semibold text-bunny-text-muted mb-1">🛡️ Estado Anti-Spam:</label>
              <select id="customer-reactivation-estado-anti-spam"
                value={contactStatus}
                onChange={(e) => setContactStatus(e.target.value as ContactStatusFilter)}
                className="w-full text-xs rounded-lg border border-bunny-border-strong p-2 focus:outline-none focus:ring-1 focus:ring-bunny-primary"
              >
                <option value="ALL">Todas las clientas</option>
                <option value="UNCONTACTED">🟢 Solo disponibles (Sin contactar)</option>
                <option value="CONTACTED_RECENTLY">🟡 Contactadas recientemente (&lt;7d)</option>
              </select>
            </div>

            {/* Búsqueda por Texto */}
            <div>
              <label htmlFor="customer-reactivation-buscar-clienta" className="block text-xs font-semibold text-bunny-text-muted mb-1">🔍 Buscar Clienta:</label>
              <div className="relative">
                <input id="customer-reactivation-buscar-clienta"
                  type="text"
                  placeholder="Nombre, teléfono o RUT..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full text-xs rounded-lg border border-bunny-border-strong p-2 pr-8 focus:outline-none focus:ring-1 focus:ring-bunny-primary"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-bunny-text-muted/70 hover:text-bunny-text-muted"
                  >
                    <FaTimes size={12} />
                  </button>
                )}
              </div>
            </div>
          </div>
        </Card.Body>
      </Card>

      {/* Lista de Resultados */}
      <Card className="border border-bunny-border shadow-sm bg-white overflow-hidden">
        <Card.Header className="bg-bunny-paper border-b border-bunny-border py-3 px-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <h5 className="font-bold text-sm sm:text-base text-bunny-text mb-0">Clientas Inactivas para Reactivación</h5>
            <Badge variant="secondary">
              {filteredInactive.length} resultado(s)
            </Badge>
          </div>
          {(inactivityRange !== 'ALL_20_PLUS' || selectedServiceId !== 'ALL' || contactStatus !== 'ALL' || search) && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setInactivityRange('ALL_20_PLUS');
                setSelectedServiceId('ALL');
                setContactStatus('ALL');
                setSearch('');
              }}
              className="text-xs py-1 px-2.5"
            >
              Limpiar Filtros
            </Button>
          )}
        </Card.Header>

        <Card.Body className="p-0">
          {loading ? (
            <div className="text-center py-12">
              <Spinner size="lg" className="border-bunny-primary mx-auto" />
              <p className="mt-2 text-bunny-text-muted text-xs">Cargando historial de citas y clientes...</p>
            </div>
          ) : filteredInactive.length === 0 ? (
            <div className="text-center py-12 px-4">
              <FaCheckCircle className="text-emerald-500 text-4xl mx-auto mb-2 opacity-80" />
              <p className="text-bunny-text font-semibold mb-1 text-sm">No hay clientas inactivas que coincidan con los filtros.</p>
              <small className="text-bunny-text-muted/70">¡Excelente trabajo manteniendo a las clientas agendadas!</small>
            </div>
          ) : (
            <>
              {/* Vista Desktop: Tabla */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead className="bg-bunny-paper border-b border-bunny-border text-bunny-text-muted font-semibold text-xs uppercase tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Clienta / Contacto</th>
                      <th className="py-3 px-4">Último Servicio Realizado</th>
                      <th className="py-3 px-4 text-center">Días Inactiva</th>
                      <th className="py-3 px-4">Estado Anti-Spam</th>
                      <th className="py-3 px-4 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-bunny-border">
                    {filteredInactive.map((item) => (
                      <tr key={item.customer.id} className="hover:bg-bunny-paper/60 transition-colors">
                        {/* Clienta */}
                        <td className="py-3 px-4">
                          <div className="font-semibold text-bunny-text text-sm">{item.customer.fullName}</div>
                          <div className="text-xs text-bunny-text-muted flex gap-2 mt-0.5">
                            <span>📱 {item.customer.phone || 'Sin teléfono'}</span>
                            {item.customer.rut && <span>• RUT: {item.customer.rut}</span>}
                          </div>
                          {item.customer.instagram && (
                            <div className="text-xs text-bunny-primary mt-0.5">
                              📸 {item.customer.instagram.startsWith('@') ? item.customer.instagram : `@${item.customer.instagram}`}
                            </div>
                          )}
                        </td>

                        {/* Último Servicio */}
                        <td className="py-3 px-4">
                          <div className="font-semibold text-xs text-bunny-text truncate max-w-[220px]">
                            {item.lastServiceName}
                          </div>
                          <div className="text-xs text-bunny-text-muted">
                            {item.lastAppointmentDate
                              ? `Atendida el ${format(item.lastAppointmentDate, 'dd/MM/yyyy', { locale: es })}`
                              : 'Registrada sin cita previa'}
                          </div>
                          <div className="text-[11px] text-bunny-text-muted/70">Visitas completadas: {item.totalCompletedVisits}</div>
                        </td>

                        {/* Días Inactiva */}
                        <td className="py-3 px-4 text-center">{getInactivityBadge(item.daysSinceLastAppointment)}</td>

                        {/* Estado Anti-Spam */}
                        <td className="py-3 px-4">
                          {item.isContactedRecently ? (
                            <div>
                              <Badge variant="warning" className="inline-flex items-center gap-1">
                                <FaClock /> Hace {item.daysSinceLastContact}d
                              </Badge>
                              <div className="mt-1">
                                <button
                                  type="button"
                                  className="text-[11px] text-bunny-text-muted/70 hover:text-bunny-text-muted underline"
                                  onClick={(e) => handleResetContact(item.customer.id, e)}
                                >
                                  Restablecer
                                </button>
                              </div>
                            </div>
                          ) : (
                            <Badge variant="success" className="inline-flex items-center gap-1">
                              <FaCheckCircle /> Disponible
                            </Badge>
                          )}
                        </td>

                        {/* Acciones */}
                        <td className="py-3 px-4 text-right">
                          <div className="inline-flex items-center gap-1.5">
                            {/* Botón WhatsApp 1-clic */}
                            <button
                              type="button"
                              disabled={!templateSendEnabled}
                              onClick={() => handleQuickWhatsApp(item)}
                              title={
                                templateSendEnabled
                                  ? 'Enviar mensaje WhatsApp en 1-clic'
                                  : "Envío 1-clic desactivado. Usa 'Personalizar' o 'Copiar'"
                              }
                              className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg transition-all ${
                                templateSendEnabled
                                  ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm'
                                  : 'bg-bunny-border text-bunny-text-muted/70 cursor-not-allowed'
                              }`}
                            >
                              <FaWhatsapp />
                              <span>WhatsApp</span>
                            </button>

                            {/* Botón Personalizar */}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenCustomizeModal(item)}
                              title="Previsualizar o personalizar mensaje"
                              className="p-1.5"
                            >
                              <FaCommentDots />
                            </Button>

                            {/* Botón Copiar */}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleQuickCopy(item)}
                              title="Copiar mensaje al portapapeles"
                              className="p-1.5"
                            >
                              <FaCopy />
                            </Button>

                            {/* Botón Ver Ficha */}
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => navigate(`/customers/${item.customer.id}`)}
                              title="Ver ficha completa de cliente"
                              className="p-1.5"
                            >
                              <FaEye />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Vista Móvil: Tarjetas */}
              <div className="md:hidden p-3 space-y-3">
                {filteredInactive.map((item) => (
                  <div key={item.customer.id} className="p-3.5 rounded-xl border border-bunny-border bg-white shadow-sm space-y-2.5">
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <h6 className="font-bold text-bunny-text text-sm mb-0.5">{item.customer.fullName}</h6>
                        <span className="text-xs text-bunny-text-muted">📱 {item.customer.phone}</span>
                      </div>
                      <div>{getInactivityBadge(item.daysSinceLastAppointment)}</div>
                    </div>

                    <div className="p-2.5 rounded-lg bg-bunny-paper border border-bunny-border text-xs">
                      <div><strong>Último Servicio:</strong> {item.lastServiceName}</div>
                      <div className="text-bunny-text-muted mt-0.5">
                        {item.lastAppointmentDate
                          ? `Fecha: ${format(item.lastAppointmentDate, 'dd/MM/yyyy', { locale: es })}`
                          : 'Sin citas previas'}
                      </div>
                    </div>

                    <div className="flex justify-between items-center text-xs">
                      <span className="text-bunny-text-muted">Anti-Spam:</span>
                      {item.isContactedRecently ? (
                        <Badge variant="warning">
                          Contactada hace {item.daysSinceLastContact}d
                        </Badge>
                      ) : (
                        <Badge variant="success">Disponible</Badge>
                      )}
                    </div>

                    <div className="space-y-1.5 pt-1">
                      <button
                        type="button"
                        disabled={!templateSendEnabled}
                        onClick={() => handleQuickWhatsApp(item)}
                        className={`w-full flex items-center justify-center gap-2 text-xs font-semibold py-2 px-3 rounded-lg transition-all ${
                          templateSendEnabled
                            ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm'
                            : 'bg-bunny-border text-bunny-text-muted/70 cursor-not-allowed'
                        }`}
                      >
                        <FaWhatsapp className="text-base" />
                        <span>{templateSendEnabled ? 'Enviar WhatsApp (1-clic)' : 'Envío 1-clic desactivado'}</span>
                      </button>

                      <div className="grid grid-cols-3 gap-1.5">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex items-center justify-center gap-1 text-xs"
                          onClick={() => handleOpenCustomizeModal(item)}
                        >
                          <FaCommentDots /> Personalizar
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex items-center justify-center gap-1 text-xs"
                          onClick={() => handleQuickCopy(item)}
                        >
                          <FaCopy /> Copiar
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          className="flex items-center justify-center text-xs"
                          onClick={() => navigate(`/customers/${item.customer.id}`)}
                        >
                          <FaEye /> Ficha
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </Card.Body>
      </Card>

      {/* Modal de Personalización de Mensajes */}
      <ReactivationMessageModal
        show={showModal}
        onHide={() => setShowModal(false)}
        inactiveItem={modalItem}
        onContactRecorded={() => setContactCounter((prev) => prev + 1)}
      />
    </div>
  );
}
