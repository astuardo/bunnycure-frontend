/**
 * Página de gestión de servicios.
 * CRUD completo del catálogo de servicios.
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
    fetchServices, 
    createService, 
    updateService, 
    deleteService,
    toggleServiceActive,
    clearError 
  } = useServicesStore();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingServiceId, setEditingServiceId] = useState<number | null>(null);
  const [formData, setFormData] = useState<ServiceFormData>({
    name: '',
    description: '',
    durationMinutes: 60,
    price: 0,
    displayOrder: 0,
  });

  useEffect(() => {
    fetchServices();
  }, [fetchServices]);

  const handleCloseCreateModal = () => {
    setShowCreateModal(false);
    resetForm();
  };

  const handleCloseEditModal = () => {
    setShowEditModal(false);
    setEditingServiceId(null);
    resetForm();
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

  const handleCreateService = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createService(formData);
      toast.success('Servicio creado exitosamente');
      handleCloseCreateModal();
    } catch (err: unknown) {
      console.error('Error creating service:', err);
    }
  };

  const handleUpdateService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingServiceId) {
      try {
        await updateService(editingServiceId, formData);
        toast.success('Servicio actualizado exitosamente');
        handleCloseEditModal();
      } catch (err: unknown) {
        console.error('Error updating service:', err);
      }
    }
  };

  // Abrir modal de edición
  const openEditModal = (service: ServiceCatalog) => {
    setEditingServiceId(service.id);
    setFormData({
      name: service.name,
      description: service.description || '',
      durationMinutes: service.durationMinutes,
      price: service.price,
      displayOrder: service.displayOrder || 0,
    });
    setShowEditModal(true);
  };

  const handleToggleActive = async (id: number) => {
    try {
      await toggleServiceActive(id);
      toast.success('Estado del servicio actualizado');
    } catch (err: unknown) {
      console.error('Error toggling service active:', err);
    }
  };

  // Eliminar servicio
  const handleDeleteService = async (id: number) => {
    if (confirm('¿Estás seguro de eliminar este servicio? Esta acción no se puede deshacer.')) {
      try {
        await deleteService(id);
        toast.success('Servicio eliminado');
      } catch (err: unknown) {
        console.error('Error deleting service:', err);
      }
    }
  };

  return (
    <DashboardLayout>
      <div className="bunny-page">
      <Row className="mb-4">
        <Col>
          <h1>💅 Gestión de Servicios</h1>
          <p className="text-muted">Administra el catálogo de servicios ofrecidos</p>
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
              No hay servicios configurados. Crea el primero para comenzar.
            </Alert>
          ) : (
            <>

              {/* Vista Desktop: Tabla */}<div className="d-none d-md-block"><div className="table-responsive">
                <Table striped bordered hover className="mb-0">
                  <thead>
                    <tr>
                      <th>Nombre</th>
                      <th>Descripción</th>
                      <th>Duración</th>
                      <th>Precio</th>
                      <th>Estado</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {services.map((service) => (
                      <tr key={service.id}>
                        <td className="fw-bold">{service.name}</td>
                        <td>{service.description || <span className="text-muted small">Sin descripción</span>}</td>
                        <td>{service.durationMinutes} min</td>
                        <td>${service.price.toLocaleString('es-CL')}</td>
                        <td>
                          <Badge bg={service.active ? "success" : "secondary"}>
                            {service.active ? "Activo" : "Inactivo"}
                          </Badge>
                        </td>
                        <td>
                          <div className="d-flex gap-1">
                            <Button size="sm" variant="outline-primary" onClick={() => openEditModal(service)}>
                              Editar
                            </Button>
                            <Button size="sm" variant={service.active ? "outline-warning" : "outline-success"} onClick={() => handleToggleActive(service.id)}>
                              {service.active ? "Desactivar" : "Activar"}
                            </Button>
                            <Button size="sm" variant="outline-danger" onClick={() => handleDeleteService(service.id)}>
                              Eliminar
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div></div>

              {/* Vista Móvil: Cards */}
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

                      <div className="text-muted small mb-2">{service.description || "Sin descripción"}</div> 

                      <div className="d-flex justify-content-between align-items-center mb-3">
                        <span className="text-bunny-mid small">{service.durationMinutes} min</span>
                        <span className="fw-bold text-success">${service.price.toLocaleString('es-CL')}</span> 
                      </div>

                      <div className="d-flex gap-2">
                        <Button size="sm" variant="outline-primary" className="flex-fill" onClick={() => openEditModal(service)}>Editar</Button>
                        <Button size="sm" variant={service.active ? "warning" : "success"} className="flex-fill" onClick={() => handleToggleActive(service.id)}>
                          {service.active ? "Desactivar" : "Activar"}
                        </Button>
                        <Button size="sm" variant="outline-danger" onClick={() => handleDeleteService(service.id)}>Eliminar</Button>
                      </div>
                    </Card.Body>
                  </Card>
                ))}
              </div>
            </>
          )}
        </Col>
      </Row>

      {/* Modal Crear */}
      <Modal show={showCreateModal} onHide={handleCloseCreateModal} className="bunny-modal">
        <Modal.Header closeButton>
          <Modal.Title>Nuevo Servicio</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleCreateService}>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Nombre del servicio *</Form.Label>
              <Form.Control
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ej: Esmaltado Permanente"
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Descripción</Form.Label>
              <Form.Control
                as="textarea"
                rows={2}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Descripción del servicio..."
              />
            </Form.Group>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Duración (minutos) *</Form.Label>
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
                  <Form.Label>Precio *</Form.Label>
                  <Form.Control
                    type="number"
                    required
                    min={0}
                    step={100}
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: parseInt(e.target.value) })}
                  />
                </Form.Group>
              </Col>
            </Row>

            <Form.Group className="mb-3">
              <Form.Label>Orden de visualización</Form.Label>
              <Form.Control
                type="number"
                min={0}
                value={formData.displayOrder}
                onChange={(e) => setFormData({ ...formData, displayOrder: parseInt(e.target.value) })}
              />
              <Form.Text className="text-muted">
                Número menor aparece primero en la lista
              </Form.Text>
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={handleCloseCreateModal}>
              Cancelar
            </Button>
            <Button variant="primary" type="submit">
              Crear Servicio
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Modal Editar */}
      <Modal show={showEditModal} onHide={handleCloseEditModal} className="bunny-modal">
        <Modal.Header closeButton>
          <Modal.Title>Editar Servicio</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleUpdateService}>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Nombre del servicio *</Form.Label>
              <Form.Control
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Descripción</Form.Label>
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
                  <Form.Label>Duración (minutos) *</Form.Label>
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
                  <Form.Label>Precio *</Form.Label>
                  <Form.Control
                    type="number"
                    required
                    min={0}
                    step={100}
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: parseInt(e.target.value) })}
                  />
                </Form.Group>
              </Col>
            </Row>

            <Form.Group className="mb-3">
              <Form.Label>Orden de visualización</Form.Label>
              <Form.Control
                type="number"
                min={0}
                value={formData.displayOrder}
                onChange={(e) => setFormData({ ...formData, displayOrder: parseInt(e.target.value) })}
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={handleCloseEditModal}>
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
