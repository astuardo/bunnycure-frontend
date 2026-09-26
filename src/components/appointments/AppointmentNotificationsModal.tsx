import React, { useEffect, useState, useCallback } from 'react';
import { Modal, Button, Badge, Spinner, Alert, Card } from 'react-bootstrap';
import { FaWhatsapp, FaEnvelope, FaSyncAlt, FaPaperPlane, FaCheckCircle, FaExclamationCircle, FaCopy, FaCheck } from 'react-icons/fa';
import { appointmentsApi } from '../../api/appointments.api';
import { NotificationLogDto } from '../../types/appointment.types';
import { useToast } from '../../hooks/useToast';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

interface AppointmentNotificationsModalProps {
  show: boolean;
  appointmentId: number | null;
  customerName?: string;
  customerPhone?: string;
  onClose: () => void;
}

export const AppointmentNotificationsModal: React.FC<AppointmentNotificationsModalProps> = ({
  show,
  appointmentId,
  customerName,
  customerPhone,
  onClose,
}) => {
  const [logs, setLogs] = useState<NotificationLogDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedWamid, setCopiedWamid] = useState<string | null>(null);
  const toast = useToast();

  const fetchLogs = useCallback(async () => {
    if (!appointmentId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await appointmentsApi.getAppointmentNotifications(appointmentId);
      setLogs(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al cargar el historial de notificaciones';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [appointmentId]);

  useEffect(() => {
    if (show && appointmentId) {
      fetchLogs();
    } else {
      setLogs([]);
      setError(null);
    }
  }, [show, appointmentId, fetchLogs]);

  const handleResendConfirmation = async () => {
    if (!appointmentId) return;
    setResending(true);
    try {
      await appointmentsApi.sendWhatsAppConfirmation(appointmentId);
      toast.success('✅ Plantilla de confirmación reenviada exitosamente a WhatsApp');
      // Esperar 1.5s y refrescar historial
      setTimeout(() => {
        fetchLogs();
      }, 1500);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al reenviar la confirmación';
      toast.error(`❌ ${message}`);
    } finally {
      setResending(false);
    }
  };

  const handleCopyWamid = (wamid: string) => {
    navigator.clipboard.writeText(wamid);
    setCopiedWamid(wamid);
    toast.success('ID Meta copiado al portapapeles');
    setTimeout(() => setCopiedWamid(null), 2500);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Fecha no disponible';
    try {
      const parsed = parseISO(dateString);
      return format(parsed, "EEEE d 'de' MMMM 'de' yyyy, HH:mm:ss", { locale: es });
    } catch {
      return dateString;
    }
  };

  const renderStatusBadge = (status?: string) => {
    const norm = (status || 'SENT').toUpperCase();
    switch (norm) {
      case 'READ':
        return <Badge bg="success" className="px-2 py-1"><FaCheckCircle className="me-1" /> Leído por la clienta (Doble check)</Badge>;
      case 'DELIVERED':
        return <Badge bg="info" text="dark" className="px-2 py-1"><FaCheckCircle className="me-1" /> Entregado en el teléfono</Badge>;
      case 'FAILED':
        return <Badge bg="danger" className="px-2 py-1"><FaExclamationCircle className="me-1" /> Falló al entregar</Badge>;
      case 'SENT':
      default:
        return <Badge bg="primary" className="px-2 py-1"><FaPaperPlane className="me-1" /> Enviado a Meta Cloud API</Badge>;
    }
  };

  return (
    <Modal show={show} onHide={onClose} size="lg" centered>
      <Modal.Header closeButton className="bg-light">
        <Modal.Title className="h5 mb-0">
          📨 Historial de Mensajes - Cita #{appointmentId}
        </Modal.Title>
      </Modal.Header>

      <Modal.Body className="p-3">
        {/* Cabecera informativa */}
        <div className="d-flex flex-wrap justify-content-between align-items-center mb-3 p-3 bg-light rounded border">
          <div>
            <div className="fw-bold text-dark">
              Clienta: <span className="text-primary">{customerName || 'No especificada'}</span>
            </div>
            <div className="small text-muted">
              Teléfono: <span className="fw-semibold">{customerPhone || 'Sin teléfono registrado'}</span>
            </div>
          </div>
          <div className="mt-2 mt-md-0 d-flex gap-2">
            <Button
              variant="outline-secondary"
              size="sm"
              onClick={fetchLogs}
              disabled={loading}
              title="Actualizar historial"
            >
              <FaSyncAlt className={loading ? 'fa-spin me-1' : 'me-1'} /> Refrescar
            </Button>
            <Button
              variant="success"
              size="sm"
              onClick={handleResendConfirmation}
              disabled={resending || !customerPhone}
              title="Reenviar mensaje oficial de confirmación"
            >
              {resending ? (
                <>
                  <Spinner size="sm" animation="border" className="me-1" /> Reenviando...
                </>
              ) : (
                <>
                  <FaWhatsapp className="me-1" /> Reenviar Confirmación
                </>
              )}
            </Button>
          </div>
        </div>

        {error && (
          <Alert variant="danger" className="py-2 small">
            {error}
          </Alert>
        )}

        {loading ? (
          <div className="text-center py-5">
            <Spinner animation="border" variant="primary" />
            <div className="mt-2 text-muted small">Cargando registro de mensajes...</div>
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-5 border rounded bg-white">
            <div className="display-6 text-muted mb-2">📭</div>
            <div className="fw-semibold text-secondary">Aún no hay mensajes registrados para esta cita</div>
            <p className="text-muted small mb-3">
              Puedes enviar una confirmación manual usando el botón verde de arriba.
            </p>
          </div>
        ) : (
          <div className="d-flex flex-column gap-3" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
            {logs.map((log) => (
              <Card key={log.id} className="border shadow-sm">
                <Card.Header className="d-flex justify-content-between align-items-center bg-white py-2">
                  <div className="d-flex align-items-center gap-2">
                    {log.channel === 'WHATSAPP' ? (
                      <Badge bg="success" className="d-flex align-items-center gap-1">
                        <FaWhatsapp /> WhatsApp
                      </Badge>
                    ) : (
                      <Badge bg="primary" className="d-flex align-items-center gap-1">
                        <FaEnvelope /> Email
                      </Badge>
                    )}
                    <span className="fw-bold small text-dark">
                      {log.subject || (log.channel === 'WHATSAPP' ? 'Mensaje WhatsApp' : 'Correo')}
                    </span>
                  </div>
                  <div>
                    {renderStatusBadge(log.status)}
                  </div>
                </Card.Header>

                <Card.Body className="py-2 px-3 small">
                  <div className="row g-2 mb-2">
                    <div className="col-12 col-md-6">
                      <span className="text-muted">Destinatario:</span>{' '}
                      <span className="fw-semibold text-dark">{log.recipient}</span>
                    </div>
                    <div className="col-12 col-md-6 text-md-end">
                      <span className="text-muted">Fecha de envío:</span>{' '}
                      <span className="text-dark">{formatDate(log.createdAt)}</span>
                    </div>
                  </div>

                  {log.content && (
                    <div className="p-2 bg-light rounded border mb-2 font-monospace" style={{ fontSize: '0.82rem', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                      {log.content}
                    </div>
                  )}

                  {log.wamid && (
                    <div className="d-flex align-items-center justify-content-between p-1 px-2 bg-light rounded text-muted border" style={{ fontSize: '0.75rem' }}>
                      <span className="font-monospace text-truncate me-2" title={log.wamid}>
                        <strong>Meta ID:</strong> {log.wamid}
                      </span>
                      <Button
                        variant="link"
                        size="sm"
                        className="p-0 text-muted"
                        onClick={() => handleCopyWamid(log.wamid!)}
                        title="Copiar comprobante Meta ID"
                      >
                        {copiedWamid === log.wamid ? (
                          <span className="text-success"><FaCheck className="me-1" /> Copiado</span>
                        ) : (
                          <span><FaCopy className="me-1" /> Copiar</span>
                        )}
                      </Button>
                    </div>
                  )}
                </Card.Body>
              </Card>
            ))}
          </div>
        )}
      </Modal.Body>

      <Modal.Footer className="py-2 bg-light">
        <Button variant="secondary" size="sm" onClick={onClose}>
          Cerrar
        </Button>
      </Modal.Footer>
    </Modal>
  );
};
