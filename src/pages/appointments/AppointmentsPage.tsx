/**
 * Página principal de gestión de citas.
 * Incluye lista, filtros, CRUD completo y cambio de estados.
 */

import { useEffect, useMemo, useState } from 'react';
import { Row, Col, Button, Table, Badge, Form, Modal, Alert, Dropdown } from 'react-bootstrap';
import { FaWhatsapp, FaBell, FaEnvelope } from 'react-icons/fa';
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
}

type AppointmentStatusFilter = AppointmentStatus | 'ACTIVE' | 'ALL';

const formatCurrency = (value: number) => `$${value.toLocaleString('es-CL')}`;

export default function AppointmentsPage() {
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
  const [editingAppointmentId, setEditingAppointmentId] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<AppointmentStatusFilter>('ACTIVE');
  const [dateFilter, setDateFilter] = useState<string>('');

  const [customerSearch, setCustomerSearch] = useState('');
  const [serviceSearch, setServiceSearch] = useState('');
  const [editCustomerSearch, setEditCustomerSearch] = useState('');
  const [editServiceSearch, setEditServiceSearch] = useState('');

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

  const buildCreatePayload = (): AppointmentCreateRequest => ({
    customerId: formData.customerId,
    serviceId: formData.serviceIds[0],
    serviceIds: formData.serviceIds,
    appointmentDate: formData.appointmentDate,
    appointmentTime: formData.appointmentTime,
    notes: normalizeNotes(formData.notes),
  });

  const buildEditPayload = (): AppointmentUpdateRequest => ({
    customerId: editFormData.customerId,
    serviceId: editFormData.serviceIds[0],
    serviceIds: editFormData.serviceIds,
    appointmentDate: editFormData.appointmentDate,
    appointmentTime: editFormData.appointmentTime,
    status: editFormData.status,
    notes: normalizeNotes(editFormData.notes),
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

  const handleCreateAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm(formData.customerId, formData.serviceIds)) return;

    try {
      await createAppointment(buildCreatePayload());
      toast.success('Cita creada exitosamente');
      setShowCreateModal(false);
      resetForm();
      fetchAppointments();
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, 'Error al crear la cita'));
    }
  };

  const openEditModal = (appointment: Appointment) => {
    const selectedIds = appointment.services?.length
      ? appointment.services.map((service) => service.id)
      : [appointment.service.id];

    setEditingAppointmentId(appointment.id);
    setEditFormData({
      customerId: appointment.customer.id,
      serviceIds: selectedIds,
      appointmentDate: appointment.appointmentDate,
      appointmentTime: appointment.appointmentTime,
      notes: appointment.notes || '',
      status: appointment.status,
    });
    setEditCustomerSearch('');
    setEditServiceSearch('');
    setShowEditModal(true);
  };

  const handleEditAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAppointmentId) return;
    if (!validateForm(editFormData.customerId, editFormData.serviceIds)) return;

    try {
      await updateAppointment(editingAppointmentId, buildEditPayload());
      toast.success('Cita actualizada exitosamente');
      setShowEditModal(false);
      setEditingAppointmentId(null);
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
    if (typeof appointment.totalPrice === 'number') return appointment.totalPrice;
    return getAppointmentServices(appointment).reduce((sum, service) => sum + service.price, 0);
  };

  return (
    <DashboardLayout>
      <Row className="mb-4">
        <Col>
          <h1>📅 Gestión de Citas</h1>
          <p className="text-muted">Administra las citas y agenda del salón</p>
        </Col>
        <Col xs="auto">
          <Button variant="primary" onClick={() => setShowCreateModal(true)}>
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
              <p className="small text-muted d-md-none mb-2">↔️ Desliza horizontalmente para ver todas las columnas.</p>
              <div className="table-responsive">
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
                          <td>{apt.appointmentTime}</td>
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
                                  📧
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
              </div>
            </>
          )}
        </Col>
      </Row>

      <Modal show={showCreateModal} onHide={() => setShowCreateModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Nueva Cita</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleCreateAppointment}>
          <Modal.Body>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Cliente *</Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="Buscar cliente por nombre o teléfono..."
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                    className="mb-2"
                  />
                  <div className="border rounded" style={{ maxHeight: '210px', overflowY: 'auto' }}>
                    {filteredCustomers.length > 0 ? (
                      filteredCustomers.map((customer) => (
                        <button
                          key={customer.id}
                          type="button"
                          className={`btn w-100 text-start border-bottom rounded-0 ${
                            formData.customerId === customer.id ? 'btn-primary' : 'btn-light'
                          }`}
                          onClick={() => setFormData((prev) => ({ ...prev, customerId: customer.id }))}
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
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Servicio(s) *</Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="Buscar servicios..."
                    value={serviceSearch}
                    onChange={(e) => setServiceSearch(e.target.value)}
                    className="mb-2"
                  />
                  <div className="border rounded p-2" style={{ maxHeight: '210px', overflowY: 'auto' }}>
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
                  <Form.Text className="text-muted d-block mt-2">
                    Seleccionados: {selectedCreateServices.length} | Total: {formatCurrency(createTotal)} | Duración: {createDuration} min
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
            <Button variant="secondary" onClick={() => setShowCreateModal(false)}>
              Cancelar
            </Button>
            <Button variant="primary" type="submit">
              Crear Cita
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      <Modal show={showEditModal} onHide={() => setShowEditModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Editar Cita</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleEditAppointment}>
          <Modal.Body>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Cliente *</Form.Label>
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
            <Form.Group className="mb-3">
              <Form.Label>Detalle de servicios</Form.Label>
              <Form.Control
                plaintext
                readOnly
                value={selectedEditServices.map((service) => service.name).join(' + ') || 'Sin servicios seleccionados'}
              />
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
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowEditModal(false)}>
              Cancelar
            </Button>
            <Button variant="primary" type="submit">
              Guardar Cambios
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </DashboardLayout>
  );
}
