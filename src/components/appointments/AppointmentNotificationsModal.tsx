import React, { useEffect, useState, useCallback } from 'react';
import { FaWhatsapp, FaEnvelope, FaSyncAlt, FaPaperPlane, FaCheckCircle, FaExclamationCircle, FaCopy, FaCheck } from 'react-icons/fa';
import { appointmentsApi } from '../../api/appointments.api';
import { NotificationLogDto } from '../../types/appointment.types';
import { useToast } from '../../hooks/useToast';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Modal, Button, Badge, Spinner, Alert, Card } from '@/components/ui';

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
        return <Badge variant="success" className="px-2 py-0.5 text-xs"><FaCheckCircle className="mr-1 inline" /> Leído por la clienta</Badge>;
      case 'DELIVERED':
        return <Badge variant="info" className="px-2 py-0.5 text-xs"><FaCheckCircle className="mr-1 inline" /> Entregado</Badge>;
      case 'FAILED':
        return <Badge variant="danger" className="px-2 py-0.5 text-xs"><FaExclamationCircle className="mr-1 inline" /> Falló al entregar</Badge>;
      case 'RECEIVED':
        return <Badge variant="warning" className="px-2 py-0.5 text-xs"><FaCheckCircle className="mr-1 inline" /> Respuesta recibida</Badge>;
      case 'SENT':
      default:
        return <Badge variant="primary" className="px-2 py-0.5 text-xs"><FaPaperPlane className="mr-1 inline" /> Enviado</Badge>;
    }
  };

  return (
    <Modal show={show} onHide={onClose} size="lg" centered>
      <Modal.Header closeButton className="bg-slate-50 border-b border-slate-200">
        <Modal.Title>
          <span className="text-base font-bold text-slate-800">
            📨 Historial de Mensajes - Cita #{appointmentId}
          </span>
        </Modal.Title>
      </Modal.Header>

      <Modal.Body className="p-4 space-y-4">
        {/* Cabecera informativa */}
        <div className="flex flex-wrap justify-between items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
          <div>
            <div className="font-bold text-slate-800 text-sm">
              Clienta: <span className="text-bunny-primary">{customerName || 'No especificada'}</span>
            </div>
            <div className="text-xs text-slate-500 mt-0.5">
              Teléfono: <span className="font-semibold">{customerPhone || 'Sin teléfono registrado'}</span>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchLogs}
              disabled={loading}
              title="Actualizar historial"
              className="text-xs"
            >
              <FaSyncAlt className={loading ? 'animate-spin mr-1' : 'mr-1'} /> Refrescar
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleResendConfirmation}
              disabled={resending || !customerPhone}
              title="Reenviar mensaje oficial de confirmación"
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1.5"
            >
              {resending ? (
                <>
                  <Spinner size="sm" className="border-white mr-1" /> Reenviando...
                </>
              ) : (
                <>
                  <FaWhatsapp className="text-sm" /> Reenviar Confirmación
                </>
              )}
            </Button>
          </div>
        </div>

        {error && (
          <Alert variant="danger">
            {error}
          </Alert>
        )}

        {loading ? (
          <div className="text-center py-12">
            <Spinner size="lg" className="border-bunny-primary mx-auto" />
            <div className="mt-2 text-slate-400 text-xs">Cargando registro de mensajes...</div>
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-12 border border-slate-200 rounded-xl bg-white">
            <div className="text-4xl text-slate-300 mb-2">📭</div>
            <div className="font-semibold text-slate-600 text-sm">Aún no hay mensajes registrados para esta cita</div>
            <p className="text-slate-400 text-xs mt-1 mb-0 max-w-sm mx-auto">
              Puedes enviar una confirmación manual usando el botón verde de arriba.
            </p>
          </div>
        ) : (
          <div className="space-y-3 max-h-[60vh] overflow-y-auto">
            {logs.map((log) => (
              <Card key={log.id} className="border border-slate-200 shadow-sm bg-white overflow-hidden">
                <Card.Header className="flex justify-between items-center bg-white py-2 px-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    {log.channel === 'WHATSAPP' ? (
                      <Badge variant="success" className="inline-flex items-center gap-1 text-[11px]">
                        <FaWhatsapp /> WhatsApp
                      </Badge>
                    ) : (
                      <Badge variant="primary" className="inline-flex items-center gap-1 text-[11px]">
                        <FaEnvelope /> Email
                      </Badge>
                    )}
                    <span className="font-bold text-xs text-slate-800">
                      {log.subject || (log.channel === 'WHATSAPP' ? 'Mensaje WhatsApp' : 'Correo')}
                    </span>
                  </div>
                  <div>
                    {renderStatusBadge(log.status)}
                  </div>
                </Card.Header>

                <Card.Body className="py-2.5 px-3 text-xs space-y-2">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-1 text-xs">
                    <div>
                      <span className="text-slate-400">Destinatario:</span>{' '}
                      <span className="font-semibold text-slate-700">{log.recipient}</span>
                    </div>
                    <div className="md:text-right">
                      <span className="text-slate-400">Fecha de envío:</span>{' '}
                      <span className="text-slate-700">{formatDate(log.createdAt)}</span>
                    </div>
                  </div>

                  {log.content && (
                    <div className="p-2 bg-slate-50 rounded-lg border border-slate-100 font-mono text-xs whitespace-pre-wrap break-words leading-relaxed text-slate-800">
                      {log.content}
                    </div>
                  )}

                  {log.wamid && (
                    <div className="flex items-center justify-between p-1.5 px-2 bg-slate-50 rounded border border-slate-100 text-[11px] text-slate-500">
                      <span className="font-mono truncate mr-2" title={log.wamid}>
                        <strong>Meta ID:</strong> {log.wamid}
                      </span>
                      <button
                        type="button"
                        className="text-slate-500 hover:text-slate-800 text-xs shrink-0 flex items-center gap-1"
                        onClick={() => handleCopyWamid(log.wamid!)}
                        title="Copiar comprobante Meta ID"
                      >
                        {copiedWamid === log.wamid ? (
                          <span className="text-emerald-600 font-semibold flex items-center gap-1">
                            <FaCheck /> Copiado
                          </span>
                        ) : (
                          <span className="flex items-center gap-1">
                            <FaCopy /> Copiar
                          </span>
                        )}
                      </button>
                    </div>
                  )}
                </Card.Body>
              </Card>
            ))}
          </div>
        )}
      </Modal.Body>

      <Modal.Footer className="bg-slate-50 border-t border-slate-200">
        <div className="w-full flex justify-end">
          <Button variant="secondary" size="sm" onClick={onClose}>
            Cerrar
          </Button>
        </div>
      </Modal.Footer>
    </Modal>
  );
};

export default AppointmentNotificationsModal;
