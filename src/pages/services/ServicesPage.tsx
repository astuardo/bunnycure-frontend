/**
 * PÃ¡gina de gestiÃ³n de servicios.
 * CRUD completo del catÃ¡logo de servicios.
 */

import { useEffect, useState } from 'react';
import { Row, Col, Button, Card, Table, Badge, Form, Modal, Alert } from 'react-bootstrap';
import DashboardLayout from '../../components/common/DashboardLayout';
import { useServicesStore } from '../../stores/servicesStore';
import { ServiceCatalog, ServiceFormData } from '../../types/service.types';
import { useToast } from '../../hooks/useToast';

export default function ServicesPage() {
  const toast = useToast();
  const {
    services,
    isLoading,
    error,
    showInactiveServices,
    fetchServices,
    createService,
    updateService,
    toggleServiceActive,
    deleteService,
    setShowInactiveServices,
    clearError,
  } = useServicesStore();

  // State local
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingServiceId, setEditingServiceId] = useState<number | null>(null);

  // Form state
  const [formData, setFormData] = useState<ServiceFormData>({
    name: '',
    description: '',
    durationMinutes: 60,
    price: 0,
    displayOrder: 0,
  });

  const getErrorMessage = (err: unknown, fallback: string) => {
    if (err instanceof Error && err.message) {
      return err.message;
    }
    return fallback;
  };

  // Cargar servicios al montar
  useEffect(() => {
    fetchServices();
  }, [fetchServices]);

  // Crear servicio
  const handleCreateService = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createService(formData);
      toast.success('Servicio creado exitosamente');
      setShowCreateModal(false);
      resetForm();
      fetchServices();
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, 'Error al crear el servicio'));
    }
  };

  // Editar servicio
  const handleEditService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingServiceId) return;
    try {
      await updateService(editingServiceId, formData);
      toast.success('Servicio actualizado exitosamente');
      setShowEditModal(false);
      setEditingServiceId(null);
      resetForm();
      fetchServices();
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, 'Error al actualizar el servicio'));
    }
  };

  // Abrir modal de ediciÃ³n
  const openEditModal = (service: ServiceCatalog) => {
    setEditingServiceId(service.id);
    setFormData({
      name: service.name,
      description: service.description || '',
      durationMinutes: service.durationMinutes,
      price: service.price,
      displayOrder: service.displayOrder,
    });
    setShowEditModal(true);
  };

  // Toggle activo/inactivo
  const handleToggleActive = async (id: number) => {
    try {
      await toggleServiceActive(id);
      toast.success('Estado actualizado');
      fetchServices();
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, 'Error al cambiar el estado'));
    }
  };

  // Eliminar servicio
  const handleDeleteService = async (id: number) => {
    if (confirm('Â¿EstÃ¡s seguro de eliminar este servicio? Esta acciÃ³n no se puede deshacer.')) {
      try {
        await deleteService(id);
        toast.success('Servicio eliminado');
        fetchServices();
      } catch (err: unknown) {
        toast.error(getErrorMessage(err, 'Error al eliminar el servicio'));
      }
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      durationMinutes: 60,
      price: 0,
      displayOrder: 0,
    });
  };

  return (
    <DashboardLayout>
      <div className="bunny-page">
      <Row className="mb-4">
        <Col>
          <h1>ðŸ’… GestiÃ³n de Servicios</h1>
          <p className="text-muted">Administra el catÃ¡logo de servicios ofrecidos</p>
        </Col>
        <Col xs="auto">
          <Button variant="primary" onClick={() => setShowCreateModal(true)}>
            + Nuevo Servicio
          </Button>
        </Col>
      </Row>

      {error && (
        <Alert variant="danger" onClose={clearError} dismissible>
          {error}
        </Alert>
      )}

      {/* Filtro activos/inactivos */}
      <Row className="mb-4">
        <Col>
          <Form.Check
            type="switch"
            label="Mostrar servicios inactivos"
            checked={showInactiveServices}
            onChange={(e) => setShowInactiveServices(e.target.checked)}
          />
        </Col>
      </Row>

      {/* Lista de servicios */}
      <Row>
        <Col>
          {isLoading ? (
            <div className="text-center py-5">
              <div className="spinner-border" role="status">
                <span className="visually-hidden">Cargando...</span>
              </div>
            </div>
          ) : services.length === 0 ? (
            <Alert variant="info">
              No hay servicios {showInactiveServices ? '' : 'activos'} para mostrar. Crea tu primer servicio.
            </Alert>
          ) : (
            <>
              
              {/* Vista Desktop: Tabla */}<div className="d-none d-md-block"><div className="table-responsive">
                <Table striped bordered hover className="mb-0">
                  <thead>
                    <tr>
                      <th>Nombre</th>
                      <th>DescripciÃ³n</th>
                      <th>DuraciÃ³n</th>
                      <th>Precio</th>
                      <th>Estado</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {services.map((service) => (
                      <tr key={service.id}>
                        <td><strong>{service.name}</strong></td>
                        <td>{service.description || '-'}</td>
                        <td>{service.durationMinutes} min</td>
                        <td>${service.price.toLocaleString('es-CL')}</td>
                        <td>
                          <Badge bg={service.active ? 'success' : 'secondary'}>
                            {service.active ? 'Activo' : 'Inactivo'}
                          </Badge>
                        </td>
                        <td>
                          <div className="d-flex gap-2">
                            <Button
                              size="sm"
                              variant="outline-primary"
                              onClick={() => openEditModal(service)}
                            >
                              Editar
                            </Button>
                            <Button
                              size="sm"
                              variant={service.active ? 'warning' : 'success'}
                              onClick={() => handleToggleActive(service.id)}
                            >
                              {service.active ? 'Desactivar' : 'Activar'}
                            </Button>
                            <Button
                              size="sm"
                              variant="danger"
                              onClick={() => handleDeleteService(service.id)}
                            >
                              Eliminar
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div></div>

              {/* Vista MÃ³vil: Cards */}
              <div className="d-md-none">
                {services.map((service) => (
                  <Card key={service.id} className="mb-3 border-peach shadow-sm">
                    <Card.Body className="p-3">
                      <div className="d-flex justify-content-between align-items-start mb-2">
                        <h6 className="mb-0 fw-bold text-bunny-dark">{service.name}</h6>
                        <Badge bg={service.active ? "success" : "secondary"}>
                          {service.active ? "Activo" : "Inactivo"}
                        </Badge>
                      </div>
                      
                      <div className="text-muted small mb-2">{service.description || "Sin descripciÃ³n"}</div>
                      
                      <div className="d-flex justify-content-between align-items-center mb-3">
                        <span className="text-bunny-mid small">{service.durationMinutes} min</span>
                        <span className="fw-bold text-success">${service.price.toLocaleString('es-CL')}</span>
                      </div>

                      <div className="d-flex gap-2">
                        <Button size="sm" variant="outline-primary" className="flex-fill" onClick={() => openEditModal(service)}>Editar</Button>
                        <Button size="sm" variant={service.active ? "warning" : "success"} className="flex-fill" onClick={() => handleToggleActive(service.id)}>
                          {service.active ? "Desactivar" : "Activar"}
                        </Button>
                        <Button size="sm" variant="outline-danger" onClick={() => handleDeleteService(service.id)}>ELIMINAR</Button>
                      </div>
                    </Card.Body>
                  </Card>
                ))}
              </div>
            </>
          )}
        </Col>
      </Row>

      {/* Modal Crear Servicio */}
      <Modal
        show={showCreateModal}
        onHide={() => setShowCreateModal(false)}
        className="bunny-modal service-modal"
        scrollable
        fullscreen="sm-down"
      >
        <Modal.Header closeButton>
          <Modal.Title>Nuevo Servicio</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleCreateService}>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Nombre *</Form.Label>
              <Form.Control
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ej: Corte de cabello"
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>DescripciÃ³n</Form.Label>
              <Form.Control
                as="textarea"
                rows={2}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="DescripciÃ³n del servicio..."
              />
            </Form.Group>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>DuraciÃ³n (minutos) *</Form.Label>
                  <Form.Control
                    type="number"
                    required
                    min={5}
                    step={5}
                    value={formData.durationMinutes}
                    onChange={(e) => setFormData({ ...formData, durationMinutes: parseInt(e.target.value) })}
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Precio ($) *</Form.Label>
                  <Form.Control
                    type="number"
                    required
                    min={0}
                    step={100}
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) })}
                  />
                </Form.Group>
              </Col>
            </Row>

            <Form.Group className="mb-3">
              <Form.Label>Orden de visualizaciÃ³n</Form.Label>
              <Form.Control
                type="number"
                min={0}
                value={formData.displayOrder}
                onChange={(e) => setFormData({ ...formData, displayOrder: parseInt(e.target.value) })}
              />
              <Form.Text className="text-muted">
                NÃºmero menor aparece primero en la lista
              </Form.Text>
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowCreateModal(false)}>
              Cancelar
            </Button>
            <Button variant="primary" type="submit">
              Crear Servicio
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Modal Editar Servicio */}
      <Modal
        show={showEditModal}
        onHide={() => setShowEditModal(false)}
        className="bunny-modal service-modal"
        scrollable
        fullscreen="sm-down"
      >
        <Modal.Header closeButton>
          <Modal.Title>Editar Servicio</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleEditService}>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Nombre *</Form.Label>
              <Form.Control
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>DescripciÃ³n</Form.Label>
              <Form.Control
                as="textarea"
                rows={2}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </Form.Group>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>DuraciÃ³n (minutos) *</Form.Label>
                  <Form.Control
                    type="number"
                    required
                    min={5}
                    step={5}
                    value={formData.durationMinutes}
                    onChange={(e) => setFormData({ ...formData, durationMinutes: parseInt(e.target.value) })}
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Precio ($) *</Form.Label>
                  <Form.Control
                    type="number"
                    required
                    min={0}
                    step={100}
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) })}
                  />
                </Form.Group>
              </Col>
            </Row>

            <Form.Group className="mb-3">
              <Form.Label>Orden de visualizaciÃ³n</Form.Label>
              <Form.Control
                type="number"
                min={0}
                value={formData.displayOrder}
                onChange={(e) => setFormData({ ...formData, displayOrder: parseInt(e.target.value) })}
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
      </div>
    </DashboardLayout>
  );
}

