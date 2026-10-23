/**
 * Página principal de gestión de citas.
 * Incluye lista, filtros, CRUD completo y cambio de estados.
 */

import { useEffect, useMemo, useState } from 'react';
import { Button, Card, Badge, Alert, Spinner } from '@/components/ui';
import { useNavigate, useSearchParams } from 'react-router-dom';
import DashboardLayout from '../../components/common/DashboardLayout';
import { CancelAppointmentDialog, CancelledByOption } from '../../components/appointments/CancelAppointmentDialog';
import { AppointmentsList } from '../../components/appointments/AppointmentsList';
import { CompleteAppointmentWithSuppliesModal } from '../../components/appointments/CompleteAppointmentWithSuppliesModal';
import { AppointmentNotificationsModal } from '../../components/appointments/AppointmentNotificationsModal';
import { useAppointmentsStore, AppointmentListFilters } from '../../stores/appointmentsStore';
import { useCustomersStore } from '../../stores/customersStore';
import { useServicesStore } from '../../stores/servicesStore';
import { AppointmentStatus, AppointmentCreateRequest, AppointmentUpdateRequest, Appointment } from '../../types/appointment.types';
import { appointmentsApi } from '../../api/appointments.api';
import { format } from 'date-fns';
import { useToast } from '../../hooks/useToast';
import { trackAppointmentCancelled } from '../../utils/analytics';
import { getAppointmentTotal, getAppointmentServices, extractAppointmentGiftCardInfo, stripSystemNoteBlocks } from '../../utils/appointmentUtils';
import { matchRutSearch } from '../../utils/rutUtils';
import { useGiftCardsStore } from '../../stores/giftcardsStore';
import { usePlanFeatures } from '../../hooks/usePlanFeatures';
import { GiftCard, GiftCardCreateRequest, GiftCardItem, GiftCardRedeemItemRequest } from '../../types/giftcard.types';
import { toWhatsAppPhone } from '../../utils/giftcardRenderer';
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
import { CreateAppointmentModal } from '../../components/appointments/CreateAppointmentModal';
import { EditAppointmentModal } from '../../components/appointments/EditAppointmentModal';
import { AppointmentFormState, CustomChargeItem, CreateStep, formatCurrency, AppointmentEditFormState, EditMode } from '../../components/appointments/appointmentForm.shared';
import { confirmDialog } from '../../components/ui/confirmDialog';




type AppointmentStatusFilter = AppointmentStatus | 'ACTIVE' | 'ALL';

const ACTIVE_STATUSES: AppointmentStatus[] = [
  AppointmentStatus.PENDING,
  AppointmentStatus.CONFIRMED,
  AppointmentStatus.RESCHEDULE_REQUESTED,
];


export default function AppointmentsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const toast = useToast();
  const { hasFeature } = usePlanFeatures();
  const canUseGiftCards = hasFeature('GIFT_CARDS');
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

  const { directory: customers, fetchDirectory } = useCustomersStore();
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

  // Filtros de estado y fecha se aplican en el servidor: así las citas completadas/canceladas
  // y el historial antiguo no quedan fuera de la página de 50 que devuelve la API por defecto.
  const buildServerFilters = (status: AppointmentStatusFilter, date: string): AppointmentListFilters => {
    const filters: AppointmentListFilters = { order: 'nearest', size: 200 };
    if (status === 'ACTIVE') {
      filters.statuses = ACTIVE_STATUSES;
    } else if (status !== 'ALL') {
      filters.status = status;
    }
    if (date) {
      filters.startDate = date;
      filters.endDate = date;
    }
    return filters;
  };

  const reloadAppointments = () => fetchAppointments(buildServerFilters(statusFilter, dateFilter));

  useEffect(() => {
    fetchAppointments(buildServerFilters(statusFilter, dateFilter)).catch(() => {});
  }, [fetchAppointments, statusFilter, dateFilter]);

  useEffect(() => {
    fetchDirectory();
    fetchServices(true);
    if (canUseGiftCards) {
      fetchGiftCards();
    }

    settingsApi.getAll().then((data) => {
      if (data.unavailabilities && data.unavailabilities.length > 0) {
        setUnavailabilities(data.unavailabilities);
      }
      if (data.unavailabilityColors) {
        setUnavailabilityColors(data.unavailabilityColors);
      }
    }).catch((err) => console.error('Error fetching unavailabilities in AppointmentsPage:', err));
  }, [fetchDirectory, fetchServices, fetchGiftCards, canUseGiftCards]);

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
    reloadAppointments();
  };

  // Al cambiar estado/fecha el efecto de filtros vuelve a pedir las citas
  const handleClearFilters = () => {
    setStatusFilter('ACTIVE');
    setDateFilter('');
    setSearchQuery('');
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
    if (!(await confirmDialog({ message: `¿Canjear 1 "${item.serviceName}" de la GiftCard ${gc.code} para esta cita?`, confirmLabel: 'Canjear' }))) {
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
      // La próxima cita hereda solo las notas de la clienta, no bloques de sistema de la cita anterior
      notes: stripSystemNoteBlocks(appointment.notes?.split('Extras personalizados:')[0]),
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
      reloadAppointments();
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
      reloadAppointments();
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, editMode === 'reschedule' ? 'Error al reagendar la cita' : 'Error al actualizar la cita'));
    }
  };

  const STATUS_LABELS: Partial<Record<AppointmentStatus, string>> = {
    PENDING: 'Pendiente',
    CONFIRMED: 'Confirmada',
    COMPLETED: 'Completada',
    CANCELLED: 'Cancelada',
  };

  const handleChangeStatus = async (id: number, status: AppointmentStatus) => {
    if (status === AppointmentStatus.COMPLETED) {
      if (hasFeature('INVENTORY')) {
        setCompletingAppointmentId(id);
        setShowCompleteModal(true);
        return;
      }
      // Sin inventario en el plan: se completa sin descontar insumos (mismo cierre en el backend)
      try {
        await updateAppointmentStatus(id, status);
        toast.success('Cita completada');
        reloadAppointments();
      } catch (err: unknown) {
        toast.error(getErrorMessage(err, 'Error al completar la cita'));
      }
      return;
    }

    if (!(await confirmDialog({ message: `¿Cambiar el estado de la cita a "${STATUS_LABELS[status] ?? status}"?`, confirmLabel: 'Cambiar estado' }))) {
      return;
    }

    try {
      await updateAppointmentStatus(id, status);
      toast.success('Estado actualizado correctamente');
      reloadAppointments();
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
      await reloadAppointments();
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, 'Error al cancelar la cita'));
    } finally {
      setIsCancelLoading(false);
    }
  };

  const handleDeleteAppointment = async (id: number) => {
    if (await confirmDialog({ message: '¿Eliminar esta cita? Esta acción no se puede deshacer.', confirmLabel: 'Eliminar cita', tone: 'danger' })) {
      try {
        await deleteAppointment(id);
        toast.success('Cita eliminada');
        reloadAppointments();
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
              <AppointmentsList
                appointments={displayedAppointments}
                onEdit={openEditModal}
                onReschedule={openRescheduleModal}
                onScheduleNext={openNextAppointmentModal}
                onChangeStatus={handleChangeStatus}
                onCancel={handleCancelAppointment}
                onDelete={handleDeleteAppointment}
                onSendNotification={handleSendNotification}
                onSendWhatsAppConfirmation={handleSendWhatsAppConfirmation}
                onSendWhatsAppReminder={handleSendWhatsAppReminder}
                onWhatsAppHandoff={handleWhatsAppHandoff}
                onShowMessageHistory={setSelectedNotificationsApt}
              />
            </>
          )}
        </div>

      <CreateAppointmentModal
        navigate={navigate}
        appointments={appointments}
        createStep={createStep}
        setCreateStep={setCreateStep}
        customChargeItems={customChargeItems}
        customerSearch={customerSearch}
        setCustomerSearch={setCustomerSearch}
        serviceSearch={serviceSearch}
        setServiceSearch={setServiceSearch}
        summaryServiceSearch={summaryServiceSearch}
        setSummaryServiceSearch={setSummaryServiceSearch}
        isCustomerListCollapsed={isCustomerListCollapsed}
        setIsCustomerListCollapsed={setIsCustomerListCollapsed}
        isServiceListCollapsed={isServiceListCollapsed}
        setIsServiceListCollapsed={setIsServiceListCollapsed}
        formData={formData}
        setFormData={setFormData}
        showCreateAppointmentModal={showCreateAppointmentModal}
        unavailabilities={unavailabilities}
        unavailabilityColors={unavailabilityColors}
        createUseGiftCardChoice={createUseGiftCardChoice}
        setCreateUseGiftCardChoice={setCreateUseGiftCardChoice}
        setCreateSelectedGiftCardId={setCreateSelectedGiftCardId}
        createSelectedGiftCardItemIds={createSelectedGiftCardItemIds}
        setCreateSelectedGiftCardItemIds={setCreateSelectedGiftCardItemIds}
        isCreatingAppointment={isCreatingAppointment}
        filteredCustomers={filteredCustomers}
        filteredServices={filteredServices}
        filteredSummaryServices={filteredSummaryServices}
        selectedCreateCustomer={selectedCreateCustomer}
        selectedCreateServices={selectedCreateServices}
        createTotal={createTotal}
        createDuration={createDuration}
        customChargesTotal={customChargesTotal}
        createFinalTotal={createFinalTotal}
        availableCreateCustomerGiftCards={availableCreateCustomerGiftCards}
        effectiveSelectedGiftCard={effectiveSelectedGiftCard}
        createGiftCardCoverage={createGiftCardCoverage}
        createNetTotalToPay={createNetTotalToPay}
        handleSelectCreateGiftCardUsage={handleSelectCreateGiftCardUsage}
        toggleCreateGiftCardItem={toggleCreateGiftCardItem}
        closeCreateModal={closeCreateModal}
        handleGoToCreateSummary={handleGoToCreateSummary}
        handleConfirmCreateAppointment={handleConfirmCreateAppointment}
        toggleCreateService={toggleCreateService}
        addCustomChargeItem={addCustomChargeItem}
        updateCustomChargeItem={updateCustomChargeItem}
        removeCustomChargeItem={removeCustomChargeItem}
      />

      <EditAppointmentModal
        appointments={appointments}
        applyingGiftCard={applyingGiftCard}
        gcCodeInput={gcCodeInput}
        setGcCodeInput={setGcCodeInput}
        bindingGcLoading={bindingGcLoading}
        showEditModal={showEditModal}
        editMode={editMode}
        editCustomChargeItems={editCustomChargeItems}
        setEditCustomChargeItems={setEditCustomChargeItems}
        nextEditCustomChargeId={nextEditCustomChargeId}
        setNextEditCustomChargeId={setNextEditCustomChargeId}
        editingAppointmentId={editingAppointmentId}
        editCustomerSearch={editCustomerSearch}
        setEditCustomerSearch={setEditCustomerSearch}
        editServiceSearch={editServiceSearch}
        setEditServiceSearch={setEditServiceSearch}
        editFormData={editFormData}
        setEditFormData={setEditFormData}
        unavailabilities={unavailabilities}
        unavailabilityColors={unavailabilityColors}
        filteredEditCustomers={filteredEditCustomers}
        filteredEditServices={filteredEditServices}
        selectedEditCustomer={selectedEditCustomer}
        selectedEditServices={selectedEditServices}
        editTotal={editTotal}
        editDuration={editDuration}
        availableEditCustomerGiftCards={availableEditCustomerGiftCards}
        handleApplyGiftCardToEditAppointment={handleApplyGiftCardToEditAppointment}
        handleBindGiftCardCodeToEditCustomer={handleBindGiftCardCodeToEditCustomer}
        closeEditModal={closeEditModal}
        handleEditAppointment={handleEditAppointment}
        toggleEditService={toggleEditService}
      />

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
          reloadAppointments();
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
