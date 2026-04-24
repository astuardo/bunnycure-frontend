/**
 * Página principal de gestión de citas.
 * Incluye lista, filtros, CRUD completo y cambio de estados.
 */

import { useEffect, useMemo, useState } from 'react';
import { Row, Col, Button, Card, Table, Badge, Form, Modal, Alert, Dropdown } from 'react-bootstrap';
import { FaWhatsapp, FaBell, FaEnvelope } from 'react-icons/fa';
import { useNavigate, useSearchParams } from 'react-router-dom';
import DashboardLayout from '../../components/common/DashboardLayout';
import { useAppointmentsStore } from '../../stores/appointmentsStore';
import { useCustomersStore } from '../../stores/customersStore';
import { useServicesStore } from '../../stores/servicesStore';
import { AppointmentStatus, AppointmentCreateRequest, AppointmentUpdateRequest, Appointment } from '../../types/appointment.types';
import { appointmentsApi } from '../../api/appointments.api';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { useToast } from '../../hooks/useToast';

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

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editMode, setEditMode] = useState<EditMode>('edit');
  const [createStep, setCreateStep] = useState<CreateStep>('form');
  const [customChargeItems, setCustomChargeItems] = useState<CustomChargeItem[]>([]);
  const [editCustomChargeItems, setEditCustomChargeItems] = useState<CustomChargeItem[]>([]);
  const [nextCustomChargeId, setNextCustomChargeId] = useState(1);
  const [nextEditCustomChargeId, setNextEditCustomChargeId] = useState(1);
  const [editingAppointmentId, setEditingAppointmentId] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<AppointmentStatusFilter>('ACTIVE');
  const [dateFilter, setDateFilter] = useState<string>('');

  const [customerSearch, setCustomerSearch] = useState('');
  const [serviceSearch, setServiceSearch] = useState('');
  const [summaryServiceSearch, setSummaryServiceSearch] = useState('');
  const [editCustomerSearch, setEditCustomerSearch] = useState('');
  const [editServiceSearch, setEditServiceSearch] = useState('');

  const [isCustomerListCollapsed, setIsCustomerListCollapsed] = useState(false);
  const [isServiceListCollapsed, setIsServiceListCollapsed] = useState(false);

  const [formData, setFormData] = useState<AppointmentFormState>({
    customerId: 0,
    serviceIds: [],
    appointmentDate: '',
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
  }, [fetchAppointments, fetchCustomers, fetchServices]);

  // Efecto para abrir el modal de edición automáticamente si viene el ID en la URL
  useEffect(() => {
    const rescheduleId = searchParams.get('reschedule');
    const editId = searchParams.get('edit');
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
    }
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
    if (statusFilter === 'ALL') {
      return appointments;
    }
    if (statusFilter === 'ACTIVE') {
      return appointments.filter(
        (apt) => apt.status === AppointmentStatus.PENDING || apt.status === AppointmentStatus.CONFIRMED
      );
    }
    return appointments.filter((apt) => apt.status === statusFilter);
  }, [appointments, statusFilter]);

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

    if (validCustomItems.length === 0) {
      return baseNotes;
    }

    const extrasBlock = [
      'Extras personalizados:',
      ...validCustomItems.map((item) => `- ${item.description.trim()}: ${formatCurrency(item.amount)}`),
      `Subtotal servicios: ${formatCurrency(createTotal)}`,
      `Total extras: ${formatCurrency(customChargesTotal)}`,
      `Total final estimado: ${formatCurrency(createFinalTotal)}`,
    ].join('\n');

    return baseNotes ? `${baseNotes}\n\n${extrasBlock}` : extrasBlock;
  };

  const buildCreatePayload = (): AppointmentCreateRequest => ({
    customerId: formData.customerId,
    serviceId: formData.serviceIds[0],
    serviceIds: formData.serviceIds,
    appointmentDate: formData.appointmentDate,
    appointmentTime: formData.appointmentTime,
    notes: buildCreateNotes(),
    totalPrice: createFinalTotal,
  });

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

  const openCreateModal = () => {
    resetForm();
    setCustomChargeItems([]);
    setSummaryServiceSearch('');
    setCreateStep('form');
    setShowCreateModal(true);
  };

  const closeCreateModal = () => {
    setShowCreateModal(false);
    setCreateStep('form');
    resetForm();
    setCustomChargeItems([]);
    setSummaryServiceSearch('');
    if (searchParams.get('create') === '1') {
      setSearchParams({}, { replace: true });
    }
  };

  const handleGoToCreateSummary = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm(formData.customerId, formData.serviceIds)) return;
    setCreateStep('summary');
  };

  const handleConfirmCreateAppointment = async () => {
    if (!validateForm(formData.customerId, formData.serviceIds)) return;

    try {
      await createAppointment(buildCreatePayload());
      toast.success('Cita creada exitosamente');
      const returnTo = searchParams.get('returnTo');
      closeCreateModal();
      if (searchParams.get('create') === '1' && returnTo) {
        navigate(returnTo, { replace: true });
        return;
      }
      fetchAppointments();
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, 'Error al crear la cita'));
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

    const finalNotes = buildEditNotes();
    const finalTotal = editTotal + editCustomChargeItems.reduce((s, i) => s + i.amount, 0);

    try {
      await updateAppointment(editingAppointmentId, {
        ...buildEditPayload(),
        notes: finalNotes,
        totalPrice: finalTotal,
      });
      toast.success(editMode === 'reschedule' ? 'Cita reagendada exitosamente' : 'Cita actualizada exitosamente');
      closeEditModal();
      fetchAppointments();
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, 'Error al actualizar la cita'));
    }
  };

  const handleChangeStatus = async (id: number, status: AppointmentStatus) => {
    if (confirm(`¿Cambiar estado a ${status}?`)) {
      try {
        await updateAppointmentStatus(id, status);
        toast.success('Estado actualizado correctamente');
        fetchAppointments();
      } catch (err: unknown) {
        toast.error(getErrorMessage(err, 'Error al actualizar el estado'));
      }
    }
  };

  const handleCancelAppointment = async (id: number) => {
    if (confirm('¿Estás seguro de que deseas cancelar esta cita?')) {
      try {
        await updateAppointmentStatus(id, AppointmentStatus.CANCELLED);
        toast.success('Cita cancelada');
        fetchAppointments();
      } catch (err: unknown) {
        toast.error(getErrorMessage(err, 'Error al cancelar la cita'));
      }
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

  const resetForm = () => {
    setFormData({
      customerId: 0,
      serviceIds: [],
      appointmentDate: '',
      appointmentTime: '',
      notes: '',
    });
    setCustomerSearch('');
    setServiceSearch('');
    setSummaryServiceSearch('');
    setCustomChargeItems([]);
    setIsCustomerListCollapsed(false);
    setIsServiceListCollapsed(false);
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

  const getStatusBadge = (status: AppointmentStatus) => {
    const variants: Record<AppointmentStatus, string> = {
      PENDING: 'warning',
      CONFIRMED: 'primary',
      COMPLETED: 'success',
      CANCELLED: 'secondary',
    };
    const labels: Record<AppointmentStatus, string> = {
      PENDING: 'Pendiente',
      CONFIRMED: 'Confirmada',
      COMPLETED: 'Completada',
      CANCELLED: 'Cancelada',
    };
    return <Badge bg={variants[status]}>{labels[status]}</Badge>;
  };

  const getAppointmentServices = (appointment: Appointment) =>
    appointment.services && appointment.services.length > 0
      ? appointment.services
      : [appointment.service];

  const getAppointmentTotal = (appointment: Appointment) => {
    // 1. Try to extract total from notes (generated by our creation summary)
    // This takes precedence because it includes manually added extras
    if (appointment.notes) {
      // Regex robusta para capturar el total ignorando puntos de miles y espacios
      const match = appointment.notes.match(/Total final estimado:\s*\$?\s*([\d.]+)/i);
      if (match && match[1]) {
        const parsedTotal = parseInt(match[1].replace(/\./g, ''), 10);
        if (!isNaN(parsedTotal) && parsedTotal > 0) return parsedTotal;
      }
    }

    // 2. Fallback to API totalPrice field (manual edits saved)
    if (typeof appointment.totalPrice === 'number' && appointment.totalPrice > 0) return appointment.totalPrice;

    // 3. Fallback to sum of services
    return getAppointmentServices(appointment).reduce((sum, service) => sum + service.price, 0);
  };

  return (
    <DashboardLayout>
      <div className="bunny-page">
      <Row className="mb-4">
        <Col>
          <h1>📅 Gestión de Citas</h1>
          <p className="text-muted">Administra las citas y agenda del salón</p>
        </Col>
        <Col xs="auto">
          <Button variant="primary" onClick={openCreateModal}>
            + Nueva Cita
          </Button>
        </Col>
      </Row>

      {error && (
        <Alert variant="danger" onClose={clearError} dismissible>
          {error}
        </Alert>
      )}

      <Row className="mb-4">
        <Col md={4}>
          <Form.Group>
            <Form.Label>Fecha</Form.Label>
            <Form.Control
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
            />
          </Form.Group>
        </Col>
        <Col md={4}>
          <Form.Group>
            <Form.Label>Estado</Form.Label>
            <Form.Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as AppointmentStatusFilter)}
            >
              <option value="ACTIVE">Pendientes y confirmadas</option>
              <option value="ALL">Todos</option>
              <option value={AppointmentStatus.PENDING}>Pendiente</option>
              <option value={AppointmentStatus.CONFIRMED}>Confirmada</option>
              <option value={AppointmentStatus.COMPLETED}>Completada</option>
              <option value={AppointmentStatus.CANCELLED}>Cancelada</option>
            </Form.Select>
          </Form.Group>
        </Col>
        <Col md={4} className="d-flex align-items-end gap-2">
          <Button variant="secondary" onClick={handleApplyFilters}>
            Filtrar
          </Button>
          <Button variant="outline-secondary" onClick={handleClearFilters}>
            Limpiar
          </Button>
        </Col>
      </Row>

      <Row>
        <Col>
          {isLoading ? (
            <div className="text-center py-5">
              <div className="spinner-border" role="status">
                <span className="visually-hidden">Cargando...</span>
              </div>
            </div>
          ) : displayedAppointments.length === 0 ? (
            <Alert variant="info">
              No hay citas que mostrar. {dateFilter || statusFilter !== 'ACTIVE' ? 'Intenta cambiar los filtros.' : 'Crea tu primera cita.'}
            </Alert>
          ) : (
            <>
              
              {/* Vista Desktop: Tabla */}<div className="d-none d-md-block"><div className="table-responsive">
                <Table striped bordered hover className="mb-0">
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Hora</th>
                      <th>Cliente</th>
                      <th>Servicio(s)</th>
                      <th>Valor</th>
                      <th>Estado</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayedAppointments.map((apt) => {
                      const appointmentServices = getAppointmentServices(apt);
                      return (
                        <tr key={apt.id}>
                          <td>{format(parseISO(apt.appointmentDate), 'dd/MM/yyyy', { locale: es })}</td>
                          <td>{apt.appointmentTime.slice(0, 5)}</td>
                          <td>{apt.customer.fullName}</td>
                          <td>{appointmentServices.map((service) => service.name).join(' + ')}</td>
                          <td>{formatCurrency(getAppointmentTotal(apt))}</td>
                          <td>{getStatusBadge(apt.status)}</td>
                          <td>
                            <div className="d-flex gap-1 flex-wrap">
                              <Button
                                size="sm"
                                variant="outline-primary"
                                onClick={() => openEditModal(apt)}
                              >
                                Editar
                              </Button>
                              {apt.status === AppointmentStatus.PENDING && (
                                <Button
                                  size="sm"
                                  variant="success"
                                  onClick={() => handleChangeStatus(apt.id, AppointmentStatus.CONFIRMED)}
                                >
                                  Confirmar
                                </Button>
                              )}
                              {apt.status === AppointmentStatus.CONFIRMED && (
                                <Button
                                  size="sm"
                                  variant="primary"
                                  onClick={() => handleChangeStatus(apt.id, AppointmentStatus.COMPLETED)}
                                >
                                  Completar
                                </Button>
                              )}
                              {apt.status !== AppointmentStatus.CANCELLED && apt.status !== AppointmentStatus.COMPLETED && (
                                <Button
                                  size="sm"
                                  variant="warning"
                                  onClick={() => handleCancelAppointment(apt.id)}
                                >
                                  Cancelar
                                </Button>
                              )}

                              <Dropdown>
                                <Dropdown.Toggle size="sm" variant="info" id={`dropdown-${apt.id}`}>
                                  📩
                                </Dropdown.Toggle>
                                <Dropdown.Menu>
                                  <Dropdown.Item onClick={() => handleSendNotification(apt.id)}>
                                    <FaBell className="me-2" />
                                    Enviar Notificación
                                  </Dropdown.Item>
                                  <Dropdown.Item onClick={() => handleSendWhatsAppConfirmation(apt.id)}>
                                    <FaWhatsapp className="me-2 text-success" />
                                    Confirmar por WhatsApp
                                  </Dropdown.Item>
                                  <Dropdown.Item onClick={() => handleSendWhatsAppReminder(apt.id)}>
                                    <FaEnvelope className="me-2 text-primary" />
                                    Recordatorio WhatsApp
                                  </Dropdown.Item>
                                  <Dropdown.Divider />
                                  <Dropdown.Item onClick={() => handleWhatsAppHandoff(apt.id)}>
                                    <FaWhatsapp className="me-2 text-success" />
                                    Traspaso a Humano
                                  </Dropdown.Item>
                                </Dropdown.Menu>
                              </Dropdown>

                              <Button
                                size="sm"
                                variant="danger"
                                onClick={() => handleDeleteAppointment(apt.id)}
                              >
                                Eliminar
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </Table>
              </div></div>

              {/* Vista Móvil: Cards */}
              <div className="d-md-none">
                {displayedAppointments.map((apt) => {
                  const appointmentServices = getAppointmentServices(apt);
                  return (
                    <Card key={apt.id} className="mb-3 border-peach shadow-sm">
                      <Card.Body className="p-3">
                        <div className="d-flex justify-content-between align-items-start mb-2 gap-2">
                          <div style={{ minWidth: 0 }}>
                            <div className="text-muted small mb-1 text-truncate">
                              {format(parseISO(apt.appointmentDate), 'EEEE d MMMM', { locale: es })}
                            </div>
                            <h6 className="mb-0 fw-bold text-bunny-dark text-break">
                              {apt.appointmentTime.slice(0, 5)} · {apt.customer.fullName}
                            </h6>
                          </div>
                          <div className="flex-shrink-0">
                            {getStatusBadge(apt.status)}
                          </div>
                        </div>

                        <div className="mb-3">
                          <div className="d-flex justify-content-between align-items-center gap-2">
                            <span className="text-bunny-mid small text-break" style={{ minWidth: 0 }}>
                              {appointmentServices.map((service) => service.name).join(' + ')}
                            </span>
                            <span className="fw-bold text-success flex-shrink-0">
                              {formatCurrency(getAppointmentTotal(apt))}
                            </span>
                          </div>
                          {apt.notes && (
                            <div className="mt-1 p-2 bg-light rounded small text-muted italic text-break">
                              {apt.notes}
                            </div>
                          )}
                        </div>

                        <div className="d-flex gap-2 flex-wrap">
                          <Button size="sm" variant="outline-secondary" className="flex-fill" onClick={() => openEditModal(apt)}>Editar</Button>
                          {apt.status === AppointmentStatus.PENDING && (<Button size="sm" variant="success" className="flex-fill" onClick={() => handleChangeStatus(apt.id, AppointmentStatus.CONFIRMED)}>Confirmar</Button>)}
                          {apt.status === AppointmentStatus.CONFIRMED && (<Button size="sm" variant="primary" className="flex-fill" onClick={() => handleChangeStatus(apt.id, AppointmentStatus.COMPLETED)}>Completar</Button>)}
                          <Button size="sm" variant="outline-danger" onClick={() => handleDeleteAppointment(apt.id)}>Eliminar</Button>
                        </div>
                      </Card.Body>
                    </Card>
                  );
                })}
              </div>
            </>
          )}
        </Col>
      </Row>

      <Modal
        show={showCreateAppointmentModal}
        onHide={closeCreateModal}
        size="lg"
        className="bunny-modal create-appointment-modal"
        scrollable
        fullscreen="sm-down"
      >
        <Modal.Header closeButton>
          <Modal.Title>
            {createStep === 'form' ? 'Nueva Cita' : 'Resumen de Nueva Cita'}
          </Modal.Title>
        </Modal.Header>
        {createStep === 'form' ? (
          <Form onSubmit={handleGoToCreateSummary} className="create-appointment-form">
            <Modal.Body>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Cliente *</Form.Label>
                  {isCustomerListCollapsed && selectedCreateCustomer ? (
                    <div className="p-3 border rounded mb-2 d-flex justify-content-between align-items-center bg-light" style={{ borderColor: '#c9897a' }}>
                      <div>
                        <div className="fw-semibold text-bunny-dark">{selectedCreateCustomer.fullName}</div>
                        <small className="text-muted">{selectedCreateCustomer.phone}</small>
                      </div>
                      <Button variant="outline-primary" size="sm" onClick={() => setIsCustomerListCollapsed(false)}>Cambiar</Button>
                    </div>
                  ) : (
                    <>
                      <Form.Control
                        type="text"
                        placeholder="Buscar cliente por nombre o teléfono..."
                        value={customerSearch}
                        onChange={(e) => setCustomerSearch(e.target.value)}
                        className="mb-2"
                      />
                      <div className="border rounded create-appointment-list" style={{ maxHeight: '210px', overflowY: 'auto' }}>
                        {filteredCustomers.length > 0 ? (
                          filteredCustomers.map((customer) => (
                            <button
                              key={customer.id}
                              type="button"
                              className={`btn w-100 text-start border-bottom rounded-0 ${
                                formData.customerId === customer.id ? 'btn-primary' : 'btn-light'
                              }`}
                              onClick={() => {
                                setFormData((prev) => ({ ...prev, customerId: customer.id }));
                                setIsCustomerListCollapsed(true);
                              }}
                            >
                              <div className="fw-semibold">{customer.fullName}</div>
                              <small>{customer.phone}</small>
                            </button>
                          ))
                        ) : (
                          <div className="p-3 text-muted">No se encontraron clientes</div>
                        )}
                      </div>
                      <Form.Text className="text-muted">
                        {selectedCreateCustomer
                          ? `Seleccionado: ${selectedCreateCustomer.fullName}`
                          : 'Selecciona un cliente de la lista'}
                      </Form.Text>
                    </>
                  )}
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Servicio(s) *</Form.Label>
                  {isServiceListCollapsed && selectedCreateServices.length > 0 ? (
                    <div className="p-3 border rounded mb-2 d-flex justify-content-between align-items-center bg-light" style={{ borderColor: '#c9897a' }}>
                      <div>
                        <div className="fw-semibold text-bunny-dark">{selectedCreateServices.length} servicio(s) seleccionado(s)</div>
                        <small className="text-muted">{formatCurrency(createTotal)} ({createDuration} min)</small>
                      </div>
                      <Button variant="outline-primary" size="sm" onClick={() => setIsServiceListCollapsed(false)}>Modificar</Button>
                    </div>
                  ) : (
                    <>
                      <Form.Control
                        type="text"
                        placeholder="Buscar servicios..."
                        value={serviceSearch}
                        onChange={(e) => setServiceSearch(e.target.value)}
                        className="mb-2"
                      />
                      <div className="border rounded p-2 create-appointment-list" style={{ maxHeight: '210px', overflowY: 'auto' }}>
                        {filteredServices.length > 0 ? (
                          filteredServices.map((service) => (
                            <Form.Check
                              key={service.id}
                              id={`create-service-${service.id}`}
                              type="checkbox"
                              className="mb-2"
                              label={`${service.name} - ${formatCurrency(service.price)} (${service.durationMinutes} min)`}
                              checked={formData.serviceIds.includes(service.id)}
                              onChange={() => toggleCreateService(service.id)}
                            />
                          ))
                        ) : (
                          <div className="text-muted">No se encontraron servicios</div>
                        )}
                      </div>
                      {formData.serviceIds.length > 0 && (
                        <Button variant="outline-primary" size="sm" className="mt-2 w-100" onClick={() => setIsServiceListCollapsed(true)}>
                          Ocultar lista
                        </Button>
                      )}
                      <Form.Text className="text-muted d-block mt-2">
                        Seleccionados: {selectedCreateServices.length} | Total: {formatCurrency(createTotal)} | Duración: {createDuration} min
                      </Form.Text>
                    </>
                  )}
                </Form.Group>
              </Col>
            </Row>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Fecha *</Form.Label>
                  <Form.Control
                    type="date"
                    required
                    value={formData.appointmentDate}
                    onChange={(e) => setFormData((prev) => ({ ...prev, appointmentDate: e.target.value }))}
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Hora *</Form.Label>
                  <Form.Control
                    type="time"
                    required
                    value={formData.appointmentTime}
                    onChange={(e) => setFormData((prev) => ({ ...prev, appointmentTime: e.target.value }))}
                  />
                </Form.Group>
              </Col>
            </Row>
            <Form.Group className="mb-3">
              <Form.Label>Detalle de servicios</Form.Label>
              <Form.Control
                plaintext
                readOnly
                value={selectedCreateServices.map((service) => service.name).join(' + ') || 'Sin servicios seleccionados'}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Notas</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                value={formData.notes}
                onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
                placeholder="Observaciones, preferencias, etc..."
              />
            </Form.Group>
            </Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" onClick={closeCreateModal}>
                Cancelar
              </Button>
              <Button variant="primary" type="submit">
                Continuar al resumen
              </Button>
            </Modal.Footer>
          </Form>
        ) : (
          <>
            <Modal.Body>
              <Alert variant="info">
                Revisa el detalle antes de crear la cita. Desde aquí puedes ajustar servicios y agregar cargos extra.
              </Alert>

              <Row className="mb-3">
                <Col md={6}>
                  <h6 className="mb-1">Cliente</h6>
                  <p className="mb-0">{selectedCreateCustomer?.fullName || 'Sin cliente'}</p>
                  <small className="text-muted">{selectedCreateCustomer?.phone || '-'}</small>
                </Col>
                <Col md={6}>
                  <h6 className="mb-1">Fecha y hora</h6>
                  <p className="mb-0">
                    {formData.appointmentDate} · {formData.appointmentTime}
                  </p>
                </Col>
              </Row>
              <div className="mb-3">
                <h6 className="mb-1">Notas</h6>
                <p className="mb-0 text-muted">{formData.notes.trim() || 'Sin notas'}</p>
              </div>

              <hr />

              <h6 className="mb-2">Servicios seleccionados</h6>
              <Form.Control
                type="text"
                placeholder="Buscar y ajustar servicios..."
                value={summaryServiceSearch}
                onChange={(e) => setSummaryServiceSearch(e.target.value)}
                className="mb-2"
              />
              <div className="border rounded p-2 mb-2 create-appointment-list" style={{ maxHeight: '180px', overflowY: 'auto' }}>
                {filteredSummaryServices.length > 0 ? (
                  filteredSummaryServices.map((service) => (
                    <Form.Check
                      key={`summary-service-${service.id}`}
                      id={`summary-service-${service.id}`}
                      type="checkbox"
                      className="mb-2"
                      label={`${service.name} - ${formatCurrency(service.price)} (${service.durationMinutes} min)`}
                      checked={formData.serviceIds.includes(service.id)}
                      onChange={() => toggleCreateService(service.id)}
                    />
                  ))
                ) : (
                  <div className="text-muted">No se encontraron servicios</div>
                )}
              </div>
              <div className="small text-muted mb-3">
                Subtotal servicios: <strong>{formatCurrency(createTotal)}</strong> · Duración estimada: <strong>{createDuration} min</strong>
              </div>

              <h6 className="mb-2">Cargos extra personalizados</h6>
              <div className="d-flex justify-content-between align-items-center mb-2">
                <small className="text-muted">
                  Agrega ítems como cristalería, decoración u otros cobros adicionales.
                </small>
                <Button size="sm" variant="outline-primary" onClick={addCustomChargeItem}>
                  + Agregar ítem
                </Button>
              </div>

              {customChargeItems.length === 0 ? (
                <p className="text-muted small mb-3">No hay cargos extra agregados.</p>
              ) : (
                <div className="d-flex flex-column gap-2 mb-3">
                  {customChargeItems.map((item) => (
                    <Row key={item.id} className="g-2 align-items-center">
                      <Col md={7}>
                        <Form.Control
                          type="text"
                          placeholder="Descripción del ítem (ej: Cristalería)"
                          value={item.description}
                          onChange={(e) =>
                            updateCustomChargeItem(item.id, { description: e.target.value })
                          }
                        />
                      </Col>
                      <Col md={3}>
                        <Form.Control
                          type="number"
                          min={0}
                          step={100}
                          value={item.amount}
                          onChange={(e) =>
                            updateCustomChargeItem(item.id, {
                              amount: Math.max(0, Number(e.target.value) || 0),
                            })
                          }
                        />
                      </Col>
                      <Col md={2} className="d-grid">
                        <Button
                          size="sm"
                          variant="outline-danger"
                          onClick={() => removeCustomChargeItem(item.id)}
                        >
                          Eliminar
                        </Button>
                      </Col>
                    </Row>
                  ))}
                </div>
              )}

              <hr />

              <div className="d-flex flex-column gap-1">
                <div className="d-flex justify-content-between">
                  <span>Subtotal servicios</span>
                  <strong>{formatCurrency(createTotal)}</strong>
                </div>
                <div className="d-flex justify-content-between">
                  <span>Total extras</span>
                  <strong>{formatCurrency(customChargesTotal)}</strong>
                </div>
                <div className="d-flex justify-content-between fs-5 mt-1">
                  <span>Total final estimado</span>
                  <strong>{formatCurrency(createFinalTotal)}</strong>
                </div>
              </div>
            </Modal.Body>
            <Modal.Footer>
              <Button variant="outline-secondary" onClick={() => setCreateStep('form')}>
                Volver a editar datos
              </Button>
              <Button variant="secondary" onClick={closeCreateModal}>
                Cancelar
              </Button>
              <Button
                variant="primary"
                onClick={handleConfirmCreateAppointment}
                disabled={formData.serviceIds.length === 0}
              >
                Crear cita
              </Button>
            </Modal.Footer>
          </>
        )}
      </Modal>

      <Modal
        show={showEditModal}
        onHide={closeEditModal}
        size="lg"
        className="bunny-modal appointment-edit-modal"
        scrollable
        fullscreen="sm-down"
      >
        <Modal.Header closeButton>
          <Modal.Title>{editMode === 'reschedule' ? 'Reagendar Cita' : 'Editar Cita'}</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleEditAppointment}>
          <Modal.Body>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Cliente *</Form.Label>
                  {editMode === 'reschedule' ? (
                    <div className="p-3 border rounded bg-light">
                      <div className="fw-semibold">{selectedEditCustomer?.fullName || 'Cliente no disponible'}</div>
                      <small className="text-muted">{selectedEditCustomer?.phone || '-'}</small>
                    </div>
                  ) : (
                    <>
                      <Form.Control
                        type="text"
                        placeholder="Buscar cliente por nombre o teléfono..."
                        value={editCustomerSearch}
                        onChange={(e) => setEditCustomerSearch(e.target.value)}
                        className="mb-2"
                      />
                      <div className="border rounded" style={{ maxHeight: '210px', overflowY: 'auto' }}>
                        {filteredEditCustomers.length > 0 ? (
                          filteredEditCustomers.map((customer) => (
                            <button
                              key={customer.id}
                              type="button"
                              className={`btn w-100 text-start border-bottom rounded-0 ${
                                editFormData.customerId === customer.id ? 'btn-primary' : 'btn-light'
                              }`}
                              onClick={() => setEditFormData((prev) => ({ ...prev, customerId: customer.id }))}
                            >
                              <div className="fw-semibold">{customer.fullName}</div>
                              <small>{customer.phone}</small>
                            </button>
                          ))
                        ) : (
                          <div className="p-3 text-muted">No se encontraron clientes</div>
                        )}
                      </div>
                      <Form.Text className="text-muted">
                        {selectedEditCustomer
                          ? `Seleccionado: ${selectedEditCustomer.fullName}`
                          : 'Selecciona un cliente de la lista'}
                      </Form.Text>
                    </>
                  )}
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Servicio(s) *</Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="Buscar servicios..."
                    value={editServiceSearch}
                    onChange={(e) => setEditServiceSearch(e.target.value)}
                    className="mb-2"
                  />
                  <div className="border rounded p-2" style={{ maxHeight: '210px', overflowY: 'auto' }}>
                    {filteredEditServices.length > 0 ? (
                      filteredEditServices.map((service) => (
                        <Form.Check
                          key={service.id}
                          id={`edit-service-${service.id}`}
                          type="checkbox"
                          className="mb-2"
                          label={`${service.name} - ${formatCurrency(service.price)} (${service.durationMinutes} min)`}
                          checked={editFormData.serviceIds.includes(service.id)}
                          onChange={() => toggleEditService(service.id)}
                        />
                      ))
                    ) : (
                      <div className="text-muted">No se encontraron servicios</div>
                    )}
                  </div>
                  <Form.Text className="text-muted d-block mt-2">
                    Seleccionados: {selectedEditServices.length} | Total: {formatCurrency(editTotal)} | Duración: {editDuration} min
                  </Form.Text>
                </Form.Group>
              </Col>
            </Row>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Fecha *</Form.Label>
                  <Form.Control
                    type="date"
                    required
                    value={editFormData.appointmentDate}
                    onChange={(e) => setEditFormData((prev) => ({ ...prev, appointmentDate: e.target.value }))}
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Hora *</Form.Label>
                  <Form.Control
                    type="time"
                    required
                    value={editFormData.appointmentTime}
                    onChange={(e) => setEditFormData((prev) => ({ ...prev, appointmentTime: e.target.value }))}
                  />
                </Form.Group>
              </Col>
            </Row>
            {editMode === 'edit' ? (
              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Estado</Form.Label>
                    <Form.Select
                      value={editFormData.status}
                      onChange={(e) => setEditFormData((prev) => ({ ...prev, status: e.target.value as AppointmentStatus }))}
                    >
                      <option value={AppointmentStatus.PENDING}>Pendiente</option>
                      <option value={AppointmentStatus.CONFIRMED}>Confirmada</option>
                      <option value={AppointmentStatus.COMPLETED}>Completada</option>
                      <option value={AppointmentStatus.CANCELLED}>Cancelada</option>
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col md={6} className="d-flex align-items-center">
                  <div className="text-muted small">
                    Valor estimado: {formatCurrency(editTotal)} CLP
                  </div>
                </Col>
              </Row>
            ) : (
              <div className="mb-3 text-muted small">
                Reagendado para la misma clienta. Puedes ajustar fecha, hora, servicios y extras.
              </div>
            )}
            <Form.Group className="mb-3">
              <Form.Label>Detalle de servicios</Form.Label>
              <Form.Control
                plaintext
                readOnly
                value={selectedEditServices.map((service) => service.name).join(' + ') || 'Sin servicios seleccionados'}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Precio Final (CLP)</Form.Label>
              <Form.Control
                type="number"
                min={0}
                step={100}
                value={editFormData.totalPrice || 0}
                onChange={(e) => setEditFormData((prev) => ({ ...prev, totalPrice: Number(e.target.value) }))}
              />
              <Form.Text className="text-muted">
                Valor calculado según servicios: {formatCurrency(editTotal)}
              </Form.Text>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Notas</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                value={editFormData.notes}
                onChange={(e) => setEditFormData((prev) => ({ ...prev, notes: e.target.value }))}
                placeholder="Observaciones, preferencias, etc..."
              />
            </Form.Group>

            <hr />
            <h6 className="mb-2">Cargos extra personalizados</h6>
            <div className="d-flex justify-content-between align-items-center mb-2">
              <small className="text-muted">Gestión de ítems adicionales para esta cita.</small>
              <Button size="sm" variant="outline-primary" onClick={() => {
                setEditCustomChargeItems(prev => [...prev, { id: nextEditCustomChargeId, description: '', amount: 0 }]);
                setNextEditCustomChargeId(prev => prev + 1);
              }}>
                + Agregar ítem
              </Button>
            </div>

            {editCustomChargeItems.length > 0 && (
              <div className="d-flex flex-column gap-2 mb-3">
                {editCustomChargeItems.map((item) => (
                  <Row key={item.id} className="g-2 align-items-center">
                    <Col md={7}>
                      <Form.Control
                        type="text"
                        placeholder="Descripción (ej: Cristalería)"
                        value={item.description}
                        onChange={(e) => setEditCustomChargeItems(prev => prev.map(i => i.id === item.id ? { ...i, description: e.target.value } : i))}
                      />
                    </Col>
                    <Col md={3}>
                      <Form.Control
                        type="number"
                        min={0}
                        step={100}
                        value={item.amount}
                        onChange={(e) => setEditCustomChargeItems(prev => prev.map(i => i.id === item.id ? { ...i, amount: Number(e.target.value) || 0 } : i))}
                      />
                    </Col>
                    <Col md={2} className="d-grid">
                      <Button size="sm" variant="outline-danger" onClick={() => setEditCustomChargeItems(prev => prev.filter(i => i.id !== item.id))}>
                        Eliminar
                      </Button>
                    </Col>
                  </Row>
                ))}
              </div>
            )}

            <hr />
            <div className="d-flex flex-column gap-1">
              <div className="d-flex justify-content-between">
                <span>Subtotal servicios</span>
                <strong>{formatCurrency(editTotal)}</strong>
              </div>
              <div className="d-flex justify-content-between">
                <span>Total extras</span>
                <strong>{formatCurrency(editCustomChargeItems.reduce((s, i) => s + i.amount, 0))}</strong>
              </div>
              <div className="d-flex justify-content-between fs-5 mt-1 text-bunny-dark">
                <span>Total final estimado</span>
                <strong>{formatCurrency(editTotal + editCustomChargeItems.reduce((s, i) => s + i.amount, 0))}</strong>
              </div>
            </div>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={closeEditModal}>
              Cancelar
            </Button>
            <Button variant="primary" type="submit">
              {editMode === 'reschedule' ? 'Guardar Reagendado' : 'Guardar Cambios'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
      </div>
    </DashboardLayout>
  );
}
