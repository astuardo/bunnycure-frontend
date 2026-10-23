import { useEffect, useState, type FormEvent } from 'react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import DashboardLayout from '../../components/common/DashboardLayout';
import { useBookingRequestsStore } from '../../stores/bookingRequestsStore';
import { BookingRequest, BookingRequestStatus } from '../../types/booking.types';
import { useToast } from '../../hooks/useToast';
import {
  getPublicBookingEnabled,
  setPublicBookingEnabled,
} from '../../utils/bookingSettingsUtils';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Spinner } from '@/components/ui/Spinner';
import './BookingRequestsPage.css';

export default function BookingRequestsPage() {
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
  const [bookingEnabled, setBookingEnabled] = useState<boolean>(getPublicBookingEnabled());

  const handleToggleBooking = async (checked: boolean) => {
    setBookingEnabled(checked);
    await setPublicBookingEnabled(checked);
    if (checked) {
      toast.success('✅ Agendamiento online (/reservar) habilitado');
    } else {
      toast.info('⏸️ Agendamiento online (/reservar) pausado');
    }
  };
  
  // Form states for approve modal
  const [appointmentDate, setAppointmentDate] = useState('');
  const [appointmentTime, setAppointmentTime] = useState('');
  const [notes, setNotes] = useState('');
  
  // Form state for reject modal
  const [rejectionReason, setRejectionReason] = useState('');
  
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const getErrorMessage = (err: unknown, fallback: string) => {
    if (err instanceof Error && err.message) {
      return err.message;
    }
    return fallback;
  };

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
        return <Badge variant="warning">Pendiente</Badge>;
      case 'APPROVED':
        return <Badge variant="success">Aprobada</Badge>;
      case 'REJECTED':
        return <Badge variant="danger">Rechazada</Badge>;
      default:
        return <Badge variant="neutral">{status}</Badge>;
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

  const handleApproveSubmit = async (e: FormEvent) => {
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
    } catch (err: unknown) {
      const errorMessage = getErrorMessage(err, 'Error al aprobar la solicitud');
      setActionError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectSubmit = async (e: FormEvent) => {
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
    } catch (err: unknown) {
      const errorMessage = getErrorMessage(err, 'Error al rechazar la solicitud');
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 booking-requests-page space-y-6">
        {/* Header & Controls */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-amber-950">Solicitudes de Citas</h2>
            <p className="text-sm text-stone-500">Gestiona las solicitudes de citas recibidas desde el portal público</p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-3 py-2 px-3.5 rounded-xl shadow-sm border border-rose-100 bg-white">
              <label htmlFor="booking-toggle-switch" className="flex items-center cursor-pointer gap-2.5">
                <span className="text-xs font-semibold text-stone-700">
                  Agendamiento Online:{' '}
                  <span className={bookingEnabled ? 'text-emerald-600 font-bold' : 'text-red-500 font-bold'}>
                    {bookingEnabled ? 'ACTIVO' : 'PAUSADO'}
                  </span>
                </span>
                <div className="relative inline-flex items-center">
                  <input
                    id="booking-toggle-switch"
                    type="checkbox"
                    className="sr-only peer"
                    checked={bookingEnabled}
                    onChange={(e) => handleToggleBooking(e.target.checked)}
                  />
                  <div className="w-9 h-5 bg-stone-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
                </div>
              </label>
            </div>

            <a
              href="/reservar"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center font-medium transition-all duration-200 border border-stone-200 text-stone-700 hover:bg-stone-50 px-3 py-1.5 text-xs rounded-xl shadow-2xs"
            >
              🌐 Ver Portal (/reservar)
            </a>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-4 rounded-2xl border border-rose-100 shadow-sm">
          <div className="w-full sm:w-64">
            <label htmlFor="booking-requests-filtrar-por-estado" className="block text-xs font-semibold text-stone-600 mb-1">Filtrar por estado:</label>
            <select id="booking-requests-filtrar-por-estado"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as 'all' | 'pending')}
              className="w-full px-3 py-2 text-sm bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-400"
            >
              <option value="pending">Pendientes</option>
              <option value="all">Todas</option>
            </select>
          </div>
          <div className="flex justify-end">
            <Button 
              variant="outline" 
              onClick={() => fetchBookingRequests()}
              disabled={isLoading}
              size="sm"
            >
              🔄 Actualizar
            </Button>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center justify-between">
            <span>{error}</span>
          </div>
        )}

        {/* Loading */}
        {isLoading && (
          <div className="flex justify-center items-center py-12">
            <Spinner size="lg" variant="primary" />
          </div>
        )}

        {/* Table */}
        {!isLoading && (
          <div className="overflow-x-auto rounded-2xl border border-rose-100 shadow-sm bg-white">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-stone-50 border-b border-rose-100 text-xs font-semibold text-stone-600 uppercase tracking-wider">
                  <th className="py-3 px-4">ID</th>
                  <th className="py-3 px-4">Cliente</th>
                  <th className="py-3 px-4">Contacto</th>
                  <th className="py-3 px-4">Fecha Solicitada</th>
                  <th className="py-3 px-4">Hora Solicitada</th>
                  <th className="py-3 px-4">Servicio</th>
                  <th className="py-3 px-4">Estado</th>
                  <th className="py-3 px-4">Fecha Solicitud</th>
                  <th className="py-3 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-rose-50 text-stone-700">
                {filteredRequests.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-stone-400">
                      No hay solicitudes {filterStatus === 'pending' ? 'pendientes' : ''}
                    </td>
                  </tr>
                ) : (
                  filteredRequests.map((request: BookingRequest) => (
                    <tr key={request.id} className="hover:bg-rose-50/40 transition-colors">
                      <td className="py-3 px-4 font-mono text-xs text-stone-500">#{request.id}</td>
                      <td className="py-3 px-4 font-medium text-amber-950">{request.fullName}</td>
                      <td className="py-3 px-4">
                        {request.phone && (
                          <div className="text-xs">
                            📱 {request.phone}
                          </div>
                        )}
                        {request.email && (
                          <div className="text-xs text-stone-400">✉️ {request.email}</div>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {request.preferredDate 
                          ? format(parseISO(request.preferredDate), 'dd/MM/yyyy', { locale: es })
                          : '-'}
                      </td>
                      <td className="py-3 px-4">{request.preferredBlock || '-'}</td>
                      <td className="py-3 px-4">{request.service?.name || '-'}</td>
                      <td className="py-3 px-4">{getStatusBadge(request.status)}</td>
                      <td className="py-3 px-4 text-xs text-stone-500">
                        {request.createdAt 
                          ? format(new Date(request.createdAt), 'dd/MM/yyyy HH:mm', { locale: es })
                          : '-'}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {request.status === 'PENDING' && (
                          <div className="flex items-center justify-end gap-2">
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
                          <span className="text-emerald-600 text-xs font-medium">
                            Convertida a cita
                          </span>
                        )}
                        {request.status === 'REJECTED' && (
                          <span className="text-red-500 text-xs font-medium">
                            Rechazada
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Approve Modal */}
        <Modal
          show={showApproveModal}
          onHide={handleCloseApproveModal}
          size="lg"
        >
          <Modal.Header closeButton>
            <Modal.Title>Aprobar Solicitud y Crear Cita</Modal.Title>
          </Modal.Header>
          <form onSubmit={handleApproveSubmit}>
            <Modal.Body className="space-y-4">
              {actionError && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center justify-between">
                  <span>{actionError}</span>
                  <button type="button" onClick={() => setActionError(null)} className="text-red-500 hover:text-red-700 font-bold ml-2">×</button>
                </div>
              )}

              {selectedRequest && (
                <div className="p-3.5 bg-rose-50/60 rounded-xl border border-rose-100 text-sm space-y-1">
                  <h6 className="font-bold text-amber-950 mb-1">Información del Cliente:</h6>
                  <p className="text-stone-700"><strong>Nombre:</strong> {selectedRequest.fullName}</p>
                  <p className="text-stone-700"><strong>Teléfono:</strong> {selectedRequest.phone}</p>
                  {selectedRequest.email && (
                    <p className="text-stone-700"><strong>Email:</strong> {selectedRequest.email}</p>
                  )}
                  {selectedRequest.service && (
                    <p className="text-stone-700"><strong>Servicio:</strong> {selectedRequest.service.name}</p>
                  )}
                </div>
              )}

              <div>
                <label htmlFor="booking-requests-fecha-de-la-cita" className="block text-sm font-semibold text-stone-700 mb-1">Fecha de la Cita *</label>
                <input id="booking-requests-fecha-de-la-cita"
                  type="date"
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-400 bg-white"
                  value={appointmentDate}
                  onChange={(e) => setAppointmentDate(e.target.value)}
                  required
                />
              </div>

              <div>
                <label htmlFor="booking-requests-hora-de-la-cita" className="block text-sm font-semibold text-stone-700 mb-1">Hora de la Cita *</label>
                <input id="booking-requests-hora-de-la-cita"
                  type="time"
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-400 bg-white"
                  value={appointmentTime}
                  onChange={(e) => setAppointmentTime(e.target.value)}
                  required
                />
              </div>

              <div>
                <label htmlFor="booking-requests-notas-adicionales" className="block text-sm font-semibold text-stone-700 mb-1">Notas Adicionales</label>
                <textarea id="booking-requests-notas-adicionales"
                  rows={3}
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-400 bg-white"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Notas adicionales para la cita..."
                />
              </div>

              <div className="p-3 rounded-xl bg-sky-50 border border-sky-200 text-sky-800 text-xs flex items-center gap-2">
                <span>ℹ️ Al aprobar esta solicitud, se creará automáticamente una cita y se enviará una notificación al cliente.</span>
              </div>
            </Modal.Body>
            <Modal.Footer>
              <Button variant="ghost" onClick={handleCloseApproveModal} type="button">
                Cancelar
              </Button>
              <Button 
                variant="success" 
                type="submit"
                isLoading={actionLoading}
              >
                ✓ Aprobar y Crear Cita
              </Button>
            </Modal.Footer>
          </form>
        </Modal>

        {/* Reject Modal */}
        <Modal
          show={showRejectModal}
          onHide={handleCloseRejectModal}
        >
          <Modal.Header closeButton>
            <Modal.Title>Rechazar Solicitud</Modal.Title>
          </Modal.Header>
          <form onSubmit={handleRejectSubmit}>
            <Modal.Body className="space-y-4">
              {actionError && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center justify-between">
                  <span>{actionError}</span>
                  <button type="button" onClick={() => setActionError(null)} className="text-red-500 hover:text-red-700 font-bold ml-2">×</button>
                </div>
              )}

              {selectedRequest && (
                <div className="p-3.5 bg-rose-50/60 rounded-xl border border-rose-100 text-sm space-y-1">
                  <p className="text-stone-700"><strong>Cliente:</strong> {selectedRequest.fullName}</p>
                  <p className="text-stone-700"><strong>Teléfono:</strong> {selectedRequest.phone}</p>
                </div>
              )}

              <div>
                <label htmlFor="booking-requests-motivo-del-rechazo" className="block text-sm font-semibold text-stone-700 mb-1">Motivo del Rechazo *</label>
                <textarea id="booking-requests-motivo-del-rechazo"
                  rows={3}
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-400 bg-white"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Indica el motivo por el cual se rechaza esta solicitud..."
                  required
                />
              </div>

              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center gap-2">
                <span>⚠️ Se enviará una notificación al cliente informando que su solicitud fue rechazada.</span>
              </div>
            </Modal.Body>
            <Modal.Footer>
              <Button variant="ghost" onClick={handleCloseRejectModal} type="button">
                Cancelar
              </Button>
              <Button 
                variant="danger" 
                type="submit"
                isLoading={actionLoading}
              >
                ✗ Rechazar Solicitud
              </Button>
            </Modal.Footer>
          </form>
        </Modal>
      </div>
    </DashboardLayout>
  );
}
