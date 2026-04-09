/**
 * Página principal de gestión de citas.
 * Incluye lista, filtros, CRUD completo y cambio de estados.
 */

import { useEffect, useState } from 'react';
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

  // State local para modales y formularios
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingAppointmentId, setEditingAppointmentId] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<AppointmentStatus | ''>('');
  const [dateFilter, setDateFilter] = useState<string>('');

  // Form state
  const [formData, setFormData] = useState<AppointmentCreateRequest>({
    customerId: 0,
    serviceId: 0,
    appointmentDate: '',
    appointmentTime: '',
    notes: '',
  });
  const [editFormData, setEditFormData] = useState<AppointmentUpdateRequest>({
    customerId: 0,
    serviceId: 0,
    appointmentDate: '',
    appointmentTime: '',
    notes: '',
    status: AppointmentStatus.PENDING,
  });

  // Cargar datos al montar
  useEffect(() => {
    fetchAppointments();
    fetchCustomers();
    fetchServices(true); // Solo servicios activos
  }, []);

  // Aplicar filtros
  const handleApplyFilters = () => {
    const filters: any = {};
    if (statusFilter) filters.status = statusFilter;
    if (dateFilter) {
      filters.startDate = dateFilter;
      filters.endDate = dateFilter;
    }
    fetchAppointments(filters);
  };

  // Limpiar filtros
  const handleClearFilters = () => {
    setStatusFilter('');
    setDateFilter('');
    fetchAppointments();
  };

  // Crear cita
  const handleCreateAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createAppointment(formData);
      toast.success('Cita creada exitosamente');
      setShowCreateModal(false);
      resetForm();
      fetchAppointments(); // Recargar lista
    } catch (err: any) {
      toast.error(err.message || 'Error al crear la cita');
    }
  };

  const openEditModal = (appointment: Appointment) => {
    setEditingAppointmentId(appointment.id);
    setEditFormData({
      customerId: appointment.customer.id,
      serviceId: appointment.service.id,
      appointmentDate: appointment.appointmentDate,
      appointmentTime: appointment.appointmentTime,
      notes: appointment.notes || '',
      status: appointment.status,
    });
    setShowEditModal(true);
  };

  const handleEditAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAppointmentId) return;
    try {
      await updateAppointment(editingAppointmentId, editFormData);
      toast.success('Cita actualizada exitosamente');
      setShowEditModal(false);
      setEditingAppointmentId(null);
      fetchAppointments();
    } catch (err: unknown) {
      const error = err as { message?: string };
      toast.error(error.message || 'Error al actualizar la cita');
    }
  };

  // Cambiar estado
  const handleChangeStatus = async (id: number, status: AppointmentStatus) => {
    if (confirm(`¿Cambiar estado a ${status}?`)) {
      try {
        await updateAppointmentStatus(id, status);
        toast.success('Estado actualizado correctamente');
        fetchAppointments(); // Recargar lista
      } catch (err: any) {
        toast.error(err.message || 'Error al actualizar el estado');
      }
    }
  };

  // Cancelar cita
  const handleCancelAppointment = async (id: number) => {
    if (confirm('¿Estás seguro de que deseas cancelar esta cita?')) {
      try {
        await updateAppointmentStatus(id, AppointmentStatus.CANCELLED);
        toast.success('Cita cancelada');
        fetchAppointments();
      } catch (err: any) {
        toast.error(err.message || 'Error al cancelar la cita');
      }
    }
  };

  // Eliminar cita
  const handleDeleteAppointment = async (id: number) => {
    if (confirm('¿Estás seguro de que deseas eliminar esta cita? Esta acción no se puede deshacer.')) {
      try {
        await deleteAppointment(id);
        toast.success('Cita eliminada');
        fetchAppointments();
      } catch (err: unknown) {
        const error = err as { message?: string };
        toast.error(error.message || 'Error al eliminar la cita');
      }
    }
  };

  // Enviar notificación manualmente
  const handleSendNotification = async (id: number) => {
    try {
      await appointmentsApi.sendNotification(id);
      toast.success('📧 Notificación enviada correctamente');
    } catch (err: unknown) {
      const error = err as { message?: string };
      toast.error(error.message || 'Error al enviar notificación');
    }
  };

  // WhatsApp Handoff - Transferir a agente humano
  const handleWhatsAppHandoff = async (id: number) => {
    try {
      const url = await appointmentsApi.whatsappHandoff(id);
      window.open(url, '_blank');
      toast.success('✅ Abriendo WhatsApp para traspaso');
    } catch (err: unknown) {
      const error = err as { message?: string };
      toast.error(error.message || 'Error al generar handoff');
    }
  };

  // Enviar confirmación por WhatsApp
  const handleSendWhatsAppConfirmation = async (id: number) => {
    try {
      await appointmentsApi.sendWhatsAppConfirmation(id);
      toast.success('✅ Confirmación enviada por WhatsApp');
    } catch (err: unknown) {
      const error = err as { message?: string };
      toast.error(error.message || 'Error al enviar confirmación');
    }
  };

  // Enviar recordatorio por WhatsApp
  const handleSendWhatsAppReminder = async (id: number) => {
    try {
      await appointmentsApi.sendWhatsAppReminder(id);
      toast.success('✅ Recordatorio enviado por WhatsApp');
    } catch (err: unknown) {
      const error = err as { message?: string };
      toast.error(error.message || 'Error al enviar recordatorio');
    }
  };

  const resetForm = () => {
    setFormData({
      customerId: 0,
      serviceId: 0,
      appointmentDate: '',
      appointmentTime: '',
      notes: '',
    });
  };

  // Badge de estado
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

      {/* Filtros */}
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
              onChange={(e) => setStatusFilter(e.target.value as AppointmentStatus | '')}
            >
              <option value="">Todos</option>
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

      {/* Tabla de citas */}
      <Row>
        <Col>
          {isLoading ? (
            <div className="text-center py-5">
              <div className="spinner-border" role="status">
                <span className="visually-hidden">Cargando...</span>
              </div>
            </div>
          ) : appointments.length === 0 ? (
            <Alert variant="info">
              No hay citas que mostrar. {dateFilter || statusFilter ? 'Intenta cambiar los filtros.' : 'Crea tu primera cita.'}
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
                      <th>Servicio</th>
                      <th>Valor</th>
                      <th>Estado</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {appointments.map((apt) => (
                      <tr key={apt.id}>
                        <td>{format(parseISO(apt.appointmentDate), 'dd/MM/yyyy', { locale: es })}</td>
                        <td>{apt.appointmentTime}</td>
                        <td>{apt.customer.fullName}</td>
                        <td>{apt.service.name}</td>
                        <td>${apt.service.price.toLocaleString('es-CL')}</td>
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
                    ))}
                  </tbody>
                </Table>
              </div>
            </>
          )}
        </Col>
      </Row>

      {/* Modal Crear Cita */}
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
                  <Form.Select
                    required
                    value={formData.customerId}
                    onChange={(e) => setFormData({ ...formData, customerId: parseInt(e.target.value) })}
                  >
                    <option value={0}>Seleccionar cliente...</option>
                    {customers.map((customer) => (
                      <option key={customer.id} value={customer.id}>
                        {customer.fullName} - {customer.phone}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Servicio *</Form.Label>
                  <Form.Select
                    required
                    value={formData.serviceId}
                    onChange={(e) => setFormData({ ...formData, serviceId: parseInt(e.target.value) })}
                  >
                    <option value={0}>Seleccionar servicio...</option>
                    {services.map((service) => (
                      <option key={service.id} value={service.id}>
                        {service.name} - ${service.price} ({service.durationMinutes} min)
                      </option>
                    ))}
                  </Form.Select>
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
                    onChange={(e) => setFormData({ ...formData, appointmentDate: e.target.value })}
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
                    onChange={(e) => setFormData({ ...formData, appointmentTime: e.target.value })}
                  />
                </Form.Group>
              </Col>
            </Row>
            <Form.Group className="mb-3">
              <Form.Label>Notas</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
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
                  <Form.Select
                    required
                    value={editFormData.customerId}
                    onChange={(e) => setEditFormData({ ...editFormData, customerId: parseInt(e.target.value) })}
                  >
                    <option value={0}>Seleccionar cliente...</option>
                    {customers.map((customer) => (
                      <option key={customer.id} value={customer.id}>
                        {customer.fullName} - {customer.phone}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Servicio *</Form.Label>
                  <Form.Select
                    required
                    value={editFormData.serviceId}
                    onChange={(e) => setEditFormData({ ...editFormData, serviceId: parseInt(e.target.value) })}
                  >
                    <option value={0}>Seleccionar servicio...</option>
                    {services.map((service) => (
                      <option key={service.id} value={service.id}>
                        {service.name} - ${service.price} ({service.durationMinutes} min)
                      </option>
                    ))}
                  </Form.Select>
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
                    onChange={(e) => setEditFormData({ ...editFormData, appointmentDate: e.target.value })}
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
                    onChange={(e) => setEditFormData({ ...editFormData, appointmentTime: e.target.value })}
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
                    onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value as AppointmentStatus })}
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
                  Valor estimado: {
                    services.find((service) => service.id === editFormData.serviceId)?.price
                      ?.toLocaleString('es-CL') || '0'
                  } CLP
                </div>
              </Col>
            </Row>
            <Form.Group className="mb-3">
              <Form.Label>Notas</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                value={editFormData.notes || ''}
                onChange={(e) => setEditFormData({ ...editFormData, notes: e.target.value })}
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
