/**
 * CancelAppointmentDialog - Modal para cancelar cita con motivo obligatorio
 */

import { useState } from 'react';
import { Modal, Button, Form } from 'react-bootstrap';
import { AlertCircle } from 'lucide-react';

interface CancelAppointmentDialogProps {
  show: boolean;
  appointmentId?: number;
  customerName?: string;
  appointmentDate?: string;
  appointmentTime?: string;
  onConfirm: (reason: string) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export function CancelAppointmentDialog({
  show,
  customerName = 'Sin nombre',
  appointmentDate = '',
  appointmentTime = '',
  onConfirm,
  onCancel,
  isLoading = false,
}: CancelAppointmentDialogProps) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  const handleConfirm = async () => {
    if (!reason.trim()) {
      setError('Debes indicar un motivo para la cancelación');
      return;
    }

    try {
      setError('');
      await onConfirm(reason.trim());
      setReason('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cancelar la cita');
    }
  };

  const handleClose = () => {
    setReason('');
    setError('');
    onCancel();
  };

  return (
    <Modal show={show} onHide={handleClose} centered>
      <Modal.Header closeButton className="border-0" style={{ paddingBottom: '0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%' }}>
          <AlertCircle size={22} style={{ color: '#dc3545', flexShrink: 0 }} />
          <Modal.Title style={{ fontSize: '16px', fontWeight: 600, margin: 0 }}>
            Cancelar Cita
          </Modal.Title>
        </div>
      </Modal.Header>

      <Modal.Body style={{ paddingTop: '20px' }}>
        {/* Appointment Details */}
        <div
          style={{
            background: '#fce4e4',
            border: '1px solid #f5bfbf',
            borderRadius: '8px',
            padding: '12px',
            marginBottom: '16px',
            fontSize: '13px',
            color: '#7c1c1c',
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: '4px' }}>{customerName}</div>
          <div style={{ opacity: 0.9 }}>
            {appointmentDate} a las {appointmentTime}
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div
            style={{
              background: '#f8d7da',
              border: '1px solid #f5c6cb',
              borderRadius: '6px',
              padding: '10px 12px',
              marginBottom: '16px',
              fontSize: '13px',
              color: '#721c24',
            }}
          >
            {error}
          </div>
        )}

        {/* Reason Field */}
        <Form.Group>
          <Form.Label style={{ fontWeight: 600, fontSize: '13px', marginBottom: '8px' }}>
            Motivo de cancelación *
          </Form.Label>
          <Form.Control
            as="textarea"
            rows={4}
            placeholder="Ej: Cliente canceló, problema de horario, cambió de opinión..."
            value={reason}
            onChange={(e) => {
              setReason(e.target.value);
              if (error) setError('');
            }}
            style={{
              fontSize: '13px',
              fontFamily: 'inherit',
              borderColor: error ? '#dc3545' : '#ddd',
              borderRadius: '6px',
              minHeight: '100px',
              resize: 'vertical',
            }}
            disabled={isLoading}
          />
          <div
            style={{
              fontSize: '12px',
              color: '#6c757d',
              marginTop: '6px',
            }}
          >
            {reason.length} caracteres
          </div>
        </Form.Group>
      </Modal.Body>

      <Modal.Footer style={{ borderTop: '1px solid #e9ecef', paddingTop: '16px' }}>
        <Button
          variant="secondary"
          onClick={handleClose}
          disabled={isLoading}
          style={{ fontSize: '13px' }}
        >
          Cancelar
        </Button>
        <Button
          variant="danger"
          onClick={handleConfirm}
          disabled={isLoading || !reason.trim()}
          style={{ fontSize: '13px' }}
        >
          {isLoading ? 'Cancelando...' : 'Confirmar Cancelación'}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
