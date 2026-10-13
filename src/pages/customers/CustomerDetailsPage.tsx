import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format, isValid, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import DashboardLayout from '../../components/common/DashboardLayout';
import StampCard from '../../components/customers/StampCard';
import NailGalleryTab from '../../components/customers/nailProfile/NailGalleryTab';
import { useCustomersStore } from '../../stores/customersStore';
import { useAppointmentsStore } from '../../stores/appointmentsStore';
import { useGiftCardsStore } from '../../stores/giftcardsStore';
import { useToast } from '../../hooks/useToast';
import { Customer, NotificationPreference } from '../../types/customer.types';
import { Appointment, AppointmentStatus } from '../../types/appointment.types';
import { GiftCard } from '../../types/giftcard.types';
import {
  shareGiftCardPng,
  toWhatsAppPhone,
} from '../../utils/giftcardRenderer';
import { normalizeGiftCardPublicUrl } from '../../utils/giftcardUrl';
import { customersApi } from '../../api/customers.api';
import { Button, Badge, Card, Spinner, Alert } from '@/components/ui';

export default function CustomerDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();

  const { 
    customers, 
    loading: customersLoading, 
    fetchCustomers,
    adjustCustomerLoyalty,
    syncCustomerVisits
  } = useCustomersStore();

  const { appointments, isLoading: appointmentsLoading, fetchAppointments } = useAppointmentsStore();
  const { giftCards, loading: giftCardsLoading, fetchGiftCards } = useGiftCardsStore();

  const [directCustomer, setDirectCustomer] = useState<Customer | null>(null);
  const [directCustomerLoading, setDirectCustomerLoading] = useState(false);
  const [notesDraft, setNotesDraft] = useState('');
  const [editingNotes, setEditingNotes] = useState(false);
  const [activeTab, setActiveTab] = useState<'appointments' | 'gallery' | 'giftcards'>('appointments');

  const parseDateSafe = (value: unknown): Date | null => {
    if (!value) return null;
    if (value instanceof Date) return isValid(value) ? value : null;
    if (typeof value === 'string') {
      const parsed = parseISO(value);
      if (isValid(parsed)) return parsed;
      const direct = new Date(value);
      return isValid(direct) ? direct : null;
    }
    if (typeof value === 'number') {
      const direct = new Date(value);
      return isValid(direct) ? direct : null;
    }
    return null;
  };

  const formatDateSafe = (value: unknown, pattern: string = 'dd/MM/yyyy'): string => {
    const date = parseDateSafe(value);
    if (!date) return 'No tiene';
    return format(date, pattern, { locale: es });
  };

  useEffect(() => {
    if (id) {
      const cId = Number(id);
      if (Number.isFinite(cId)) {
        setDirectCustomerLoading(true);
        customersApi.getById(cId)
          .then((res) => setDirectCustomer(res))
          .catch((err) => console.error('Error cargando cliente por ID:', err))
          .finally(() => setDirectCustomerLoading(false));
      }
      fetchCustomers();
      fetchAppointments();
      fetchGiftCards();
    }
  }, [id, fetchCustomers, fetchAppointments, fetchGiftCards]);

  const customerId = Number(id);
  const storeCustomer = useMemo<Customer | null>(() => {
    if (!Number.isFinite(customerId)) return null;
    return customers.find((c) => c.id === customerId) ?? null;
  }, [customers, customerId]);

  const customer = useMemo<Customer | null>(() => {
    if (directCustomer && directCustomer.publicId) return directCustomer;
    if (storeCustomer && storeCustomer.publicId) return storeCustomer;
    if (directCustomer) return directCustomer;
    if (storeCustomer) return storeCustomer;
    return null;
  }, [storeCustomer, directCustomer]);

  const customerAppointments = useMemo<Appointment[]>(() => {
    if (!customer) return [];
    const safeTimestamp = (value: unknown): number => {
      const date = parseDateSafe(value);
      return date ? date.getTime() : Number.NEGATIVE_INFINITY;
    };
    return appointments
      .filter((apt) => apt.customer.id === customer.id)
      .slice()
      .sort((a, b) => safeTimestamp(b.appointmentDate) - safeTimestamp(a.appointmentDate));
  }, [appointments, customer]);

  const customerGiftCards = useMemo<GiftCard[]>(() => {
    if (!customer) return [];
    const customerPhoneNormalized = toWhatsAppPhone(customer.phone);
    return giftCards.filter((gc) => {
      const isBeneficiaryId = gc.beneficiaryCustomerId === customer.id;
      const isBeneficiaryPhone = Boolean(customerPhoneNormalized && toWhatsAppPhone(gc.beneficiaryPhone) === customerPhoneNormalized);
      const isBuyerPhone = Boolean(customerPhoneNormalized && toWhatsAppPhone(gc.buyerPhone || '') === customerPhoneNormalized);
      return isBeneficiaryId || isBeneficiaryPhone || isBuyerPhone;
    });
  }, [giftCards, customer]);

  const activeCustomerGiftCards = useMemo(() => {
    return customerGiftCards.filter((gc) => gc.status === 'ACTIVE' || gc.status === 'PARTIAL');
  }, [customerGiftCards]);

  const totalAppointments = customerAppointments.length;
  const completedAppointments = customerAppointments.filter((a) => a.status === AppointmentStatus.COMPLETED).length;
  const cancelledAppointments = customerAppointments.filter((a) => a.status === AppointmentStatus.CANCELLED).length;
  const lastAppointment = customerAppointments[0];

  const handleSaveNotes = () => {
    if (!customer) return;
    toast.info('Notas guardadas localmente');
    setEditingNotes(false);
  };

  const handleLoyaltyAdjust = async (delta: number) => {
    if (!customer) return;
    const confirmMsg = delta > 0 
      ? `¿Deseas agregar ${delta} sello(s) manualmente a ${customer.fullName}?` 
      : `¿Deseas quitar ${Math.abs(delta)} sello(s) a ${customer.fullName}?`;
    
    if (window.confirm(confirmMsg)) {
      const updated = await adjustCustomerLoyalty(customer.id, delta);
      if (updated) {
        setDirectCustomer(updated);
      }
    }
  };

  const handleSyncVisits = async () => {
    if (!customer) return;
    if (window.confirm(`¿Deseas recalcular y sincronizar las visitas registradas de ${customer.fullName} con sus citas completadas reales (${completedAppointments} citas)?`)) {
      const updated = await syncCustomerVisits(customer.id);
      if (updated) {
        setDirectCustomer(updated);
      }
    }
  };

  const getStatusBadge = (status: AppointmentStatus) => {
    const variants: Record<AppointmentStatus, 'warning' | 'info' | 'success' | 'danger'> = {
      PENDING: 'warning',
      CONFIRMED: 'info',
      COMPLETED: 'success',
      CANCELLED: 'danger',
      RESCHEDULE_REQUESTED: 'warning',
    };
    const labels: Record<AppointmentStatus, string> = {
      PENDING: 'Pendiente',
      CONFIRMED: 'Confirmada',
      COMPLETED: 'Completada',
      CANCELLED: 'Cancelada',
      RESCHEDULE_REQUESTED: 'Reprogramar',
    };
    return <Badge variant={variants[status]}>{labels[status]}</Badge>;
  };

  const getAppointmentServiceLabel = (apt: Appointment) => {
    const services = apt.services && apt.services.length > 0 ? apt.services : [apt.service];
    return services.map((service) => service.name).join(' + ');
  };

  if ((customersLoading || appointmentsLoading || directCustomerLoading) && !customer) {
    return (
      <DashboardLayout>
        <div className="text-center py-16">
          <Spinner size="lg" className="border-bunny-primary mx-auto" />
          <p className="mt-3 text-slate-500 text-sm">Cargando información del cliente...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (!customer) {
    return (
      <DashboardLayout>
        <div className="max-w-md mx-auto space-y-4 pt-10">
          <Alert variant="danger">
            Cliente no encontrado
          </Alert>
          <Button variant="primary" onClick={() => navigate('/customers')}>
            Volver a Clientes
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const displayedNotes = notesDraft || customer.notes || '';

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 lg:p-8 space-y-5 max-w-7xl mx-auto">
        {/* Encabezado */}
        <div className="flex justify-between items-center gap-3">
          <div className="min-w-0">
            <h2 className="text-2xl font-bold text-bunny-dark tracking-tight break-words">
              👤 {customer.fullName}
            </h2>
            <p className="text-slate-500 text-sm">Detalles del cliente</p>
          </div>
          <Button variant="secondary" onClick={() => navigate('/customers')} className="shrink-0 text-xs sm:text-sm">
            ← Volver
          </Button>
        </div>

        {/* Layout en 2 columnas */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Columna Izquierda: Info de contacto, Estadísticas, Notas */}
          <div className="lg:col-span-4 space-y-4">
            {/* Info de Contacto */}
            <Card className="border border-slate-200 shadow-sm bg-white">
              <Card.Header className="bg-slate-50 border-b border-slate-200 py-3 px-4">
                <h5 className="font-bold text-sm text-slate-800 mb-0">Información de Contacto</h5>
              </Card.Header>
              <Card.Body className="p-4 space-y-3 text-xs sm:text-sm">
                <div>
                  <strong className="text-slate-500 block text-xs">🪪 RUT:</strong>
                  <p className="font-medium text-slate-800 mb-0">{customer.rut?.trim() ? customer.rut.trim() : 'No tiene'}</p>
                </div>
                <div>
                  <strong className="text-slate-500 block text-xs">📧 Email:</strong>
                  <p className="font-medium text-slate-800 break-words mb-0">
                    {customer.email?.trim() ? customer.email.trim() : 'No tiene'}
                  </p>
                </div>
                <div>
                  <strong className="text-slate-500 block text-xs">📱 Teléfono:</strong>
                  <p className="font-medium text-slate-800 mb-0">{customer.phone?.trim() ? customer.phone.trim() : 'No tiene'}</p>
                </div>
                <div>
                  <strong className="text-slate-500 block text-xs">🚨 Teléfono de Emergencia:</strong>
                  <p className="font-medium text-slate-800 mb-0">{customer.emergencyPhone?.trim() ? customer.emergencyPhone.trim() : 'No tiene'}</p>
                </div>
                <div>
                  <strong className="text-slate-500 block text-xs">📸 Instagram:</strong>
                  <div className="break-words">
                    {customer.instagram?.trim() ? (
                      <a
                        href={`https://instagram.com/${customer.instagram.replace(/^@/, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-semibold text-bunny-primary hover:underline"
                      >
                        @{customer.instagram.replace(/^@/, '')}
                      </a>
                    ) : (
                      <p className="text-slate-400 mb-0">No tiene</p>
                    )}
                  </div>
                </div>
                <div>
                  <strong className="text-slate-500 block text-xs">🚻 Género:</strong>
                  <p className="font-medium text-slate-800 mb-0">
                    {customer.gender === 'FEMENINO' || customer.gender === 'F' ? 'Femenino' :
                     customer.gender === 'MASCULINO' || customer.gender === 'M' ? 'Masculino' :
                     customer.gender?.trim() ? customer.gender.trim() : 'No especificado'}
                  </p>
                </div>
                <div>
                  <strong className="text-slate-500 block text-xs">🎂 Fecha de Nacimiento:</strong>
                  <p className="font-medium text-slate-800 mb-0">{customer.birthDate ? formatDateSafe(customer.birthDate) : 'No tiene'}</p>
                </div>
                <div>
                  <strong className="text-slate-500 block text-xs">📅 Cliente desde:</strong>
                  <p className="font-medium text-slate-800 mb-0">{customer.createdAt ? formatDateSafe(customer.createdAt) : 'No tiene'}</p>
                </div>
                <div>
                  <strong className="text-slate-500 block text-xs mb-1">🔔 Notificaciones:</strong>
                  <div>
                    {customer.notificationPreference === NotificationPreference.WHATSAPP_ONLY ? (
                      <Badge variant="success">💬 Solo WhatsApp</Badge>
                    ) : customer.notificationPreference === NotificationPreference.EMAIL_ONLY ? (
                      <Badge variant="info">📧 Solo Email</Badge>
                    ) : customer.notificationPreference === NotificationPreference.NONE ? (
                      <Badge variant="secondary">🔕 Sin avisos</Badge>
                    ) : (
                      <Badge variant="primary">📧💬 WhatsApp + Email</Badge>
                    )}
                  </div>
                </div>
                <div>
                  <strong className="text-slate-500 block text-xs">🩺 Notas de Salud / Alergias:</strong>
                  <p className="text-slate-600 text-xs mt-0.5 mb-0">
                    {customer.healthNotes?.trim() ? customer.healthNotes.trim() : 'Sin observaciones de salud registradas'}
                  </p>
                </div>
              </Card.Body>
            </Card>

            {/* Estadísticas */}
            <Card className="border border-slate-200 shadow-sm bg-white">
              <Card.Header className="bg-slate-50 border-b border-slate-200 py-3 px-4">
                <h5 className="font-bold text-sm text-slate-800 mb-0">Estadísticas</h5>
              </Card.Header>
              <Card.Body className="p-4 space-y-2.5 text-xs sm:text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">Total de Citas:</span>
                  <strong className="text-slate-800">{totalAppointments}</strong>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">Completadas:</span>
                  <strong className="text-emerald-600">{completedAppointments}</strong>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">Canceladas:</span>
                  <strong className="text-rose-600">{cancelledAppointments}</strong>
                </div>
                <div className="flex justify-between items-center pt-2.5 border-t border-slate-100">
                  <div>
                    <span className="text-xs text-slate-400 block">Visitas registradas:</span>
                    <strong className="text-slate-800">{customer.totalCompletedVisits || 0}</strong>
                  </div>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={handleSyncVisits}
                    className="text-xs py-1 px-2.5"
                    title="Recalcula las visitas registradas según las citas completadas reales"
                  >
                    🔄 Sincronizar
                  </Button>
                </div>
                {lastAppointment && (
                  <div className="pt-2.5 border-t border-slate-100">
                    <small className="text-slate-400 block text-xs">Última visita:</small>
                    <p className="font-semibold text-slate-800 mb-0">
                      {formatDateSafe(lastAppointment.appointmentDate)}
                    </p>
                  </div>
                )}
              </Card.Body>
            </Card>

            {/* Notas */}
            <Card className="border border-slate-200 shadow-sm bg-white">
              <Card.Header className="bg-slate-50 border-b border-slate-200 py-3 px-4 flex justify-between items-center">
                <h5 className="font-bold text-sm text-slate-800 mb-0">Notas</h5>
                {!editingNotes && (
                  <button
                    type="button"
                    className="text-xs text-bunny-primary hover:text-bunny-dark font-medium"
                    onClick={() => {
                      setNotesDraft(customer.notes || '');
                      setEditingNotes(true);
                    }}
                  >
                    ✏️ Editar
                  </button>
                )}
              </Card.Header>
              <Card.Body className="p-4">
                {editingNotes ? (
                  <div className="space-y-2">
                    <textarea
                      rows={4}
                      value={notesDraft}
                      onChange={(e) => setNotesDraft(e.target.value)}
                      placeholder="Agregar notas sobre el cliente..."
                      className="w-full text-xs sm:text-sm rounded-lg border border-slate-300 p-2.5 focus:outline-none focus:ring-1 focus:ring-bunny-primary"
                    />
                    <div className="flex gap-2">
                      <Button size="sm" variant="primary" onClick={handleSaveNotes} className="text-xs">
                        Guardar
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          setEditingNotes(false);
                          setNotesDraft(customer.notes || '');
                        }}
                        className="text-xs"
                      >
                        Cancelar
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="text-slate-700 text-xs sm:text-sm mb-0">{displayedNotes || 'Sin notas'}</p>
                )}
              </Card.Body>
            </Card>
          </div>

          {/* Columna Derecha: Tabs (Historial & Citas, Galería de Diseños, GiftCards) */}
          <div className="lg:col-span-8 space-y-4">
            {/* Pestañas de Navegación de la Ficha */}
            <div className="flex gap-2 flex-wrap border-b border-slate-200 pb-2">
              <button
                type="button"
                onClick={() => setActiveTab('appointments')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                  activeTab === 'appointments'
                    ? 'bg-bunny-primary text-white shadow-sm'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                <span>📋 Historial &amp; Citas</span>
                <Badge
                  variant={activeTab === 'appointments' ? 'secondary' : 'secondary'}
                  className={`text-xs ${activeTab === 'appointments' ? 'bg-white/20 text-white' : ''}`}
                >
                  {customerAppointments.length}
                </Badge>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('gallery')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                  activeTab === 'gallery'
                    ? 'bg-bunny-primary text-white shadow-sm'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                <span>💅 Galería de Diseños &amp; Ficha Técnica</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('giftcards')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                  activeTab === 'giftcards'
                    ? 'bg-bunny-primary text-white shadow-sm'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                <span>🎁 GiftCards</span>
                {customerGiftCards.length > 0 && (
                  <Badge
                    variant={activeTab === 'giftcards' ? 'secondary' : 'primary'}
                    className={`text-xs ${activeTab === 'giftcards' ? 'bg-white/20 text-white' : ''}`}
                  >
                    {customerGiftCards.length}
                  </Badge>
                )}
              </button>
            </div>

            {/* Vista: Galería de Diseños & Ficha Técnica */}
            {activeTab === 'gallery' && (
              <NailGalleryTab
                customerId={customer.id}
                customerName={customer.fullName}
              />
            )}

            {/* Vista: Historial & Citas */}
            {activeTab === 'appointments' && (
              <div className="space-y-4">
                <StampCard 
                  customerId={customer.id}
                  publicId={customer.publicId}
                  customerName={customer.fullName}
                  customerPhone={customer.phone}
                  loyaltyStamps={customer.loyaltyStamps} 
                  totalCompletedVisits={customer.totalCompletedVisits} 
                  currentRewardIndex={customer.currentRewardIndex}
                  onAdjust={handleLoyaltyAdjust}
                />

                <Card className="border border-slate-200 shadow-sm bg-white overflow-hidden">
                  <Card.Header className="bg-slate-50 border-b border-slate-200 py-3 px-4">
                    <h5 className="font-bold text-sm sm:text-base text-slate-800 mb-0">Historial de Citas</h5>
                  </Card.Header>
                  <Card.Body className="p-0">
                    {customerAppointments.length === 0 ? (
                      <div className="p-4">
                        <Alert variant="info" className="text-xs sm:text-sm mb-0">
                          Este cliente aún no tiene citas registradas.
                        </Alert>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs sm:text-sm">
                          <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold text-xs uppercase tracking-wider">
                            <tr>
                              <th className="py-3 px-4">Fecha</th>
                              <th className="py-3 px-4">Hora</th>
                              <th className="py-3 px-4">Servicio</th>
                              <th className="py-3 px-4">Estado</th>
                              <th className="py-3 px-4">Notas</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {customerAppointments.map((apt) => (
                              <tr key={apt.id} className="hover:bg-slate-50/60 transition-colors">
                                <td className="py-3 px-4 font-semibold text-slate-800">{formatDateSafe(apt.appointmentDate)}</td>
                                <td className="py-3 px-4 text-slate-600">{apt.appointmentTime}</td>
                                <td className="py-3 px-4 font-medium text-slate-800">{getAppointmentServiceLabel(apt)}</td>
                                <td className="py-3 px-4">{getStatusBadge(apt.status)}</td>
                                <td className="py-3 px-4">
                                  {apt.notes ? (
                                    <span className="text-slate-500 text-xs">
                                      {apt.notes.length > 50 ? `${apt.notes.substring(0, 50)}...` : apt.notes}
                                    </span>
                                  ) : (
                                    <span className="text-slate-300">-</span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </Card.Body>
                </Card>
              </div>
            )}

            {/* Vista: GiftCards */}
            {activeTab === 'giftcards' && (
              <Card className="border border-slate-200 shadow-sm bg-white overflow-hidden">
                <Card.Header className="bg-slate-50 border-b border-slate-200 py-3 px-4 flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <h5 className="font-bold text-sm sm:text-base text-slate-800 mb-0">🎁 GiftCards del Cliente</h5>
                    <Badge variant={activeCustomerGiftCards.length > 0 ? 'success' : 'secondary'}>
                      {activeCustomerGiftCards.length} activa{activeCustomerGiftCards.length !== 1 ? 's' : ''}
                    </Badge>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => navigate('/giftcards/generar')}
                    className="text-xs"
                  >
                    + Emitir GiftCard
                  </Button>
                </Card.Header>
                <Card.Body className="p-0">
                  {giftCardsLoading ? (
                    <div className="text-center py-6 text-slate-400 text-xs">Cargando GiftCards...</div>
                  ) : customerGiftCards.length === 0 ? (
                    <div className="p-4 text-slate-500 text-xs">
                      Esta clienta no tiene GiftCards asociadas (como beneficiaria ni compradora).
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs sm:text-sm">
                        <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold text-xs uppercase tracking-wider">
                          <tr>
                            <th className="py-3 px-4">Código</th>
                            <th className="py-3 px-4">Rol</th>
                            <th className="py-3 px-4">Estado</th>
                            <th className="py-3 px-4">Servicios Disponibles</th>
                            <th className="py-3 px-4">Vence</th>
                            <th className="py-3 px-4 text-right">Acciones</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {customerGiftCards.map((gc) => {
                            const isBeneficiary = toWhatsAppPhone(gc.beneficiaryPhone) === toWhatsAppPhone(customer.phone);
                            const remainingServices = gc.items.map(
                              (item) => `${item.serviceName} (${item.remainingQuantity}/${item.quantity})`
                            ).join(', ');
                            const publicUrl = normalizeGiftCardPublicUrl(gc.publicUrl, gc.code);

                            return (
                              <tr key={gc.id} className="hover:bg-slate-50/60 transition-colors">
                                <td className="py-3 px-4">
                                  <strong className="text-slate-800">{gc.code}</strong>
                                  <div className="text-slate-500 text-xs mt-0.5">${gc.totalAmount.toLocaleString('es-CL')}</div>
                                </td>
                                <td className="py-3 px-4">
                                  <Badge variant={isBeneficiary ? 'primary' : 'info'}>
                                    {isBeneficiary ? 'Beneficiaria' : 'Compradora'}
                                  </Badge>
                                </td>
                                <td className="py-3 px-4">
                                  <Badge variant={gc.status === 'ACTIVE' ? 'success' : gc.status === 'PARTIAL' ? 'warning' : 'secondary'}>
                                    {gc.status}
                                  </Badge>
                                </td>
                                <td className="py-3 px-4">
                                  <small className="text-slate-600">{remainingServices || 'Sin servicios'}</small>
                                </td>
                                <td className="py-3 px-4">
                                  <small className="text-slate-600">{gc.expiresOn}</small>
                                </td>
                                <td className="py-3 px-4 text-right">
                                  <div className="flex justify-end gap-1 items-center">
                                    <Button
                                      size="sm"
                                      variant="secondary"
                                      title="Ver en Gestión"
                                      onClick={() => navigate(`/giftcards?search=${encodeURIComponent(gc.code)}`)}
                                      className="p-1.5"
                                    >
                                      🔍
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="primary"
                                      title="Generar y compartir PNG (WhatsApp)"
                                      onClick={() =>
                                        shareGiftCardPng({
                                          data: {
                                            beneficiaryName: gc.beneficiaryName,
                                            code: gc.code,
                                            pin: gc.plainPin || 'No disponible',
                                            expiresOn: gc.expiresOn,
                                            publicUrl,
                                          },
                                          beneficiaryPhone: gc.beneficiaryPhone,
                                          onSuccess: (msg) => toast.success(msg),
                                          onError: (msg) => toast.error(msg),
                                          onInfo: (msg) => toast.info(msg),
                                        })
                                      }
                                      className="text-xs px-2.5 py-1 bg-bunny-primary hover:bg-bunny-primary-hover text-white font-semibold"
                                    >
                                      🎁 Compartir PNG
                                    </Button>
                                    <a
                                      className="px-2 py-1 text-xs rounded-lg border border-sky-300 text-sky-600 hover:bg-sky-50 transition-colors"
                                      href={publicUrl}
                                      target="_blank"
                                      rel="noreferrer"
                                      title="Abrir URL pública"
                                    >
                                      🌐
                                    </a>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </Card.Body>
              </Card>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
