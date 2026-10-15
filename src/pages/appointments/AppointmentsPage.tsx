/**
 * Página principal de gestión de citas.
 * Incluye lista, filtros, CRUD completo y cambio de estados.
 */

import { useEffect, useMemo, useState } from 'react';
import { Button, Card, Badge, Modal, Alert, Spinner } from '@/components/ui';
import { FaWhatsapp, FaBell, FaEnvelope, FaHistory } from 'react-icons/fa';
import { useNavigate, useSearchParams } from 'react-router-dom';
import DashboardLayout from '../../components/common/DashboardLayout';
import { CancelAppointmentDialog, CancelledByOption } from '../../components/appointments/CancelAppointmentDialog';
import { CompleteAppointmentWithSuppliesModal } from '../../components/appointments/CompleteAppointmentWithSuppliesModal';
import { AppointmentNotificationsModal } from '../../components/appointments/AppointmentNotificationsModal';
import { useAppointmentsStore } from '../../stores/appointmentsStore';
import { useCustomersStore } from '../../stores/customersStore';
import { useServicesStore } from '../../stores/servicesStore';
import { AppointmentStatus, AppointmentCreateRequest, AppointmentUpdateRequest, Appointment } from '../../types/appointment.types';
import { appointmentsApi } from '../../api/appointments.api';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { useToast } from '../../hooks/useToast';
import { trackAppointmentCancelled } from '../../utils/analytics';
import { getAppointmentTotal, getAppointmentServices, extractAppointmentGiftCardInfo } from '../../utils/appointmentUtils';
import { matchRutSearch } from '../../utils/rutUtils';
import { useGiftCardsStore } from '../../stores/giftcardsStore';
import { GiftCard, GiftCardCreateRequest, GiftCardItem, GiftCardRedeemItemRequest } from '../../types/giftcard.types';
import { toWhatsAppPhone } from '../../utils/giftcardRenderer';
import { AppointmentSchedulePicker } from '../../components/appointments/AppointmentSchedulePicker';
import { AppointmentFiltersBar } from '../../components/appointments/AppointmentFiltersBar';
import {
  settingsApi,
  loadCachedUnavailabilities,
  loadCachedUnavailabilityColors,
} from '../../api/settings.api';
import {
  ScheduleUnavailability,
  UnavailabilityColorConfig,
} from '../../types/unavailability.types';
import {
  isDateBlockedFullDay,
  checkTimeSlotConflict,
} from '../../utils/unavailabilityUtils';

interface AppointmentFormState {
  customerId: number;
  serviceIds: number[];
  appointmentDate: string;
  appointmentTime: string;
  notes: string;
}

interface AppointmentEditFormState extends AppointmentFormState {
  status: AppointmentStatus;
  totalPrice?: number;
}

interface CustomChargeItem {
  id: number;
  description: string;
  amount: number;
}

type CreateStep = 'form' | 'summary';
type EditMode = 'edit' | 'reschedule';
type AppointmentStatusFilter = AppointmentStatus | 'ACTIVE' | 'ALL';

const formatCurrency = (value: number) => `$${value.toLocaleString('es-CL')}`;

export default function AppointmentsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const toast = useToast();
  const {
    appointments,
    isLoading,
    error,
    fetchAppointments,
    createAppointment,
    updateAppointment,
    updateAppointmentStatus,
    deleteAppointment,
    clearError,
  } = useAppointmentsStore();

  const { customers, fetchCustomers } = useCustomersStore();
  const { services, fetchServices } = useServicesStore();
  const { giftCards, fetchGiftCards, redeemGiftCard, updateGiftCard, revertGiftCardRedeem } = useGiftCardsStore();
  const [applyingGiftCard, setApplyingGiftCard] = useState(false);
  const [gcCodeInput, setGcCodeInput] = useState('');
  const [bindingGcLoading, setBindingGcLoading] = useState(false);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editMode, setEditMode] = useState<EditMode>('edit');
  const [createStep, setCreateStep] = useState<CreateStep>('form');
  const [customChargeItems, setCustomChargeItems] = useState<CustomChargeItem[]>([]);
  const [editCustomChargeItems, setEditCustomChargeItems] = useState<CustomChargeItem[]>([]);
  const [nextCustomChargeId, setNextCustomChargeId] = useState(1);
  const [nextEditCustomChargeId, setNextEditCustomChargeId] = useState(1);
  const [editingAppointmentId, setEditingAppointmentId] = useState<number | null>(null);

  // Inicializar filtros desde URL params si vienen presentes
  const initialDate = searchParams.get('date') || '';
  const initialStatus = (searchParams.get('status') as AppointmentStatusFilter) || 'ACTIVE';
  const initialSearch = searchParams.get('search') || '';

  const [statusFilter, setStatusFilter] = useState<AppointmentStatusFilter>(initialStatus);
  const [dateFilter, setDateFilter] = useState<string>(initialDate);
  const [searchQuery, setSearchQuery] = useState<string>(initialSearch);

  const [customerSearch, setCustomerSearch] = useState('');
  const [serviceSearch, setServiceSearch] = useState('');
  const [summaryServiceSearch, setSummaryServiceSearch] = useState('');
  const [editCustomerSearch, setEditCustomerSearch] = useState('');
  const [editServiceSearch, setEditServiceSearch] = useState('');

  const [isCustomerListCollapsed, setIsCustomerListCollapsed] = useState(false);
  const [isServiceListCollapsed, setIsServiceListCollapsed] = useState(false);

  // Estados para modal de cancelación
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelingAppointmentId, setCancelingAppointmentId] = useState<number | null>(null);
  const [isCancelLoading, setIsCancelLoading] = useState(false);

  // Estados para modal de completar con insumos
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [completingAppointmentId, setCompletingAppointmentId] = useState<number | null>(null);

  const [formData, setFormData] = useState<AppointmentFormState>({
    customerId: 0,
    serviceIds: [],
    appointmentDate: initialDate || '',
    appointmentTime: '',
    notes: '',
  });
  const [editFormData, setEditFormData] = useState<AppointmentEditFormState>({
    customerId: 0,
    serviceIds: [],
    appointmentDate: '',
    appointmentTime: '',
    notes: '',
    status: AppointmentStatus.PENDING,
  });
  const isQuickCreateMode = searchParams.get('create') === '1';
  const showCreateAppointmentModal = showCreateModal || isQuickCreateMode;

  const [unavailabilities, setUnavailabilities] = useState<ScheduleUnavailability[]>(loadCachedUnavailabilities);
  const [unavailabilityColors, setUnavailabilityColors] = useState<UnavailabilityColorConfig>(loadCachedUnavailabilityColors);

  // Estados para selección y uso de GiftCard al crear una cita
  const [createUseGiftCardChoice, setCreateUseGiftCardChoice] = useState<'YES' | 'NO' | null>(null);
  const [createSelectedGiftCardId, setCreateSelectedGiftCardId] = useState<number | null>(null);
  const [createSelectedGiftCardItemIds, setCreateSelectedGiftCardItemIds] = useState<number[]>([]);
  const [isCreatingAppointment, setIsCreatingAppointment] = useState(false);

  const getErrorMessage = (err: unknown, fallback: string) => {
    if (err instanceof Error && err.message) {
      return err.message;
    }
    return fallback;
  };

  useEffect(() => {
    fetchAppointments();
    fetchCustomers();
    fetchServices(true);
    fetchGiftCards();

    settingsApi.getAll().then((data) => {
      if (data.unavailabilities && data.unavailabilities.length > 0) {
        setUnavailabilities(data.unavailabilities);
      }
      if (data.unavailabilityColors) {
        setUnavailabilityColors(data.unavailabilityColors);
      }
    }).catch((err) => console.error('Error fetching unavailabilities in AppointmentsPage:', err));
  }, [fetchAppointments, fetchCustomers, fetchServices, fetchGiftCards]);

  // Efecto para abrir el modal de edición o agendar próxima cita automáticamente si viene el ID en la URL
  useEffect(() => {
    const rescheduleId = searchParams.get('reschedule');
    const editId = searchParams.get('edit');
    const nextAptId = searchParams.get('nextAppointment');
    const mode: EditMode | null = rescheduleId ? 'reschedule' : editId ? 'edit' : null;
    const targetId = Number(rescheduleId ?? editId);

    if (mode && appointments.length > 0) {
      const apt = appointments.find((a) => a.id === targetId);
      if (apt) {
        if (mode === 'reschedule') {
          openRescheduleModal(apt);
        } else {
          openEditModal(apt);
        }
        // Limpiar el parámetro de la URL sin recargar para no reabrirlo al refrescar
        setSearchParams((prev) => {
          prev.delete('edit');
          prev.delete('reschedule');
          return prev;
        }, { replace: true });
      }
    } else if (nextAptId && appointments.length > 0) {
      const apt = appointments.find((a) => a.id === Number(nextAptId));
      if (apt) {
        openNextAppointmentModal(apt);
        setSearchParams((prev) => {
          prev.delete('nextAppointment');
          return prev;
        }, { replace: true });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, appointments, setSearchParams]);

  const filteredCustomers = useMemo(() => {
    const search = customerSearch.trim().toLowerCase();
    if (!search) return customers;
    return customers.filter((customer) =>
      `${customer.fullName} ${customer.phone}`.toLowerCase().includes(search)
    );
  }, [customers, customerSearch]);

  const filteredServices = useMemo(() => {
    const search = serviceSearch.trim().toLowerCase();
    if (!search) return services;
    return services.filter((service) =>
      `${service.name} ${service.description || ''}`.toLowerCase().includes(search)
    );
  }, [services, serviceSearch]);

  const filteredEditCustomers = useMemo(() => {
    const search = editCustomerSearch.trim().toLowerCase();
    if (!search) return customers;
    return customers.filter((customer) =>
      `${customer.fullName} ${customer.phone}`.toLowerCase().includes(search)
    );
  }, [customers, editCustomerSearch]);

  const filteredEditServices = useMemo(() => {
    const search = editServiceSearch.trim().toLowerCase();
    if (!search) return services;
    return services.filter((service) =>
      `${service.name} ${service.description || ''}`.toLowerCase().includes(search)
    );
  }, [services, editServiceSearch]);

  const filteredSummaryServices = useMemo(() => {
    const search = summaryServiceSearch.trim().toLowerCase();
    if (!search) return services;
    return services.filter((service) =>
      `${service.name} ${service.description || ''}`.toLowerCase().includes(search)
    );
  }, [services, summaryServiceSearch]);

  const selectedCreateCustomer = useMemo(
    () => customers.find((customer) => customer.id === formData.customerId),
    [customers, formData.customerId]
  );

  const selectedEditCustomer = useMemo(
    () => customers.find((customer) => customer.id === editFormData.customerId),
    [customers, editFormData.customerId]
  );

  const selectedCreateServices = useMemo(
    () => services.filter((service) => formData.serviceIds.includes(service.id)),
    [services, formData.serviceIds]
  );

  const selectedEditServices = useMemo(
    () => services.filter((service) => editFormData.serviceIds.includes(service.id)),
    [services, editFormData.serviceIds]
  );

  const createTotal = useMemo(
    () => selectedCreateServices.reduce((sum, service) => sum + service.price, 0),
    [selectedCreateServices]
  );
  const createDuration = useMemo(
    () => selectedCreateServices.reduce((sum, service) => sum + service.durationMinutes, 0),
    [selectedCreateServices]
  );
  const customChargesTotal = useMemo(
    () =>
      customChargeItems.reduce((sum, item) => {
        if (!item.description.trim() || item.amount <= 0) return sum;
        return sum + item.amount;
      }, 0),
    [customChargeItems]
  );
  const createFinalTotal = useMemo(
    () => createTotal + customChargesTotal,
    [createTotal, customChargesTotal]
  );
  const editTotal = useMemo(
    () => selectedEditServices.reduce((sum, service) => sum + service.price, 0),
    [selectedEditServices]
  );
  const editDuration = useMemo(
    () => selectedEditServices.reduce((sum, service) => sum + service.durationMinutes, 0),
    [selectedEditServices]
  );

  const displayedAppointments = useMemo(() => {
    return appointments.filter((apt) => {
      // 1. Filtrar por Estado
      if (statusFilter === 'ACTIVE') {
        if (
          apt.status !== AppointmentStatus.PENDING &&
          apt.status !== AppointmentStatus.CONFIRMED &&
          apt.status !== AppointmentStatus.RESCHEDULE_REQUESTED
        ) {
          return false;
        }
      } else if (statusFilter !== 'ALL') {
        if (apt.status !== statusFilter) {
          return false;
        }
      }

      // 2. Filtrar por Fecha (compara YYYY-MM-DD)
      if (dateFilter) {
        const aptDateStr = apt.appointmentDate ? apt.appointmentDate.slice(0, 10) : '';
        if (aptDateStr !== dateFilter) {
          return false;
        }
      }

      // 3. Filtrar por Búsqueda de Texto (Clienta, RUT, Teléfono, Servicios, Notas)
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const customerName = (apt.customer?.fullName || '').toLowerCase();
        const customerPhone = (apt.customer?.phone || '').toLowerCase();
        const customerRut = (apt.customer as { rut?: string })?.rut || '';
        const notes = (apt.notes || '').toLowerCase();
        const aptServices = getAppointmentServices(apt);
        const serviceNames = aptServices.map((s) => s.name.toLowerCase()).join(' ');

        const matchesRut = matchRutSearch(q, customerRut);
        const matchesName = customerName.includes(q);
        const matchesPhone = customerPhone.includes(q);
        const matchesService = serviceNames.includes(q);
        const matchesNotes = notes.includes(q);

        if (!matchesName && !matchesRut && !matchesPhone && !matchesService && !matchesNotes) {
          return false;
        }
      }

      return true;
    });
  }, [appointments, statusFilter, dateFilter, searchQuery]);

  const handleApplyFilters = () => {
    const filters: { startDate?: string; endDate?: string; status?: AppointmentStatus } = {};
    if (statusFilter !== 'ACTIVE' && statusFilter !== 'ALL') {
      filters.status = statusFilter;
    }
    if (dateFilter) {
      filters.startDate = dateFilter;
      filters.endDate = dateFilter;
    }
    fetchAppointments(filters);
  };

  const handleClearFilters = () => {
    setStatusFilter('ACTIVE');
    setDateFilter('');
    setSearchQuery('');
    fetchAppointments();
  };

  const normalizeNotes = (notes: string) => {
    const trimmed = notes.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  };

  const buildCreateNotes = () => {
    const baseNotes = normalizeNotes(formData.notes);
    const validCustomItems = customChargeItems.filter(
      (item) => item.description.trim().length > 0 && item.amount > 0
    );

    const blocks: string[] = [];
    if (baseNotes) {
      blocks.push(baseNotes);
    }

    if (createUseGiftCardChoice === 'YES' && effectiveSelectedGiftCard && chosenCreateGiftCardItems.length > 0) {
      const itemsText = chosenCreateGiftCardItems.map((i) => i.serviceName).join(', ');
      blocks.push(
        [
          `[Pago con GiftCard ${effectiveSelectedGiftCard.code}: ${itemsText}]`,
          'Método de pago: GiftCard',
          `Total cubierto por GiftCard: ${formatCurrency(createGiftCardCoverage)}`,
          createNetTotalToPay > 0
            ? `Saldo restante a pagar en local: ${formatCurrency(createNetTotalToPay)}`
            : 'Cita 100% pagada con GiftCard ($0 a cobrar en local)',
        ].join('\n')
      );
    }

    if (validCustomItems.length > 0) {
      const extrasBlock = [
        'Extras personalizados:',
        ...validCustomItems.map((item) => `- ${item.description.trim()}: ${formatCurrency(item.amount)}`),
        `Subtotal servicios: ${formatCurrency(createTotal)}`,
        createUseGiftCardChoice === 'YES' && createGiftCardCoverage > 0
          ? `Descuento GiftCard: -${formatCurrency(createGiftCardCoverage)}`
          : null,
        `Total extras: ${formatCurrency(customChargesTotal)}`,
        `Total final estimado: ${formatCurrency(createUseGiftCardChoice === 'YES' ? createNetTotalToPay : createFinalTotal)}`,
      ].filter(Boolean).join('\n');
      blocks.push(extrasBlock);
    }

    return blocks.length > 0 ? blocks.join('\n\n') : undefined;
  };

  const buildCreatePayload = (): AppointmentCreateRequest => ({
    customerId: formData.customerId,
    serviceId: formData.serviceIds[0],
    serviceIds: formData.serviceIds,
    appointmentDate: formData.appointmentDate,
    appointmentTime: formData.appointmentTime,
    notes: buildCreateNotes(),
    totalPrice: createUseGiftCardChoice === 'YES' ? createNetTotalToPay : createFinalTotal,
  });

  const availableEditCustomerGiftCards = useMemo(() => {
    if (!editFormData.customerId) return [];
    const customerObj = customers.find((c) => c.id === editFormData.customerId);
    const normalizedPhone = customerObj ? toWhatsAppPhone(customerObj.phone) : '';

    return giftCards.filter((gc) => {
      const isBeneficiary =
        gc.beneficiaryCustomerId === editFormData.customerId ||
        Boolean(normalizedPhone && toWhatsAppPhone(gc.beneficiaryPhone) === normalizedPhone);
      const isActive = gc.status === 'ACTIVE' || gc.status === 'PARTIAL';
      const hasRemaining = gc.items.some((item) => item.remainingQuantity > 0);
      return isBeneficiary && isActive && hasRemaining;
    });
  }, [giftCards, editFormData.customerId, customers]);

  const availableCreateCustomerGiftCards = useMemo(() => {
    if (!formData.customerId) return [];
    const customerObj = customers.find((c) => c.id === formData.customerId);
    const normalizedPhone = customerObj ? toWhatsAppPhone(customerObj.phone) : '';

    return giftCards.filter((gc) => {
      const isBeneficiary =
        gc.beneficiaryCustomerId === formData.customerId ||
        Boolean(normalizedPhone && toWhatsAppPhone(gc.beneficiaryPhone) === normalizedPhone);
      const isActive = gc.status === 'ACTIVE' || gc.status === 'PARTIAL';
      const hasRemaining = gc.items.some((item) => item.remainingQuantity > 0);
      return isBeneficiary && isActive && hasRemaining;
    });
  }, [giftCards, formData.customerId, customers]);

  const effectiveSelectedGiftCard = useMemo(() => {
    if (!availableCreateCustomerGiftCards.length) return null;
    if (createSelectedGiftCardId) {
      const found = availableCreateCustomerGiftCards.find((gc) => gc.id === createSelectedGiftCardId);
      if (found) return found;
    }
    return availableCreateCustomerGiftCards[0];
  }, [availableCreateCustomerGiftCards, createSelectedGiftCardId]);

  const chosenCreateGiftCardItems = useMemo(() => {
    if (!effectiveSelectedGiftCard || createUseGiftCardChoice !== 'YES') return [];
    return effectiveSelectedGiftCard.items.filter(
      (item) => createSelectedGiftCardItemIds.includes(item.id) && item.remainingQuantity > 0
    );
  }, [effectiveSelectedGiftCard, createUseGiftCardChoice, createSelectedGiftCardItemIds]);

  const createGiftCardCoverage = useMemo(() => {
    return chosenCreateGiftCardItems.reduce((sum, item) => sum + (item.unitPrice || 0), 0);
  }, [chosenCreateGiftCardItems]);

  const createNetTotalToPay = useMemo(() => {
    if (createUseGiftCardChoice === 'YES') {
      return Math.max(0, createTotal - createGiftCardCoverage) + customChargesTotal;
    }
    return createFinalTotal;
  }, [createUseGiftCardChoice, createTotal, createGiftCardCoverage, customChargesTotal, createFinalTotal]);

  const handleSelectCreateGiftCardUsage = (choice: 'YES' | 'NO') => {
    setCreateUseGiftCardChoice(choice);
    if (choice === 'YES') {
      const targetGc = effectiveSelectedGiftCard || availableCreateCustomerGiftCards[0];
      if (targetGc) {
        if (!createSelectedGiftCardId) {
          setCreateSelectedGiftCardId(targetGc.id);
        }
        // Pre-seleccionar items que coincidan con los servicios de la cita, o el primero disponible
        const matchingItems = targetGc.items.filter((item) => {
          if (item.remainingQuantity <= 0) return false;
          return selectedCreateServices.some(
            (s) => s.id === item.serviceId || s.name.trim().toLowerCase() === item.serviceName.trim().toLowerCase()
          );
        });

        if (matchingItems.length > 0) {
          setCreateSelectedGiftCardItemIds(matchingItems.map((i) => i.id));
        } else {
          const firstAvailable = targetGc.items.find((i) => i.remainingQuantity > 0);
          if (firstAvailable) {
            setCreateSelectedGiftCardItemIds([firstAvailable.id]);
          }
        }
      }
    }
  };

  const toggleCreateGiftCardItem = (itemId: number) => {
    setCreateSelectedGiftCardItemIds((prev) =>
      prev.includes(itemId) ? prev.filter((id) => id !== itemId) : [...prev, itemId]
    );
  };

  const handleApplyGiftCardToEditAppointment = async (gc: GiftCard, item: GiftCardItem) => {
    if (applyingGiftCard) return;
    if (!confirm(`¿Confirmas canjear 1 "${item.serviceName}" de la GiftCard ${gc.code} para esta cita?`)) {
      return;
    }

    setApplyingGiftCard(true);
    try {
      await redeemGiftCard(gc.id, {
        note: `Canje aplicado a cita #${editingAppointmentId || 'en edición'} (${editFormData.appointmentDate || 'Fecha a definir'})`,
        items: [{ giftCardItemId: item.id, quantity: 1 }],
      });

      const gcNoteTag = `[Pago con GiftCard ${gc.code}: ${item.serviceName}]`;
      setEditFormData((prev) => ({
        ...prev,
        notes: prev.notes ? `${prev.notes}\n${gcNoteTag}` : gcNoteTag,
      }));

      toast.success(`Servicio "${item.serviceName}" canjeado de GiftCard ${gc.code} y registrado en notas.`);
      await fetchGiftCards();
    } catch {
      toast.error('No se pudo aplicar el canje de la GiftCard');
    } finally {
      setApplyingGiftCard(false);
    }
  };

  const handleBindGiftCardCodeToEditCustomer = async () => {
    if (!gcCodeInput.trim() || !editFormData.customerId) return;
    const customerObj = customers.find((c) => c.id === editFormData.customerId);
    if (!customerObj) {
      toast.error('Selecciona una clienta primero');
      return;
    }

    const codeToFind = gcCodeInput.trim().toUpperCase();
    const targetGc = giftCards.find((gc) => gc.code.toUpperCase() === codeToFind);
    if (!targetGc) {
      toast.error(`No se encontró la GiftCard con código ${codeToFind}`);
      return;
    }

    if (targetGc.status !== 'ACTIVE' && targetGc.status !== 'PARTIAL') {
      toast.error(`La GiftCard ${targetGc.code} está ${targetGc.status} y no se puede canjear`);
      return;
    }

    const hasRemaining = targetGc.items.some((i) => i.remainingQuantity > 0);
    if (!hasRemaining) {
      toast.error(`La GiftCard ${targetGc.code} no tiene servicios disponibles`);
      return;
    }

    setBindingGcLoading(true);
    try {
      const payload: GiftCardCreateRequest = {
        beneficiaryFullName: customerObj.fullName,
        beneficiaryPhone: customerObj.phone,
        beneficiaryEmail: customerObj.email || undefined,
        buyerName: targetGc.buyerName || undefined,
        buyerPhone: targetGc.buyerPhone || undefined,
        buyerEmail: targetGc.buyerEmail || undefined,
        expiresOn: targetGc.expiresOn,
        paidAmount: targetGc.paidAmount,
        paymentMethod: targetGc.paymentMethod,
        items: targetGc.items.map((i) => ({
          serviceId: i.serviceId || 0,
          quantity: i.quantity,
        })),
      };

      await updateGiftCard(targetGc.id, payload);
      await fetchGiftCards();
      toast.success(`GiftCard ${targetGc.code} vinculada exitosamente a ${customerObj.fullName}`);
      setGcCodeInput('');
    } catch {
      toast.error('No se pudo vincular la GiftCard a la clienta');
    } finally {
      setBindingGcLoading(false);
    }
  };

  const buildEditPayload = (): AppointmentUpdateRequest => ({
    customerId: editFormData.customerId,
    serviceId: editFormData.serviceIds[0],
    serviceIds: editFormData.serviceIds,
    appointmentDate: editFormData.appointmentDate,
    appointmentTime: editFormData.appointmentTime,
    status: editFormData.status,
    notes: normalizeNotes(editFormData.notes),
    totalPrice: editFormData.totalPrice,
  });

  const validateForm = (customerId: number, serviceIds: number[]): boolean => {
    if (customerId <= 0) {
      toast.error('Debes seleccionar un cliente');
      return false;
    }
    if (serviceIds.length === 0) {
      toast.error('Debes seleccionar al menos un servicio');
      return false;
    }
    return true;
  };

  const openCreateModal = (defaultDate?: string) => {
    resetForm();
    if (defaultDate) {
      setFormData((prev) => ({ ...prev, appointmentDate: defaultDate }));
    } else if (searchParams.get('date')) {
      setFormData((prev) => ({ ...prev, appointmentDate: searchParams.get('date') || '' }));
    }
    setCustomChargeItems([]);
    setSummaryServiceSearch('');
    setCreateStep('form');
    setShowCreateModal(true);
  };

  const openNextAppointmentModal = (appointment: Appointment) => {
    resetForm();
    const serviceIds = getAppointmentServices(appointment).map((s) => s.id);
    setFormData({
      customerId: appointment.customer.id,
      serviceIds: serviceIds.length > 0 ? serviceIds : (appointment.service ? [appointment.service.id] : []),
      appointmentDate: '',
      appointmentTime: appointment.appointmentTime || '',
      notes: appointment.notes?.split('Extras personalizados:')[0].trim() || '',
    });
    setCustomChargeItems([]);
    setSummaryServiceSearch('');
    setIsCustomerListCollapsed(true);
    setCreateStep('form');
    setShowCreateModal(true);
  };

  const closeCreateModal = () => {
    setShowCreateModal(false);
    setCreateStep('form');
    resetForm();
    setCustomChargeItems([]);
    setSummaryServiceSearch('');
    const returnTo = searchParams.get('returnTo');
    if (returnTo) {
      navigate(returnTo, { replace: true });
    } else if (searchParams.get('create') === '1' || searchParams.get('nextAppointment')) {
      setSearchParams({}, { replace: true });
    }
  };

  const handleGoToCreateSummary = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm(formData.customerId, formData.serviceIds)) return;

    if (!formData.appointmentDate) {
      toast.error('Por favor selecciona una fecha para la cita');
      return;
    }

    const todayStr = format(new Date(), 'yyyy-MM-dd');
    if (formData.appointmentDate < todayStr) {
      toast.error(`No es posible agendar citas en fechas pasadas (${formData.appointmentDate}).`);
      return;
    }

    if (!formData.appointmentTime) {
      toast.error('Por favor selecciona una hora para la cita');
      return;
    }

    const fullDayCheck = isDateBlockedFullDay(formData.appointmentDate, unavailabilities);
    if (fullDayCheck.blocked) {
      toast.error(
        `No es posible agendar: La fecha seleccionada (${formData.appointmentDate}) está marcada como día cerrado o bloqueado ("${fullDayCheck.reason || 'Día bloqueado'}").`
      );
      return;
    }

    const timeSlotCheck = checkTimeSlotConflict(
      formData.appointmentDate,
      formData.appointmentTime,
      createDuration,
      unavailabilities
    );
    if (timeSlotCheck.hasConflict) {
      toast.error(
        `Conflicto de horario: La hora seleccionada coincide con el bloqueo de agenda "${timeSlotCheck.reason}" (${timeSlotCheck.conflictSlot}). Por favor selecciona otro horario.`
      );
      return;
    }

    if (availableCreateCustomerGiftCards.length > 0 && !createSelectedGiftCardId) {
      setCreateSelectedGiftCardId(availableCreateCustomerGiftCards[0].id);
    }
    setCreateStep('summary');
  };

  const handleConfirmCreateAppointment = async () => {
    if (!validateForm(formData.customerId, formData.serviceIds)) return;

    if (availableCreateCustomerGiftCards.length > 0 && !createUseGiftCardChoice) {
      toast.warning('Por favor selecciona si deseas utilizar la GiftCard para el cobro de esta cita o no.');
      return;
    }

    if (createUseGiftCardChoice === 'YES') {
      if (!effectiveSelectedGiftCard || chosenCreateGiftCardItems.length === 0) {
        toast.warning('Por favor selecciona al menos un servicio de la GiftCard para canjear.');
        return;
      }
    }

    setIsCreatingAppointment(true);
    try {
      const newApt = await createAppointment(buildCreatePayload());

      if (createUseGiftCardChoice === 'YES' && effectiveSelectedGiftCard && chosenCreateGiftCardItems.length > 0) {
        try {
          await redeemGiftCard(effectiveSelectedGiftCard.id, {
            note: `Canje aplicado a cita #${newApt.id} (${newApt.appointmentDate}) de ${selectedCreateCustomer?.fullName || 'Clienta'}`,
            items: chosenCreateGiftCardItems.map((item) => ({
              giftCardItemId: item.id,
              quantity: 1,
            })),
          });
          await fetchGiftCards();
          toast.success(`Cita creada exitosamente y saldo de GiftCard ${effectiveSelectedGiftCard.code} canjeado.`);
        } catch (gcErr) {
          console.error('Error al redimir GiftCard:', gcErr);
          toast.warning('La cita fue creada, pero ocurrió un problema al registrar el canje automático de la GiftCard. Puedes canjearla manualmente desde la edición de la cita.');
        }
      } else {
        toast.success('Cita creada exitosamente');
      }

      const returnTo = searchParams.get('returnTo');
      closeCreateModal();
      if (searchParams.get('create') === '1' && returnTo) {
        navigate(returnTo, { replace: true });
        return;
      }
      fetchAppointments();
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, 'Error al crear la cita'));
    } finally {
      setIsCreatingAppointment(false);
    }
  };

  const buildEditNotes = () => {
    // 1. Extraer las notas originales (anteriores al bloque de extras)
    const notesParts = editFormData.notes.split('Extras personalizados:');
    const baseNotes = normalizeNotes(notesParts[0]);

    const validCustomItems = editCustomChargeItems.filter(
      (item) => item.description.trim().length > 0 && item.amount > 0
    );

    if (validCustomItems.length === 0) {
      return baseNotes;
    }

    const extrasBlock = [
      'Extras personalizados:',
      ...validCustomItems.map((item) => `- ${item.description.trim()}: ${formatCurrency(item.amount)}`),
      `Subtotal servicios: ${formatCurrency(editTotal)}`,
      `Total extras: ${formatCurrency(editCustomChargeItems.reduce((s, i) => s + i.amount, 0))}`,
      `Total final estimado: ${formatCurrency(editTotal + editCustomChargeItems.reduce((s, i) => s + i.amount, 0))}`,
    ].join('\n');

    return baseNotes ? `${baseNotes}\n\n${extrasBlock}` : extrasBlock;
  };

  const initializeEditForm = (appointment: Appointment) => {
    const selectedIds = appointment.services?.length
      ? appointment.services.map((service) => service.id)
      : [appointment.service.id];

    // Parser de extras desde las notas
    const parsedExtras: CustomChargeItem[] = [];
    let nextId = 1;
    if (appointment.notes) {
      const extrasSection = appointment.notes.match(/Extras personalizados:([\s\S]*?)Subtotal servicios:/i);
      if (extrasSection && extrasSection[1]) {
        const lines = extrasSection[1].trim().split('\n');
        lines.forEach(line => {
          const match = line.match(/-\s*(.*?):\s*\$?\s*([\d.]+)/);
          if (match) {
            parsedExtras.push({
              id: nextId++,
              description: match[1].trim(),
              amount: parseInt(match[2].replace(/\./g, ''), 10)
            });
          }
        });
      }
    }

    setEditingAppointmentId(appointment.id);
    setEditCustomChargeItems(parsedExtras);
    setNextEditCustomChargeId(nextId);
    
    // Limpiar notas del bloque de extras para el campo de texto base
    const cleanNotes = appointment.notes?.split('Extras personalizados:')[0].trim() || '';

    setEditFormData({
      customerId: appointment.customer.id,
      serviceIds: selectedIds,
      appointmentDate: appointment.appointmentDate,
      appointmentTime: appointment.appointmentTime,
      notes: cleanNotes,
      status: appointment.status,
      totalPrice: getAppointmentTotal(appointment),
    });
    setEditCustomerSearch('');
    setEditServiceSearch('');
    setShowEditModal(true);
  };

  const openEditModal = (appointment: Appointment) => {
    setEditMode('edit');
    initializeEditForm(appointment);
  };

  const openRescheduleModal = (appointment: Appointment) => {
    setEditMode('reschedule');
    initializeEditForm(appointment);
    // Al reagendar una cita, su nuevo estado tras fijar la hora pasa a CONFIRMED
    setEditFormData((prev) => ({
      ...prev,
      status: AppointmentStatus.CONFIRMED,
    }));
  };

  const closeEditModal = () => {
    setShowEditModal(false);
    setEditingAppointmentId(null);
    setEditMode('edit');
    const returnTo = searchParams.get('returnTo');
    if (returnTo) {
      navigate(returnTo, { replace: true });
    }
  };

  const handleEditAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAppointmentId) return;
    if (!validateForm(editFormData.customerId, editFormData.serviceIds)) return;

    if (!editFormData.appointmentDate) {
      toast.error('Por favor selecciona una fecha para la cita');
      return;
    }

    const todayStr = format(new Date(), 'yyyy-MM-dd');
    if (editMode === 'reschedule' && editFormData.appointmentDate < todayStr) {
      toast.error(`No es posible reagendar citas a fechas pasadas (${editFormData.appointmentDate}).`);
      return;
    }

    if (!editFormData.appointmentTime) {
      toast.error('Por favor selecciona una hora para la cita');
      return;
    }

    const editFullDayCheck = isDateBlockedFullDay(editFormData.appointmentDate, unavailabilities);
    if (editFullDayCheck.blocked) {
      toast.error(
        `No es posible agendar: La fecha seleccionada (${editFormData.appointmentDate}) está marcada como día cerrado o bloqueado ("${editFullDayCheck.reason || 'Día bloqueado'}").`
      );
      return;
    }

    const editTimeSlotCheck = checkTimeSlotConflict(
      editFormData.appointmentDate,
      editFormData.appointmentTime,
      editDuration,
      unavailabilities
    );
    if (editTimeSlotCheck.hasConflict) {
      toast.error(
        `Conflicto de horario: La hora seleccionada coincide con el bloqueo de agenda "${editTimeSlotCheck.reason}" (${editTimeSlotCheck.conflictSlot}). Por favor selecciona otro horario.`
      );
      return;
    }

    const finalNotes = buildEditNotes();
    const finalTotal = editTotal + editCustomChargeItems.reduce((s, i) => s + i.amount, 0);

    try {
      // Si se está reagendando y el estado era 'RESCHEDULE_REQUESTED', pasa a 'CONFIRMED'
      const targetStatus = (editMode === 'reschedule' && editFormData.status === AppointmentStatus.RESCHEDULE_REQUESTED)
        ? AppointmentStatus.CONFIRMED
        : editFormData.status;

      await updateAppointment(editingAppointmentId, {
        ...buildEditPayload(),
        status: targetStatus,
        notes: finalNotes,
        totalPrice: finalTotal,
      });

      toast.success(editMode === 'reschedule' ? `Cita #${editingAppointmentId} reagendada exitosamente` : 'Cita actualizada exitosamente');
      closeEditModal();
      fetchAppointments();
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, editMode === 'reschedule' ? 'Error al reagendar la cita' : 'Error al actualizar la cita'));
    }
  };

  const handleChangeStatus = async (id: number, status: AppointmentStatus) => {
    if (status === AppointmentStatus.COMPLETED) {
      setCompletingAppointmentId(id);
      setShowCompleteModal(true);
      return;
    }

    if (!confirm(`¿Cambiar estado a ${status}?`)) {
      return;
    }

    try {
      await updateAppointmentStatus(id, status);
      toast.success('Estado actualizado correctamente');
      fetchAppointments();
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, 'Error al actualizar el estado'));
    }
  };

  const handleCancelAppointment = (id: number) => {
    setCancelingAppointmentId(id);
    setShowCancelModal(true);
  };

  const handleConfirmCancelAppointment = async (
    reason: string,
    cancelledBy: CancelledByOption = 'CUSTOMER',
    revertGiftCard: boolean = false
  ) => {
    if (!cancelingAppointmentId) return;

    setIsCancelLoading(true);
    try {
      // Actualizar cita con motivo en notas
      const appointment = appointments.find((apt) => apt.id === cancelingAppointmentId);
      if (!appointment) throw new Error('Cita no encontrada');

      let giftCardRestored = false;
      const gcInfo = extractAppointmentGiftCardInfo(appointment.notes);

      if (revertGiftCard && gcInfo) {
        try {
          let currentGiftCards = giftCards;
          if (!currentGiftCards || currentGiftCards.length === 0) {
            await fetchGiftCards();
            currentGiftCards = useGiftCardsStore.getState().giftCards;
          }

          const targetGc = currentGiftCards.find(
            (gc) => gc.code.toUpperCase() === gcInfo.code.toUpperCase()
          );

          if (targetGc) {
            const aptServices = getAppointmentServices(appointment).map((s) => s.name.trim().toLowerCase());
            const itemsToRevert: GiftCardRedeemItemRequest[] = [];

            for (const item of targetGc.items) {
              const matchesText =
                gcInfo.servicesText && gcInfo.servicesText.toLowerCase().includes(item.serviceName.trim().toLowerCase());
              const matchesApt = aptServices.includes(item.serviceName.trim().toLowerCase());

              if ((matchesText || matchesApt) && item.redeemedQuantity > 0) {
                itemsToRevert.push({ giftCardItemId: item.id, quantity: 1 });
              }
            }

            if (itemsToRevert.length === 0) {
              const singleRedeemed = targetGc.items.find((i) => i.redeemedQuantity > 0);
              if (singleRedeemed) {
                itemsToRevert.push({ giftCardItemId: singleRedeemed.id, quantity: 1 });
              }
            }

            if (itemsToRevert.length > 0) {
              await revertGiftCardRedeem(targetGc.id, {
                note: `Restitución automática por cancelación de cita #${appointment.id} (${appointment.appointmentDate}). Motivo: ${reason}`,
                items: itemsToRevert,
              });
              await fetchGiftCards();
              giftCardRestored = true;
            }
          }
        } catch (gcErr) {
          console.error('Error al revertir saldo de GiftCard en cancelación:', gcErr);
        }
      }

      const initiatorLabel = cancelledBy === 'MANICURIST' ? 'Manicurista' : 'Cliente';
      const gcNotice = giftCardRestored
        ? `\nSaldo GiftCard ${gcInfo?.code}: Restituido exitosamente a la clienta.`
        : '';
      const cancellationBlock = `--- CANCELACIÓN ---\nCancelado por: ${initiatorLabel}\nMotivo: ${reason}${gcNotice}`;

      const updatedNotes = appointment.notes
        ? `${appointment.notes}\n\n${cancellationBlock}`
        : cancellationBlock;

      await updateAppointmentStatus(cancelingAppointmentId, AppointmentStatus.CANCELLED, { notes: updatedNotes });
      // Actualizar las notas con el motivo
      await updateAppointment(cancelingAppointmentId, { notes: updatedNotes });

      // 🔍 Track cancellation en GA4
      trackAppointmentCancelled(cancelingAppointmentId, appointment.customer.id, reason, cancelledBy.toLowerCase());

      if (giftCardRestored) {
        toast.success(
          cancelledBy === 'MANICURIST'
            ? 'Cita cancelada y saldo de GiftCard restituido a la clienta'
            : 'Cita cancelada correctamente y saldo de GiftCard restituido a la clienta'
        );
      } else {
        toast.success(cancelledBy === 'MANICURIST' ? 'Cita cancelada (por manicurista)' : 'Cita cancelada correctamente');
      }

      setShowCancelModal(false);
      setCancelingAppointmentId(null);
      await fetchAppointments();
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, 'Error al cancelar la cita'));
    } finally {
      setIsCancelLoading(false);
    }
  };

  const handleDeleteAppointment = async (id: number) => {
    if (confirm('¿Estás seguro de que deseas eliminar esta cita? Esta acción no se puede deshacer.')) {
      try {
        await deleteAppointment(id);
        toast.success('Cita eliminada');
        fetchAppointments();
      } catch (err: unknown) {
        toast.error(getErrorMessage(err, 'Error al eliminar la cita'));
      }
    }
  };

  const handleSendNotification = async (id: number) => {
    try {
      await appointmentsApi.sendNotification(id);
      toast.success('📧 Notificación enviada correctamente');
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, 'Error al enviar notificación'));
    }
  };

  const handleWhatsAppHandoff = async (id: number) => {
    try {
      const url = await appointmentsApi.whatsappHandoff(id);
      window.open(url, '_blank');
      toast.success('✅ Abriendo WhatsApp para traspaso');
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, 'Error al generar handoff'));
    }
  };

  const handleSendWhatsAppConfirmation = async (id: number) => {
    try {
      await appointmentsApi.sendWhatsAppConfirmation(id);
      toast.success('✅ Confirmación enviada por WhatsApp');
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, 'Error al enviar confirmación'));
    }
  };

  const handleSendWhatsAppReminder = async (id: number) => {
    try {
      await appointmentsApi.sendWhatsAppReminder(id);
      toast.success('✅ Recordatorio enviado por WhatsApp');
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, 'Error al enviar recordatorio'));
    }
  };

  const [selectedNotificationsApt, setSelectedNotificationsApt] = useState<Appointment | null>(null);

  const resetForm = () => {
    setFormData({
      customerId: 0,
      serviceIds: [],
      appointmentDate: searchParams.get('date') || '',
      appointmentTime: '',
      notes: '',
    });
    setCustomerSearch('');
    setServiceSearch('');
    setSummaryServiceSearch('');
    setCustomChargeItems([]);
    setIsCustomerListCollapsed(false);
    setIsServiceListCollapsed(false);
    setCreateUseGiftCardChoice(null);
    setCreateSelectedGiftCardId(null);
    setCreateSelectedGiftCardItemIds([]);
    setIsCreatingAppointment(false);
  };

  const toggleCreateService = (serviceId: number) => {
    setFormData((prev) => ({
      ...prev,
      serviceIds: prev.serviceIds.includes(serviceId)
        ? prev.serviceIds.filter((id) => id !== serviceId)
        : [...prev.serviceIds, serviceId],
    }));
  };

  const toggleEditService = (serviceId: number) => {
    setEditFormData((prev) => ({
      ...prev,
      serviceIds: prev.serviceIds.includes(serviceId)
        ? prev.serviceIds.filter((id) => id !== serviceId)
        : [...prev.serviceIds, serviceId],
    }));
  };

  const addCustomChargeItem = () => {
    setCustomChargeItems((prev) => [
      ...prev,
      { id: nextCustomChargeId, description: '', amount: 0 },
    ]);
    setNextCustomChargeId((prev) => prev + 1);
  };

  const updateCustomChargeItem = (id: number, patch: Partial<CustomChargeItem>) => {
    setCustomChargeItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...patch } : item))
    );
  };

  const removeCustomChargeItem = (id: number) => {
    setCustomChargeItems((prev) => prev.filter((item) => item.id !== id));
  };

  const [openDropdownAptId, setOpenDropdownAptId] = useState<number | null>(null);

  useEffect(() => {
    const handleClickOutside = () => setOpenDropdownAptId(null);
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  const getStatusBadge = (status: AppointmentStatus) => {
    const variants: Record<AppointmentStatus, 'warning' | 'primary' | 'success' | 'secondary'> = {
      PENDING: 'warning',
      CONFIRMED: 'primary',
      COMPLETED: 'success',
      CANCELLED: 'secondary',
      RESCHEDULE_REQUESTED: 'warning',
    };
    const labels: Record<AppointmentStatus, string> = {
      PENDING: 'Pendiente',
      CONFIRMED: 'Confirmada',
      COMPLETED: 'Completada',
      CANCELLED: 'Cancelada',
      RESCHEDULE_REQUESTED: '🔄 Reprogramar',
    };
    return <Badge variant={variants[status]}>{labels[status]}</Badge>;
  };

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-bunny-dark tracking-tight">
              📅 Gestión de Citas
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Administra las citas y agenda del salón
            </p>
          </div>
          <div>
            <Button variant="primary" onClick={() => openCreateModal()} className="shadow-xs">
              + Nueva Cita
            </Button>
          </div>
        </div>

        {error && (
          <Alert variant="danger" onClose={clearError} dismissible>
            {error}
          </Alert>
        )}

        {/* Barra de Búsqueda y Filtros */}
        <Card className="border border-slate-200/80 shadow-xs bg-white">
          <Card.Body className="p-4 sm:p-5">
            <AppointmentFiltersBar
              searchQuery={searchQuery}
              onSearchQueryChange={setSearchQuery}
              dateFilter={dateFilter}
              onDateFilterChange={setDateFilter}
              statusFilter={statusFilter}
              onStatusFilterChange={setStatusFilter}
              onApplyFilters={handleApplyFilters}
              onClearFilters={handleClearFilters}
              isLoading={isLoading}
            />
          </Card.Body>
        </Card>

        {/* Resumen de resultados */}
        <div className="flex justify-between items-center">
          <div className="text-slate-500 text-xs sm:text-sm">
            Mostrando <strong className="text-slate-800 font-bold">{displayedAppointments.length}</strong> de <strong className="text-slate-800 font-bold">{appointments.length}</strong> citas
            {(dateFilter || searchQuery || statusFilter !== 'ACTIVE') && (
              <Badge variant="info" className="ml-2 font-normal">Filtros activos</Badge>
            )}
          </div>
        </div>

        <div>
          {isLoading ? (
            <div className="text-center py-12 flex flex-col items-center justify-center">
              <Spinner size="lg" variant="primary" />
              <span className="text-slate-500 text-sm mt-3">Cargando citas...</span>
            </div>
          ) : displayedAppointments.length === 0 ? (
            <Alert variant="info">
              No hay citas que mostrar. {dateFilter || searchQuery || statusFilter !== 'ACTIVE' ? 'Intenta cambiar los filtros o el término de búsqueda.' : 'Crea tu primera cita.'}
            </Alert>
          ) : (
            <>
              {/* Vista Desktop: Tabla */}
              <div className="hidden md:block overflow-hidden bg-white border border-slate-200/80 rounded-2xl shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider">
                        <th className="px-3.5 py-3">Fecha</th>
                        <th className="px-3.5 py-3">Hora</th>
                        <th className="px-3.5 py-3">Cliente</th>
                        <th className="px-3.5 py-3">Servicio(s)</th>
                        <th className="px-3.5 py-3">Valor</th>
                        <th className="px-3.5 py-3">Estado</th>
                        <th className="px-3.5 py-3 text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {displayedAppointments.map((apt) => {
                        const appointmentServices = getAppointmentServices(apt);
                        return (
                          <tr key={apt.id} className="hover:bg-slate-50/60 transition-colors">
                            <td className="px-3.5 py-3 font-medium text-slate-800 whitespace-nowrap">
                              {format(parseISO(apt.appointmentDate), 'dd/MM/yyyy', { locale: es })}
                            </td>
                            <td className="px-3.5 py-3 font-semibold text-slate-700 whitespace-nowrap">
                              {apt.appointmentTime.slice(0, 5)}
                            </td>
                            <td className="px-3.5 py-3 text-slate-800 font-medium">
                              {apt.customer.fullName}
                            </td>
                            <td className="px-3.5 py-3 text-slate-600 max-w-xs truncate" title={appointmentServices.map((s) => s.name).join(' + ')}>
                              {appointmentServices.map((service) => service.name).join(' + ')}
                            </td>
                            <td className="px-3.5 py-3 font-bold text-emerald-700 whitespace-nowrap">
                              {formatCurrency(getAppointmentTotal(apt))}
                            </td>
                            <td className="px-3.5 py-3 whitespace-nowrap">
                              {getStatusBadge(apt.status)}
                            </td>
                            <td className="px-3.5 py-3 text-right whitespace-nowrap">
                              <div className="inline-flex items-center justify-end gap-1.5 flex-wrap">
                                {apt.status === AppointmentStatus.RESCHEDULE_REQUESTED ? (
                                  <Button
                                    size="sm"
                                    variant="warning"
                                    onClick={() => openRescheduleModal(apt)}
                                    title="Reagendar esta cita con nueva fecha y hora (mismo ID)"
                                    className="text-xs py-1 px-2.5"
                                  >
                                    🔄 Reagendar
                                  </Button>
                                ) : (
                                  <>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => openEditModal(apt)}
                                      title="Editar detalles de esta cita (mismo ID)"
                                      className="text-xs py-1 px-2.5"
                                    >
                                      Editar
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => openNextAppointmentModal(apt)}
                                      title="Agendar próxima cita futura para esta clienta (mantiene cliente y servicios, crea nuevo ID)"
                                      className="text-xs py-1 px-2.5 text-emerald-700 border-emerald-300 hover:bg-emerald-50"
                                    >
                                      ➕ Próxima
                                    </Button>
                                  </>
                                )}
                                {apt.status === AppointmentStatus.PENDING && (
                                  <Button
                                    size="sm"
                                    variant="success"
                                    onClick={() => handleChangeStatus(apt.id, AppointmentStatus.CONFIRMED)}
                                    className="text-xs py-1 px-2.5"
                                  >
                                    Confirmar
                                  </Button>
                                )}
                                {apt.status === AppointmentStatus.CONFIRMED && (
                                  <Button
                                    size="sm"
                                    variant="primary"
                                    onClick={() => handleChangeStatus(apt.id, AppointmentStatus.COMPLETED)}
                                    className="text-xs py-1 px-2.5"
                                  >
                                    Completar
                                  </Button>
                                )}
                                {apt.status === AppointmentStatus.RESCHEDULE_REQUESTED && (
                                  <a
                                    href={`https://wa.me/${apt.customer.phone?.replace(/\D/g, '')}?text=${encodeURIComponent(`Hola ${apt.customer.fullName}! Te escribimos de BunnyCure respecto a tu solicitud para reprogramar tu cita del ${format(parseISO(apt.appointmentDate), 'dd/MM/yyyy', { locale: es })}.`)}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    title="Contactar por WhatsApp"
                                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 transition-colors"
                                  >
                                    <FaWhatsapp className="text-emerald-600" /> Contactar
                                  </a>
                                )}
                                {apt.status !== AppointmentStatus.CANCELLED && apt.status !== AppointmentStatus.COMPLETED && (
                                  <Button
                                    size="sm"
                                    variant="warning"
                                    onClick={() => handleCancelAppointment(apt.id)}
                                    title="Cancelar cita solicitando motivo"
                                    className="text-xs py-1 px-2.5"
                                  >
                                    Cancelar
                                  </Button>
                                )}

                                {/* Dropdown de comunicación */}
                                <div className="relative inline-block text-left">
                                  <button
                                    type="button"
                                    className="inline-flex items-center justify-center p-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 shadow-xs text-xs font-medium"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setOpenDropdownAptId(openDropdownAptId === apt.id ? null : apt.id);
                                    }}
                                    title="Opciones de mensajería"
                                  >
                                    📩
                                  </button>
                                  {openDropdownAptId === apt.id && (
                                    <div 
                                      className="absolute right-0 mt-1 w-52 rounded-xl bg-white shadow-xl border border-slate-200 py-1 z-50 text-xs text-left"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <button
                                        type="button"
                                        className="w-full text-left px-3 py-1.5 hover:bg-slate-50 flex items-center gap-2 text-slate-700"
                                        onClick={() => {
                                          setOpenDropdownAptId(null);
                                          handleSendNotification(apt.id);
                                        }}
                                      >
                                        <FaBell className="text-amber-500" /> Enviar Notificación
                                      </button>
                                      <button
                                        type="button"
                                        className="w-full text-left px-3 py-1.5 hover:bg-slate-50 flex items-center gap-2 text-slate-700"
                                        onClick={() => {
                                          setOpenDropdownAptId(null);
                                          handleSendWhatsAppConfirmation(apt.id);
                                        }}
                                      >
                                        <FaWhatsapp className="text-emerald-500" /> Confirmar por WhatsApp
                                      </button>
                                      <button
                                        type="button"
                                        className="w-full text-left px-3 py-1.5 hover:bg-slate-50 flex items-center gap-2 text-slate-700"
                                        onClick={() => {
                                          setOpenDropdownAptId(null);
                                          handleSendWhatsAppReminder(apt.id);
                                        }}
                                      >
                                        <FaEnvelope className="text-sky-500" /> Recordatorio WhatsApp
                                      </button>
                                      <div className="border-t border-slate-100 my-1"></div>
                                      <button
                                        type="button"
                                        className="w-full text-left px-3 py-1.5 hover:bg-slate-50 flex items-center gap-2 text-slate-700"
                                        onClick={() => {
                                          setOpenDropdownAptId(null);
                                          setSelectedNotificationsApt(apt);
                                        }}
                                      >
                                        <FaHistory className="text-sky-600" /> Historial de Mensajes
                                      </button>
                                      <div className="border-t border-slate-100 my-1"></div>
                                      <button
                                        type="button"
                                        className="w-full text-left px-3 py-1.5 hover:bg-slate-50 flex items-center gap-2 text-slate-700"
                                        onClick={() => {
                                          setOpenDropdownAptId(null);
                                          handleWhatsAppHandoff(apt.id);
                                        }}
                                      >
                                        <FaWhatsapp className="text-emerald-500" /> Traspaso a Humano
                                      </button>
                                    </div>
                                  )}
                                </div>

                                <Button
                                  size="sm"
                                  variant="danger"
                                  onClick={() => handleDeleteAppointment(apt.id)}
                                  className="text-xs py-1 px-2.5"
                                >
                                  Eliminar
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Vista Móvil: Cards */}
              <div className="md:hidden space-y-3">
                {displayedAppointments.map((apt) => {
                  const appointmentServices = getAppointmentServices(apt);
                  return (
                    <Card key={apt.id} className="border border-slate-200 shadow-xs bg-white">
                      <Card.Body className="p-4">
                        <div className="flex justify-between items-start mb-2 gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="text-slate-400 text-xs mb-0.5 truncate">
                              {format(parseISO(apt.appointmentDate), 'EEEE d MMMM', { locale: es })}
                            </div>
                            <h6 className="font-bold text-bunny-dark text-sm truncate">
                              {apt.appointmentTime.slice(0, 5)} · {apt.customer.fullName}
                            </h6>
                          </div>
                          <div className="flex-shrink-0">
                            {getStatusBadge(apt.status)}
                          </div>
                        </div>

                        <div className="mb-3">
                          <div className="flex justify-between items-center gap-2">
                            <span className="text-slate-600 text-xs truncate flex-1">
                              {appointmentServices.map((service) => service.name).join(' + ')}
                            </span>
                            <span className="font-bold text-emerald-700 text-xs flex-shrink-0">
                              {formatCurrency(getAppointmentTotal(apt))}
                            </span>
                          </div>
                          {apt.notes && (
                            <div className="mt-2 p-2 bg-slate-50 rounded-lg text-xs text-slate-600 italic border border-slate-100">
                              {apt.notes}
                            </div>
                          )}
                        </div>

                        <div className="flex gap-1.5 flex-wrap">
                          {apt.status === AppointmentStatus.RESCHEDULE_REQUESTED ? (
                            <Button size="sm" variant="warning" className="flex-1 text-xs" onClick={() => openRescheduleModal(apt)} title="Reagendar esta cita (mismo ID)">
                              🔄 Reagendar
                            </Button>
                          ) : (
                            <>
                              <Button size="sm" variant="outline" className="flex-1 text-xs" onClick={() => openEditModal(apt)}>
                                Editar
                              </Button>
                              <Button size="sm" variant="outline" className="flex-1 text-xs text-emerald-700 border-emerald-300" onClick={() => openNextAppointmentModal(apt)} title="Agendar próxima cita futura (nuevo ID)">
                                ➕ Próxima
                              </Button>
                            </>
                          )}
                          {apt.status === AppointmentStatus.PENDING && (
                            <Button size="sm" variant="success" className="flex-1 text-xs" onClick={() => handleChangeStatus(apt.id, AppointmentStatus.CONFIRMED)}>
                              Confirmar
                            </Button>
                          )}
                          {apt.status === AppointmentStatus.CONFIRMED && (
                            <Button size="sm" variant="primary" className="flex-1 text-xs" onClick={() => handleChangeStatus(apt.id, AppointmentStatus.COMPLETED)}>
                              Completar
                            </Button>
                          )}
                          {apt.status === AppointmentStatus.RESCHEDULE_REQUESTED && (
                            <a
                              href={`https://wa.me/${apt.customer.phone?.replace(/\D/g, '')}?text=${encodeURIComponent(`Hola ${apt.customer.fullName}! Te escribimos de BunnyCure respecto a tu solicitud para reprogramar tu cita del ${format(parseISO(apt.appointmentDate), 'dd/MM/yyyy', { locale: es })}.`)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex-1 inline-flex items-center justify-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg text-emerald-700 bg-emerald-50 border border-emerald-200"
                            >
                              <FaWhatsapp /> Contactar
                            </a>
                          )}
                          {apt.status !== AppointmentStatus.CANCELLED && apt.status !== AppointmentStatus.COMPLETED && (
                            <Button size="sm" variant="warning" className="text-xs" onClick={() => handleCancelAppointment(apt.id)}>
                              Cancelar
                            </Button>
                          )}
                          <Button size="sm" variant="outline" className="text-xs px-2.5" onClick={() => setSelectedNotificationsApt(apt)} title="Historial de Mensajes">
                            <FaHistory className="text-sky-600" />
                          </Button>
                          <Button size="sm" variant="danger" className="text-xs px-2.5" onClick={() => handleDeleteAppointment(apt.id)}>
                            Eliminar
                          </Button>
                        </div>
                      </Card.Body>
                    </Card>
                  );
                })}
              </div>
            </>
          )}
        </div>

      <Modal
        show={showCreateAppointmentModal}
        onHide={closeCreateModal}
        size="xl"
        centered
        className="max-h-[92vh] flex flex-col"
      >
        <Modal.Header closeButton className="bg-bunny-creamy/30 border-b border-bunny-accent/40 shrink-0">
          <Modal.Title>
            <span className="text-bunny-dark font-bold text-lg">
              {createStep === 'form' ? '✨ Nueva Cita' : '📋 Resumen de Nueva Cita'}
            </span>
          </Modal.Title>
        </Modal.Header>
        {createStep === 'form' ? (
          <form onSubmit={handleGoToCreateSummary} className="flex flex-col flex-1 min-h-0 overflow-hidden">
            <Modal.Body className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Selector de Cliente */}
                <div>
                  <label className="text-xs font-bold text-slate-700 mb-1.5 block">
                    Cliente <span className="text-rose-500">*</span>
                  </label>
                  {isCustomerListCollapsed && selectedCreateCustomer ? (
                    <div className="p-3 border border-bunny-accent/40 rounded-xl mb-2 flex justify-between items-center bg-slate-50">
                      <div>
                        <div className="font-semibold text-bunny-dark text-sm">{selectedCreateCustomer.fullName}</div>
                        <small className="text-slate-500 text-xs">{selectedCreateCustomer.phone}</small>
                        {availableCreateCustomerGiftCards.length > 0 && (
                          <div className="mt-1">
                            <Badge variant="success" className="inline-flex items-center gap-1 text-xs">
                              <span>🎁</span>
                              <span>{availableCreateCustomerGiftCards.length} GiftCard activa(s) con saldo</span>
                            </Badge>
                          </div>
                        )}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setIsCustomerListCollapsed(false);
                          setCreateUseGiftCardChoice(null);
                          setCreateSelectedGiftCardId(null);
                          setCreateSelectedGiftCardItemIds([]);
                        }}
                        className="text-xs"
                      >
                        Cambiar
                      </Button>
                    </div>
                  ) : (
                    <>
                      <input
                        type="text"
                        placeholder="Buscar cliente por nombre o teléfono..."
                        value={customerSearch}
                        onChange={(e) => setCustomerSearch(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-bunny-mid/50 focus:border-bunny-mid bg-white mb-2"
                      />
                      <div className="border border-slate-200 rounded-xl max-h-52 overflow-y-auto divide-y divide-slate-100 bg-white">
                        {filteredCustomers.length > 0 ? (
                          filteredCustomers.map((customer) => (
                            <button
                              key={customer.id}
                              type="button"
                              className={`w-full text-left p-2.5 transition-colors ${
                                formData.customerId === customer.id ? 'bg-bunny-creamy/50 text-bunny-dark font-medium' : 'hover:bg-slate-50 text-slate-700'
                              }`}
                              onClick={() => {
                                setFormData((prev) => ({ ...prev, customerId: customer.id }));
                                setIsCustomerListCollapsed(true);
                                setCreateUseGiftCardChoice(null);
                                setCreateSelectedGiftCardId(null);
                                setCreateSelectedGiftCardItemIds([]);
                              }}
                            >
                              <div className="font-semibold text-sm">{customer.fullName}</div>
                              <small className="text-xs text-slate-500">{customer.phone}</small>
                            </button>
                          ))
                        ) : (
                          <div className="p-3 text-slate-400 text-sm text-center">No se encontraron clientes</div>
                        )}
                      </div>
                      <small className="text-xs text-slate-500 mt-1 block">
                        {selectedCreateCustomer
                          ? `Seleccionado: ${selectedCreateCustomer.fullName}`
                          : 'Selecciona un cliente de la lista'}
                      </small>
                    </>
                  )}
                </div>

                {/* Selector de Servicios */}
                <div>
                  <label className="text-xs font-bold text-slate-700 mb-1.5 block">
                    Servicio(s) <span className="text-rose-500">*</span>
                  </label>
                  {isServiceListCollapsed && selectedCreateServices.length > 0 ? (
                    <div className="p-3 border border-bunny-accent/40 rounded-xl mb-2 flex justify-between items-center bg-slate-50">
                      <div>
                        <div className="font-semibold text-bunny-dark text-sm">
                          {selectedCreateServices.length === 1
                            ? selectedCreateServices[0].name
                            : `${selectedCreateServices.length} servicios (${selectedCreateServices.map((s) => s.name).join(' + ')})`}
                        </div>
                        <small className="text-slate-500 text-xs">{formatCurrency(createTotal)} ({createDuration} min)</small>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => setIsServiceListCollapsed(false)} className="text-xs">
                        Cambiar
                      </Button>
                    </div>
                  ) : (
                    <>
                      <input
                        type="text"
                        placeholder="Buscar servicios..."
                        value={serviceSearch}
                        onChange={(e) => setServiceSearch(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-bunny-mid/50 focus:border-bunny-mid bg-white mb-2"
                      />
                      <div className="border border-slate-200 rounded-xl max-h-48 overflow-y-auto divide-y divide-slate-100 bg-white">
                        {filteredServices.length > 0 ? (
                          filteredServices.map((service) => {
                            const isSelected = formData.serviceIds.includes(service.id);
                            return (
                              <button
                                key={service.id}
                                type="button"
                                className={`w-full text-left p-2.5 flex justify-between items-center transition-colors ${
                                  isSelected ? 'bg-bunny-creamy/50 text-bunny-dark' : 'hover:bg-slate-50 text-slate-700'
                                }`}
                                onClick={() => {
                                  if (!isSelected) {
                                    setFormData((prev) => ({
                                      ...prev,
                                      serviceIds: [...prev.serviceIds, service.id],
                                    }));
                                  } else {
                                    toggleCreateService(service.id);
                                  }
                                  setIsServiceListCollapsed(true);
                                }}
                              >
                                <div>
                                  <div className="font-semibold text-sm">{service.name}</div>
                                  <small className="text-xs text-slate-500">⏱️ {service.durationMinutes} min</small>
                                </div>
                                <div className="text-right">
                                  <div className="font-bold text-sm text-slate-800">{formatCurrency(service.price)}</div>
                                  {isSelected && <span className="inline-block mt-0.5 text-xs text-bunny-dark font-medium bg-white px-1.5 py-0.5 rounded border border-bunny-accent/40">✓ Seleccionado</span>}
                                </div>
                              </button>
                            );
                          })
                        ) : (
                          <div className="p-3 text-slate-400 text-sm text-center">No se encontraron servicios</div>
                        )}
                      </div>
                      {formData.serviceIds.length > 0 && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-2 w-full text-xs"
                          onClick={() => setIsServiceListCollapsed(true)}
                        >
                          Cerrar lista de servicios
                        </Button>
                      )}
                      <small className="text-xs text-slate-500 mt-2 block">
                        Seleccionados: {selectedCreateServices.length} | Total: {formatCurrency(createTotal)} | Duración: {createDuration} min
                      </small>
                    </>
                  )}
                </div>
              </div>

              <AppointmentSchedulePicker
                selectedDate={formData.appointmentDate}
                selectedTime={formData.appointmentTime}
                durationMinutes={createDuration}
                onDateChange={(date) => setFormData((prev) => ({ ...prev, appointmentDate: date }))}
                onTimeChange={(time) => setFormData((prev) => ({ ...prev, appointmentTime: time }))}
                unavailabilities={unavailabilities}
                unavailabilityColors={unavailabilityColors}
                appointments={appointments}
                minDate={format(new Date(), 'yyyy-MM-dd')}
              />

              <div>
                <label className="text-xs font-bold text-slate-700 mb-1.5 block">Detalle de servicios</label>
                <input
                  type="text"
                  readOnly
                  value={selectedCreateServices.map((service) => service.name).join(' + ') || 'Sin servicios seleccionados'}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 font-medium"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 mb-1.5 block">Notas</label>
                <textarea
                  rows={3}
                  value={formData.notes}
                  onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
                  placeholder="Observaciones, preferencias, etc..."
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-bunny-mid/50 focus:border-bunny-mid bg-white transition-colors"
                />
              </div>
            </Modal.Body>
            <Modal.Footer className="border-t border-slate-100 flex justify-end gap-2 p-4 shrink-0 bg-white">
              <Button variant="secondary" onClick={closeCreateModal}>
                Cancelar
              </Button>
              <Button variant="primary" type="submit">
                Continuar al resumen &rarr;
              </Button>
            </Modal.Footer>
          </form>
        ) : (
          <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
            <Modal.Body className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
              {/* Tarjeta de Resumen Rápido Superior */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-bunny-creamy/50 via-white to-pink-50/40 border border-bunny-accent/60 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-bunny-mid">Cliente</span>
                      <strong className="text-slate-800 text-sm">{selectedCreateCustomer?.fullName || 'Sin cliente'}</strong>
                      {selectedCreateCustomer?.phone && (
                        <span className="text-slate-500 text-xs">({selectedCreateCustomer.phone})</span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
                      <span>📅 <strong>{formData.appointmentDate}</strong></span>
                      <span>·</span>
                      <span>⏰ <strong>{formData.appointmentTime} hrs</strong></span>
                      <span>·</span>
                      <span>⏱️ {createDuration} min</span>
                      <span>·</span>
                      <span>💅 {selectedCreateServices.length} servicio(s)</span>
                    </div>
                  </div>

                  <div className="sm:text-right p-2.5 rounded-xl bg-white border border-slate-200/90 shadow-2xs">
                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total a cobrar en local</div>
                    <div className={`text-lg font-black ${createUseGiftCardChoice === 'YES' && createNetTotalToPay === 0 ? 'text-emerald-700' : 'text-bunny-dark'}`}>
                      {createUseGiftCardChoice === 'YES' && createNetTotalToPay === 0
                        ? '$0 (100% Cubierto)'
                        : formatCurrency(createUseGiftCardChoice === 'YES' ? createNetTotalToPay : createFinalTotal)}
                    </div>
                  </div>
                </div>
              </div>

              <Alert variant="info" className="py-2.5 text-xs">
                Revisa el detalle antes de crear la cita. Desde aquí puedes ajustar servicios y agregar cargos extra.
              </Alert>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <h6 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Cliente</h6>
                  <p className="font-semibold text-slate-800 text-sm mb-0">{selectedCreateCustomer?.fullName || 'Sin cliente'}</p>
                  <small className="text-slate-500 text-xs">{selectedCreateCustomer?.phone || '-'}</small>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <h6 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Fecha y hora</h6>
                  <p className="font-semibold text-slate-800 text-sm mb-0">
                    {formData.appointmentDate} · {formData.appointmentTime}
                  </p>
                </div>
              </div>

              <div>
                <h6 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Notas</h6>
                <p className="text-sm text-slate-600 mb-0 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  {formData.notes.trim() || 'Sin notas'}
                </p>
              </div>

              {availableCreateCustomerGiftCards.length > 0 && (
                <div className="p-4 border border-bunny-accent/40 rounded-2xl bg-white shadow-xs">
                  <div className="flex justify-between items-center mb-3 flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">🎁</span>
                      <strong className="text-slate-800 text-sm">GiftCard Activa Detectada</strong>
                    </div>
                    <Badge
                      variant={
                        createUseGiftCardChoice === 'YES'
                          ? 'success'
                          : createUseGiftCardChoice === 'NO'
                          ? 'secondary'
                          : 'warning'
                      }
                      className="px-2.5 py-1 text-xs"
                    >
                      {createUseGiftCardChoice === 'YES'
                        ? '✓ Cobro con GiftCard'
                        : createUseGiftCardChoice === 'NO'
                        ? 'Cobro habitual sin GiftCard'
                        : '⚠️ Selección requerida'}
                    </Badge>
                  </div>

                  <p className="text-xs text-slate-500 mb-3">
                    La clienta tiene <strong>{availableCreateCustomerGiftCards.length} GiftCard(s) activa(s)</strong> con saldo ({availableCreateCustomerGiftCards.map((gc) => gc.code).join(', ')}).
                  </p>

                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 mb-3">
                    <label className="text-xs font-bold text-slate-700 mb-2 block">
                      ¿Deseas utilizar la GiftCard para el cobro de esta cita? <span className="text-rose-500">*</span>
                    </label>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant={createUseGiftCardChoice === 'YES' ? 'success' : 'outline'}
                        onClick={() => handleSelectCreateGiftCardUsage('YES')}
                        className="flex items-center gap-1.5 text-xs"
                      >
                        <span>🎁</span>
                        <span>Sí, utilizar GiftCard para cobro</span>
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant={createUseGiftCardChoice === 'NO' ? 'secondary' : 'outline'}
                        onClick={() => handleSelectCreateGiftCardUsage('NO')}
                        className="flex items-center gap-1.5 text-xs"
                      >
                        <span>💵</span>
                        <span>No utilizar GiftCard (Cobro habitual)</span>
                      </Button>
                    </div>
                  </div>

                  {createUseGiftCardChoice === 'NO' && (
                    <div className="text-xs text-slate-500 italic px-1">
                      ℹ️ La cita se cobrará habitualmente en el local (efectivo/transferencia). El saldo de la GiftCard no se descontará.
                    </div>
                  )}

                  {createUseGiftCardChoice === 'YES' && effectiveSelectedGiftCard && (
                    <div className="mt-3 pt-3 border-t border-slate-100">
                      {availableCreateCustomerGiftCards.length > 1 && (
                        <div className="mb-3">
                          <label className="text-xs font-semibold text-slate-700 mb-1 block">GiftCard a utilizar:</label>
                          <select
                            value={effectiveSelectedGiftCard.id}
                            onChange={(e) => {
                              const newId = Number(e.target.value);
                              setCreateSelectedGiftCardId(newId);
                              const newGc = availableCreateCustomerGiftCards.find((g) => g.id === newId);
                              if (newGc) {
                                const matchingItems = newGc.items.filter((item) => {
                                  if (item.remainingQuantity <= 0) return false;
                                  return selectedCreateServices.some(
                                    (s) =>
                                      s.id === item.serviceId ||
                                      s.name.trim().toLowerCase() === item.serviceName.trim().toLowerCase()
                                  );
                                });
                                if (matchingItems.length > 0) {
                                  setCreateSelectedGiftCardItemIds(matchingItems.map((i) => i.id));
                                } else {
                                  const firstAvail = newGc.items.find((i) => i.remainingQuantity > 0);
                                  setCreateSelectedGiftCardItemIds(firstAvail ? [firstAvail.id] : []);
                                }
                              }
                            }}
                            className="w-full rounded-xl border border-slate-200 px-3 py-1.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-bunny-mid/50"
                          >
                            {availableCreateCustomerGiftCards.map((gc) => (
                              <option key={gc.id} value={gc.id}>
                                {gc.code} - Vence: {gc.expiresOn} (
                                {gc.items.filter((i) => i.remainingQuantity > 0).length} servicio(s) con saldo)
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      <div className="flex justify-between items-center mb-2">
                        <small className="font-semibold text-slate-700 text-xs">
                          Selecciona los servicios de {effectiveSelectedGiftCard.code} a canjear en esta cita:
                        </small>
                        <button
                          type="button"
                          className="text-xs text-bunny-mid hover:underline font-medium"
                          onClick={() =>
                            navigate(`/giftcards?search=${encodeURIComponent(effectiveSelectedGiftCard.code)}`)
                          }
                        >
                          Ver detalle GiftCard ↗
                        </button>
                      </div>

                      <div className="space-y-1.5 mb-3">
                        {effectiveSelectedGiftCard.items
                          .filter((item) => item.remainingQuantity > 0)
                          .map((item) => {
                            const isChecked = createSelectedGiftCardItemIds.includes(item.id);
                            const matchesService = selectedCreateServices.some(
                              (s) =>
                                s.id === item.serviceId ||
                                s.name.trim().toLowerCase() === item.serviceName.trim().toLowerCase()
                            );
                            return (
                              <div
                                key={item.id}
                                className={`p-2.5 rounded-xl border flex justify-between items-center cursor-pointer transition-colors ${
                                  isChecked ? 'bg-emerald-50 border-emerald-300' : 'bg-white border-slate-200 hover:bg-slate-50'
                                }`}
                                onClick={() => toggleCreateGiftCardItem(item.id)}
                              >
                                <label className="flex items-center gap-2 cursor-pointer flex-1">
                                  <input
                                    type="checkbox"
                                    id={`create-gc-item-${item.id}`}
                                    checked={isChecked}
                                    onChange={() => toggleCreateGiftCardItem(item.id)}
                                    onClick={(e) => e.stopPropagation()}
                                    className="rounded text-bunny-mid focus:ring-bunny-mid h-4 w-4 border-slate-300"
                                  />
                                  <div>
                                    <span className="font-semibold text-xs text-slate-800">{item.serviceName}</span>
                                    {matchesService && (
                                      <Badge variant="info" className="ml-2 text-xs">
                                        Coincide con servicio
                                      </Badge>
                                    )}
                                    <div className="text-slate-500 text-xs mt-0.5">
                                      Valor: {formatCurrency(item.unitPrice)} · Disponibles: {item.remainingQuantity}
                                    </div>
                                  </div>
                                </label>
                                <span className={`font-bold text-xs ${isChecked ? 'text-emerald-700' : 'text-slate-500'}`}>
                                  {isChecked ? `-${formatCurrency(item.unitPrice)}` : formatCurrency(item.unitPrice)}
                                </span>
                              </div>
                            );
                          })}
                      </div>

                      {createGiftCardCoverage > 0 && (
                        <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex justify-between items-center font-medium">
                          <span>Total cubierto por GiftCard:</span>
                          <strong className="text-emerald-700">-{formatCurrency(createGiftCardCoverage)}</strong>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              <div className="border-t border-slate-200 pt-3">
                <h6 className="font-bold text-slate-800 text-sm mb-2">Servicios seleccionados</h6>
                <input
                  type="text"
                  placeholder="Buscar y ajustar servicios..."
                  value={summaryServiceSearch}
                  onChange={(e) => setSummaryServiceSearch(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-bunny-mid/50 focus:border-bunny-mid bg-white mb-2"
                />
                <div className="border border-slate-200 rounded-xl p-2.5 mb-2 max-h-48 overflow-y-auto space-y-1.5 bg-white">
                  {filteredSummaryServices.length > 0 ? (
                    filteredSummaryServices.map((service) => (
                      <label
                        key={`summary-service-${service.id}`}
                        className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-50 cursor-pointer text-xs"
                      >
                        <input
                          id={`summary-service-${service.id}`}
                          type="checkbox"
                          checked={formData.serviceIds.includes(service.id)}
                          onChange={() => toggleCreateService(service.id)}
                          className="rounded text-bunny-mid focus:ring-bunny-mid h-4 w-4 border-slate-300"
                        />
                        <span className="text-slate-700 font-medium">
                          {service.name} - {formatCurrency(service.price)} ({service.durationMinutes} min)
                        </span>
                      </label>
                    ))
                  ) : (
                    <div className="text-slate-400 text-xs text-center py-2">No se encontraron servicios</div>
                  )}
                </div>
                <div className="text-xs text-slate-500 mb-3">
                  Subtotal servicios: <strong className="text-slate-800">{formatCurrency(createTotal)}</strong> · Duración estimada: <strong className="text-slate-800">{createDuration} min</strong>
                </div>
              </div>

              <div className="border-t border-slate-200 pt-3">
                <div className="flex justify-between items-center mb-2">
                  <div>
                    <h6 className="font-bold text-slate-800 text-sm mb-0">Cargos extra personalizados</h6>
                    <small className="text-slate-500 text-xs">
                      Agrega ítems como cristalería, decoración u otros cobros adicionales.
                    </small>
                  </div>
                  <Button size="sm" variant="outline" onClick={addCustomChargeItem} className="text-xs">
                    + Agregar ítem
                  </Button>
                </div>

                {customChargeItems.length === 0 ? (
                  <p className="text-slate-400 text-xs italic mb-3">No hay cargos extra agregados.</p>
                ) : (
                  <div className="space-y-2 mb-3">
                    {customChargeItems.map((item) => (
                      <div key={item.id} className="grid grid-cols-12 gap-2 items-center">
                        <div className="col-span-7">
                          <input
                            type="text"
                            placeholder="Descripción (ej: Cristalería)"
                            value={item.description}
                            onChange={(e) =>
                              updateCustomChargeItem(item.id, { description: e.target.value })
                            }
                            className="w-full rounded-xl border border-slate-200 px-3 py-1.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-bunny-mid/50"
                          />
                        </div>
                        <div className="col-span-3">
                          <input
                            type="number"
                            min={0}
                            step={100}
                            value={item.amount}
                            onChange={(e) =>
                              updateCustomChargeItem(item.id, {
                                amount: Math.max(0, Number(e.target.value) || 0),
                              })
                            }
                            className="w-full rounded-xl border border-slate-200 px-3 py-1.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-bunny-mid/50"
                          />
                        </div>
                        <div className="col-span-2">
                          <Button
                            size="sm"
                            variant="danger"
                            onClick={() => removeCustomChargeItem(item.id)}
                            className="w-full text-xs py-1"
                          >
                            Eliminar
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="border-t border-slate-200 pt-3 space-y-1.5 text-sm">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal servicios</span>
                  <strong className="text-slate-800">{formatCurrency(createTotal)}</strong>
                </div>
                {createUseGiftCardChoice === 'YES' && createGiftCardCoverage > 0 && (
                  <div className="flex justify-between text-emerald-700">
                    <span>🎁 Cobertura GiftCard ({effectiveSelectedGiftCard?.code})</span>
                    <strong>-{formatCurrency(createGiftCardCoverage)}</strong>
                  </div>
                )}
                <div className="flex justify-between text-slate-600">
                  <span>Total extras</span>
                  <strong className="text-slate-800">{formatCurrency(customChargesTotal)}</strong>
                </div>
                <div className="flex justify-between text-base font-bold pt-2 border-t border-slate-200 text-slate-900">
                  <span>Total final a cobrar en local</span>
                  <span className={createUseGiftCardChoice === 'YES' && createNetTotalToPay === 0 ? 'text-emerald-700' : 'text-bunny-dark'}>
                    {createUseGiftCardChoice === 'YES' && createNetTotalToPay === 0
                      ? '$0 (100% Cubierto con GiftCard)'
                      : formatCurrency(createUseGiftCardChoice === 'YES' ? createNetTotalToPay : createFinalTotal)}
                  </span>
                </div>
              </div>
            </Modal.Body>
            <Modal.Footer className="border-t border-slate-100 flex flex-wrap sm:flex-nowrap items-center justify-between gap-2.5 p-4 shrink-0 bg-white">
              <Button
                variant="outline"
                onClick={() => setCreateStep('form')}
                disabled={isCreatingAppointment}
                className="text-xs sm:text-sm font-medium"
              >
                &larr; Volver a editar
              </Button>
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  onClick={closeCreateModal}
                  disabled={isCreatingAppointment}
                  className="text-xs sm:text-sm"
                >
                  Cancelar
                </Button>
                <Button
                  variant="primary"
                  onClick={handleConfirmCreateAppointment}
                  disabled={formData.serviceIds.length === 0 || isCreatingAppointment}
                  className="text-xs sm:text-sm font-bold shadow-xs flex items-center gap-1.5"
                >
                  {isCreatingAppointment ? (
                    'Creando cita...'
                  ) : (
                    <>
                      <span>✨ Crear cita</span>
                      <span className="opacity-90 font-normal text-xs">
                        ({createUseGiftCardChoice === 'YES' && createNetTotalToPay === 0
                          ? '$0'
                          : formatCurrency(createUseGiftCardChoice === 'YES' ? createNetTotalToPay : createFinalTotal)})
                      </span>
                    </>
                  )}
                </Button>
              </div>
            </Modal.Footer>
          </div>
        )}
      </Modal>

      <Modal
        show={showEditModal}
        onHide={closeEditModal}
        size="lg"
        centered
      >
        <Modal.Header closeButton className="bg-bunny-creamy/30 border-b border-bunny-accent/40">
          <Modal.Title>
            <span className="text-bunny-dark font-bold text-lg">
              {editMode === 'reschedule' ? `🔄 Reagendar Cita #${editingAppointmentId}` : `✏️ Editar Cita #${editingAppointmentId}`}
            </span>
          </Modal.Title>
        </Modal.Header>
        <form onSubmit={handleEditAppointment}>
          <Modal.Body className="p-4 sm:p-6 space-y-4 max-h-[75vh] overflow-y-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-700 mb-1.5 block">
                  Cliente <span className="text-rose-500">*</span>
                </label>
                {editMode === 'reschedule' ? (
                  <div className="p-3 border border-slate-200 rounded-xl bg-slate-50">
                    <div className="font-semibold text-slate-800 text-sm">{selectedEditCustomer?.fullName || 'Cliente no disponible'}</div>
                    <small className="text-slate-500 text-xs">{selectedEditCustomer?.phone || '-'}</small>
                  </div>
                ) : (
                  <>
                    <input
                      type="text"
                      placeholder="Buscar cliente por nombre o teléfono..."
                      value={editCustomerSearch}
                      onChange={(e) => setEditCustomerSearch(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-bunny-mid/50 focus:border-bunny-mid bg-white mb-2"
                    />
                    <div className="border border-slate-200 rounded-xl max-h-52 overflow-y-auto divide-y divide-slate-100 bg-white">
                      {filteredEditCustomers.length > 0 ? (
                        filteredEditCustomers.map((customer) => (
                          <button
                            key={customer.id}
                            type="button"
                            className={`w-full text-left p-2.5 transition-colors ${
                              editFormData.customerId === customer.id ? 'bg-bunny-creamy/50 text-bunny-dark font-medium' : 'hover:bg-slate-50 text-slate-700'
                            }`}
                            onClick={() => setEditFormData((prev) => ({ ...prev, customerId: customer.id }))}
                          >
                            <div className="font-semibold text-sm">{customer.fullName}</div>
                            <small className="text-xs text-slate-500">{customer.phone}</small>
                          </button>
                        ))
                      ) : (
                        <div className="p-3 text-slate-400 text-sm text-center">No se encontraron clientes</div>
                      )}
                    </div>
                    <small className="text-xs text-slate-500 mt-1 block">
                      {selectedEditCustomer
                        ? `Seleccionado: ${selectedEditCustomer.fullName}`
                        : 'Selecciona un cliente de la lista'}
                    </small>
                  </>
                )}
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 mb-1.5 block">
                  Servicio(s) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Buscar servicios..."
                  value={editServiceSearch}
                  onChange={(e) => setEditServiceSearch(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-bunny-mid/50 focus:border-bunny-mid bg-white mb-2"
                />
                <div className="border border-slate-200 rounded-xl p-2.5 max-h-52 overflow-y-auto space-y-1.5 bg-white">
                  {filteredEditServices.length > 0 ? (
                    filteredEditServices.map((service) => (
                      <label
                        key={service.id}
                        className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-50 cursor-pointer text-xs"
                      >
                        <input
                          id={`edit-service-${service.id}`}
                          type="checkbox"
                          checked={editFormData.serviceIds.includes(service.id)}
                          onChange={() => toggleEditService(service.id)}
                          className="rounded text-bunny-mid focus:ring-bunny-mid h-4 w-4 border-slate-300"
                        />
                        <span className="text-slate-700 font-medium">
                          {service.name} - {formatCurrency(service.price)} ({service.durationMinutes} min)
                        </span>
                      </label>
                    ))
                  ) : (
                    <div className="text-slate-400 text-xs text-center py-2">No se encontraron servicios</div>
                  )}
                </div>
                <small className="text-xs text-slate-500 mt-1 block">
                  Seleccionados: {selectedEditServices.length} | Total: {formatCurrency(editTotal)} | Duración: {editDuration} min
                </small>
              </div>
            </div>

            <AppointmentSchedulePicker
              selectedDate={editFormData.appointmentDate}
              selectedTime={editFormData.appointmentTime}
              durationMinutes={editDuration}
              onDateChange={(date) => setEditFormData((prev) => ({ ...prev, appointmentDate: date }))}
              onTimeChange={(time) => setEditFormData((prev) => ({ ...prev, appointmentTime: time }))}
              unavailabilities={unavailabilities}
              unavailabilityColors={unavailabilityColors}
              appointments={appointments.filter((a) => a.id !== editingAppointmentId)}
              allowPastDates={editMode === 'edit'}
            />

            {editMode === 'edit' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                <div>
                  <label className="text-xs font-bold text-slate-700 mb-1.5 block">Estado</label>
                  <select
                    value={editFormData.status}
                    onChange={(e) => setEditFormData((prev) => ({ ...prev, status: e.target.value as AppointmentStatus }))}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-bunny-mid/50 focus:border-bunny-mid bg-white"
                  >
                    <option value={AppointmentStatus.PENDING}>⏳ Pendiente</option>
                    <option value={AppointmentStatus.CONFIRMED}>✅ Confirmada</option>
                    <option value={AppointmentStatus.RESCHEDULE_REQUESTED}>🔄 Reprogramar</option>
                    <option value={AppointmentStatus.COMPLETED}>🎉 Completada</option>
                    <option value={AppointmentStatus.CANCELLED}>❌ Cancelada</option>
                  </select>
                </div>
                <div className="text-xs text-slate-500 md:pt-5">
                  Valor estimado: <strong className="text-slate-700">{formatCurrency(editTotal)} CLP</strong>
                </div>
              </div>
            ) : (
              <div className="p-3 bg-amber-50 text-amber-800 rounded-xl border border-amber-200 text-xs">
                🔄 Reagendando cita <strong>#{editingAppointmentId}</strong> de <strong>{selectedEditCustomer?.fullName}</strong>. Selecciona la nueva fecha y hora. La cita mantendrá su ID y pasará a estado <strong>Confirmada</strong>.
              </div>
            )}

            <div>
              <label className="text-xs font-bold text-slate-700 mb-1.5 block">Detalle de servicios</label>
              <input
                type="text"
                readOnly
                value={selectedEditServices.map((service) => service.name).join(' + ') || 'Sin servicios seleccionados'}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 font-medium"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 mb-1.5 block">Precio Final (CLP)</label>
              <input
                type="number"
                min={0}
                step={100}
                value={editFormData.totalPrice || 0}
                onChange={(e) => setEditFormData((prev) => ({ ...prev, totalPrice: Number(e.target.value) }))}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-bunny-mid/50 focus:border-bunny-mid bg-white"
              />
              <small className="text-xs text-slate-500 mt-1 block">
                Valor calculado según servicios: {formatCurrency(editTotal)}
              </small>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 mb-1.5 block">Notas</label>
              <textarea
                rows={3}
                value={editFormData.notes}
                onChange={(e) => setEditFormData((prev) => ({ ...prev, notes: e.target.value }))}
                placeholder="Observaciones, preferencias, etc..."
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-bunny-mid/50 focus:border-bunny-mid bg-white transition-colors"
              />
            </div>

            <div className="p-4 border border-bunny-accent/40 rounded-2xl bg-white shadow-xs">
              <div className="flex justify-between items-center mb-2">
                <div className="font-semibold text-sm text-bunny-dark">🎁 Canje de GiftCards para esta Cita</div>
                {availableEditCustomerGiftCards.length > 0 && (
                  <Badge variant="success" className="text-xs">
                    {availableEditCustomerGiftCards.length} disponible{availableEditCustomerGiftCards.length > 1 ? 's' : ''}
                  </Badge>
                )}
              </div>

              {availableEditCustomerGiftCards.length > 0 ? (
                <>
                  <p className="text-slate-500 text-xs mb-2">
                    Servicios disponibles de la clienta. Haz clic en el botón para canjear 1 servicio hacia esta cita:
                  </p>
                  <div className="space-y-2 mb-3">
                    {availableEditCustomerGiftCards.map((gc) => (
                      <div key={gc.id} className="p-3 border border-slate-200 rounded-xl bg-slate-50">
                        <div className="flex justify-between items-center mb-1.5">
                          <span className="font-semibold text-xs text-slate-800">{gc.code}</span>
                          <small className="text-slate-500 text-xs">Vence: {gc.expiresOn}</small>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {gc.items.filter((item) => item.remainingQuantity > 0).map((item) => (
                            <Button
                              key={item.id}
                              size="sm"
                              variant="outline"
                              disabled={applyingGiftCard}
                              onClick={() => handleApplyGiftCardToEditAppointment(gc, item)}
                              className="text-xs text-emerald-700 border-emerald-300 hover:bg-emerald-50 py-1"
                            >
                              ⚡ Canjear {item.serviceName} ({item.remainingQuantity} disp.)
                            </Button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <p className="text-slate-400 text-xs mb-2 italic">
                  La clienta no tiene GiftCards vinculadas activas con saldo.
                </p>
              )}

              {/* Input para vincular GiftCard al portador o código */}
              <div className="pt-3 border-t border-slate-100 mt-2">
                <small className="text-slate-600 font-semibold block mb-1 text-xs">
                  ¿La clienta presenta una GiftCard al portador o código de tarjeta?
                </small>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Ej: GC-2026-000123"
                    value={gcCodeInput}
                    onChange={(e) => setGcCodeInput(e.target.value)}
                    className="flex-1 rounded-xl border border-slate-200 px-3 py-1.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-bunny-mid/50"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={bindingGcLoading || !gcCodeInput.trim()}
                    onClick={handleBindGiftCardCodeToEditCustomer}
                    className="text-xs"
                  >
                    {bindingGcLoading ? 'Buscando...' : 'Vincular y Mostrar'}
                  </Button>
                </div>
              </div>
            </div>

            <div className="border-t border-slate-200 pt-3">
              <div className="flex justify-between items-center mb-2">
                <div>
                  <h6 className="font-bold text-slate-800 text-sm mb-0">Cargos extra personalizados</h6>
                  <small className="text-slate-500 text-xs">Gestión de ítems adicionales para esta cita.</small>
                </div>
                <Button size="sm" variant="outline" onClick={() => {
                  setEditCustomChargeItems(prev => [...prev, { id: nextEditCustomChargeId, description: '', amount: 0 }]);
                  setNextEditCustomChargeId(prev => prev + 1);
                }} className="text-xs">
                  + Agregar ítem
                </Button>
              </div>

              {editCustomChargeItems.length > 0 && (
                <div className="space-y-2 mb-3">
                  {editCustomChargeItems.map((item) => (
                    <div key={item.id} className="grid grid-cols-12 gap-2 items-center">
                      <div className="col-span-7">
                        <input
                          type="text"
                          placeholder="Descripción (ej: Cristalería)"
                          value={item.description}
                          onChange={(e) => setEditCustomChargeItems(prev => prev.map(i => i.id === item.id ? { ...i, description: e.target.value } : i))}
                          className="w-full rounded-xl border border-slate-200 px-3 py-1.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-bunny-mid/50"
                        />
                      </div>
                      <div className="col-span-3">
                        <input
                          type="number"
                          min={0}
                          step={100}
                          value={item.amount}
                          onChange={(e) => setEditCustomChargeItems(prev => prev.map(i => i.id === item.id ? { ...i, amount: Number(e.target.value) || 0 } : i))}
                          className="w-full rounded-xl border border-slate-200 px-3 py-1.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-bunny-mid/50"
                        />
                      </div>
                      <div className="col-span-2">
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => setEditCustomChargeItems(prev => prev.filter(i => i.id !== item.id))}
                          className="w-full text-xs py-1"
                        >
                          Eliminar
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="border-t border-slate-200 pt-3 space-y-1.5 text-sm">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal servicios</span>
                <strong className="text-slate-800">{formatCurrency(editTotal)}</strong>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Total extras</span>
                <strong className="text-slate-800">{formatCurrency(editCustomChargeItems.reduce((s, i) => s + i.amount, 0))}</strong>
              </div>
              <div className="flex justify-between text-base font-bold pt-2 border-t border-slate-200 text-slate-900">
                <span>Total final estimado</span>
                <span className="text-bunny-dark">{formatCurrency(editTotal + editCustomChargeItems.reduce((s, i) => s + i.amount, 0))}</span>
              </div>
            </div>
          </Modal.Body>
          <Modal.Footer className="border-t border-slate-100 flex justify-end gap-2 p-4">
            <Button variant="secondary" onClick={closeEditModal}>
              Cancelar
            </Button>
            <Button variant="primary" type="submit">
              {editMode === 'reschedule' ? 'Guardar Reagendado' : 'Guardar Cambios'}
            </Button>
          </Modal.Footer>
        </form>
      </Modal>

      {/* Modal de Cancelación con Motivo */}
      {cancelingAppointmentId && (
        <CancelAppointmentDialog
          show={showCancelModal}
          appointmentId={cancelingAppointmentId}
          customerName={appointments.find((apt) => apt.id === cancelingAppointmentId)?.customer.fullName}
          appointmentDate={appointments.find((apt) => apt.id === cancelingAppointmentId)?.appointmentDate}
          appointmentTime={appointments.find((apt) => apt.id === cancelingAppointmentId)?.appointmentTime}
          giftCardInfo={extractAppointmentGiftCardInfo(
            appointments.find((apt) => apt.id === cancelingAppointmentId)?.notes
          )}
          onConfirm={handleConfirmCancelAppointment}
          onCancel={() => {
            setShowCancelModal(false);
            setCancelingAppointmentId(null);
          }}
          isLoading={isCancelLoading}
        />
      )}
      {/* Modal de Completar Cita con Insumos */}
      <CompleteAppointmentWithSuppliesModal
        show={showCompleteModal}
        appointmentId={completingAppointmentId}
        onHide={() => {
          setShowCompleteModal(false);
          setCompletingAppointmentId(null);
        }}
        onCompleted={() => {
          fetchAppointments();
        }}
      />
      {/* Modal de Historial de Mensajes / Entregas */}
      <AppointmentNotificationsModal
        show={selectedNotificationsApt !== null}
        appointmentId={selectedNotificationsApt?.id ?? null}
        customerName={selectedNotificationsApt?.customer?.fullName}
        customerPhone={selectedNotificationsApt?.customer?.phone}
        onClose={() => setSelectedNotificationsApt(null)}
      />
      </div>
    </DashboardLayout>
  );
}
