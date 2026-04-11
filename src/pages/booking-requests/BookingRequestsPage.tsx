import React, { useEffect, useState } from 'react';
import { Container, Row, Col, Table, Button, Badge, Modal, Form, Alert } from 'react-bootstrap';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import DashboardLayout from '../../components/common/DashboardLayout';
import { useBookingRequestsStore } from '../../stores/bookingRequestsStore';
import { BookingRequest, BookingRequestStatus } from '../../types/booking.types';
import { useToast } from '../../hooks/useToast';
import './BookingRequestsPage.css';

const BookingRequestsPage: React.FC = () => {
  const toast = useToast();
  const {
    bookingRequests,
    isLoading,
    error,
    fetchBookingRequests,
    approveBookingRequest,
    rejectBookingRequest
  } = useBookingRequestsStore();

  const [filterStatus, setFilterStatus] = useState<'all' | 'pending'>('pending');
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<BookingRequest | null>(null);
  
  // Form states for approve modal
  const [appointmentDate, setAppointmentDate] = useState('');
  const [appointmentTime, setAppointmentTime] = useState('');
  const [notes, setNotes] = useState('');
  
  // Form state for reject modal
  const [rejectionReason, setRejectionReason] = useState('');
  
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    fetchBookingRequests();
  }, [fetchBookingRequests]);

  const filteredRequests = bookingRequests.filter((request: BookingRequest) => {
    if (filterStatus === 'pending') {
      return request.status === 'PENDING';
    }
    return true;
  });

  const getStatusBadge = (status: BookingRequestStatus) => {
    switch (status) {
      case 'PENDING':
        return <Badge bg="warning" text="dark">Pendiente</Badge>;
      case 'APPROVED':
        return <Badge bg="success">Aprobada</Badge>;
      case 'REJECTED':
        return <Badge bg="danger">Rechazada</Badge>;
      default:
        return <Badge bg="secondary">{status}</Badge>;
    }
  };

  const handleApproveClick = (request: BookingRequest) => {
    setSelectedRequest(request);
    // Pre-fill with request data
    if (request.preferredDate) {
      setAppointmentDate(request.preferredDate);
    }
    setAppointmentTime('10:00'); // Default time
    setNotes('');
    setActionError(null);
    setShowApproveModal(true);
  };

  const handleRejectClick = (request: BookingRequest) => {
    setSelectedRequest(request);
    setRejectionReason('');
    setActionError(null);
    setShowRejectModal(true);
  };

  const handleApproveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRequest) return;

    setActionLoading(true);
    setActionError(null);

    try {
      await approveBookingRequest(selectedRequest.id, {
        appointmentDate,
        appointmentTime,
        observations: notes || undefined
      });
      
      toast.success('Solicitud aprobada y cita creada exitosamente');
      setShowApproveModal(false);
      setSelectedRequest(null);
      setAppointmentDate('');
      setAppointmentTime('');
      setNotes('');
      
      // Refresh list
      await fetchBookingRequests();
    } catch (err: any) {
      const errorMessage = err.message || 'Error al aprobar la solicitud';
      setActionError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRequest) return;

    setActionLoading(true);
    setActionError(null);

    try {
      await rejectBookingRequest(selectedRequest.id, rejectionReason || 'No especificado');
      
      toast.success('Solicitud rechazada');
      setShowRejectModal(false);
      setSelectedRequest(null);
      setRejectionReason('');
      
      // Refresh list
      await fetchBookingRequests();
    } catch (err: any) {
      const errorMessage = err.message || 'Error al rechazar la solicitud';
      setActionError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCloseApproveModal = () => {
    setShowApproveModal(false);
    setSelectedRequest(null);
    setAppointmentDate('');
    setAppointmentTime('');
    setNotes('');
    setActionError(null);
  };

  const handleCloseRejectModal = () => {
    setShowRejectModal(false);
    setSelectedRequest(null);
    setRejectionReason('');
    setActionError(null);
  };

  return (
    <DashboardLayout>
      <Container fluid className="bunny-page booking-requests-page">
        <Row className="mb-4">
          <Col>
            <h2>Solicitudes de Citas</h2>
            <p className="text-muted">Gestiona las solicitudes de citas recibidas</p>
          </Col>
        </Row>

        {/* Filters */}
        <Row className="mb-3">
          <Col md={6}>
            <Form.Group>
              <Form.Label>Filtrar por estado:</Form.Label>
              <Form.Select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as 'all' | 'pending')}
              >
                <option value="pending">Pendientes</option>
                <option value="all">Todas</option>
              </Form.Select>
            </Form.Group>
          </Col>
          <Col md={6} className="d-flex align-items-end justify-content-end">
            <Button 
              variant="outline-primary" 
              onClick={() => fetchBookingRequests()}
              disabled={isLoading}
            >
              🔄 Actualizar
            </Button>
          </Col>
        </Row>

        {/* Error Alert */}
        {error && (
          <Alert variant="danger" dismissible onClose={() => {}}>
            {error}
          </Alert>
        )}

        {/* Loading */}
        {isLoading && (
          <div className="text-center my-5">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Cargando...</span>
            </div>
          </div>
        )}

        {/* Table */}
        {!isLoading && (
          <Row>
            <Col>
              <div className="table-responsive">
                <Table striped bordered hover>
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Cliente</th>
                      <th>Contacto</th>
                      <th>Fecha Solicitada</th>
                      <th>Hora Solicitada</th>
                      <th>Servicio</th>
                      <th>Estado</th>
                      <th>Fecha Solicitud</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRequests.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="text-center text-muted">
                          No hay solicitudes {filterStatus === 'pending' ? 'pendientes' : ''}
                        </td>
                      </tr>
                    ) : (
                      filteredRequests.map((request: BookingRequest) => (
                        <tr key={request.id}>
                          <td>{request.id}</td>
                          <td>{request.fullName}</td>
                          <td>
                            {request.phone && (
                              <div>
                                📱 {request.phone}
                              </div>
                            )}
                            {request.email && (
                              <div className="text-muted small">✉️ {request.email}</div>
                            )}
                          </td>
                          <td>
                            {request.preferredDate 
                              ? format(new Date(request.preferredDate), 'dd/MM/yyyy', { locale: es })
                              : '-'}
                          </td>
                          <td>{request.preferredBlock || '-'}</td>
                          <td>{request.service?.name || '-'}</td>
                          <td>{getStatusBadge(request.status)}</td>
                          <td>
                            {request.createdAt 
                              ? format(new Date(request.createdAt), 'dd/MM/yyyy HH:mm', { locale: es })
                              : '-'}
                          </td>
                          <td>
                            {request.status === 'PENDING' && (
                              <div className="d-flex gap-2">
                                <Button
                                  variant="success"
                                  size="sm"
                                  onClick={() => handleApproveClick(request)}
                                >
                                  ✓ Aprobar
                                </Button>
                                <Button
                                  variant="danger"
                                  size="sm"
                                  onClick={() => handleRejectClick(request)}
                                >
                                  ✗ Rechazar
                                </Button>
                              </div>
                            )}
                            {request.status === 'APPROVED' && (
                              <span className="text-success small">
                                Convertida a cita
                              </span>
                            )}
                            {request.status === 'REJECTED' && (
                              <span className="text-danger small">
                                Rechazada
                              </span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </Table>
              </div>
            </Col>
          </Row>
        )}

        {/* Approve Modal */}
        <Modal
          show={showApproveModal}
          onHide={handleCloseApproveModal}
          size="lg"
          className="bunny-modal booking-request-modal"
          scrollable
          fullscreen="sm-down"
        >
          <Modal.Header closeButton>
            <Modal.Title>Aprobar Solicitud y Crear Cita</Modal.Title>
          </Modal.Header>
          <Form onSubmit={handleApproveSubmit}>
            <Modal.Body>
              {actionError && (
                <Alert variant="danger" dismissible onClose={() => setActionError(null)}>
                  {actionError}
                </Alert>
              )}

              {selectedRequest && (
                <div className="mb-3">
                  <h6>Información del Cliente:</h6>
                  <p className="mb-1"><strong>Nombre:</strong> {selectedRequest.fullName}</p>
                  <p className="mb-1"><strong>Teléfono:</strong> {selectedRequest.phone}</p>
                  {selectedRequest.email && (
                    <p className="mb-1"><strong>Email:</strong> {selectedRequest.email}</p>
                  )}
                  {selectedRequest.service && (
                    <p className="mb-1"><strong>Servicio:</strong> {selectedRequest.service.name}</p>
                  )}
                </div>
              )}

              <Form.Group className="mb-3">
                <Form.Label>Fecha de la Cita *</Form.Label>
                <Form.Control
                  type="date"
                  value={appointmentDate}
                  onChange={(e) => setAppointmentDate(e.target.value)}
                  required
                />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Hora de la Cita *</Form.Label>
                <Form.Control
                  type="time"
                  value={appointmentTime}
                  onChange={(e) => setAppointmentTime(e.target.value)}
                  required
                />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Notas Adicionales</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Notas adicionales para la cita..."
                />
              </Form.Group>

              <Alert variant="info">
                Al aprobar esta solicitud, se creará automáticamente una cita y se enviará una notificación al cliente.
              </Alert>
            </Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" onClick={handleCloseApproveModal}>
                Cancelar
              </Button>
              <Button 
                variant="success" 
                type="submit"
                disabled={actionLoading}
              >
                {actionLoading ? 'Procesando...' : '✓ Aprobar y Crear Cita'}
              </Button>
            </Modal.Footer>
          </Form>
        </Modal>

        {/* Reject Modal */}
        <Modal
          show={showRejectModal}
          onHide={handleCloseRejectModal}
          className="bunny-modal booking-request-modal"
          scrollable
          fullscreen="sm-down"
        >
          <Modal.Header closeButton>
            <Modal.Title>Rechazar Solicitud</Modal.Title>
          </Modal.Header>
          <Form onSubmit={handleRejectSubmit}>
            <Modal.Body>
              {actionError && (
                <Alert variant="danger" dismissible onClose={() => setActionError(null)}>
                  {actionError}
                </Alert>
              )}

              {selectedRequest && (
                <div className="mb-3">
                  <p><strong>Cliente:</strong> {selectedRequest.fullName}</p>
                  <p><strong>Teléfono:</strong> {selectedRequest.phone}</p>
                </div>
              )}

              <Form.Group className="mb-3">
                <Form.Label>Motivo del Rechazo *</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Indica el motivo por el cual se rechaza esta solicitud..."
                  required
                />
              </Form.Group>

              <Alert variant="warning">
                Se enviará una notificación al cliente informando que su solicitud fue rechazada.
              </Alert>
            </Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" onClick={handleCloseRejectModal}>
                Cancelar
              </Button>
              <Button 
                variant="danger" 
                type="submit"
                disabled={actionLoading}
              >
                {actionLoading ? 'Procesando...' : '✗ Rechazar Solicitud'}
              </Button>
            </Modal.Footer>
          </Form>
        </Modal>
      </Container>
    </DashboardLayout>
  );
};

export default BookingRequestsPage;
