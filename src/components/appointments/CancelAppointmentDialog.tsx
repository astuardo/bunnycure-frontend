/**
 * CancelAppointmentDialog - Modal para cancelar cita con motivo obligatorio
 * y diferenciación de origen (Clienta vs Manicurista / Salón)
 */

import { useState } from 'react';
import { Modal, Button, Form } from 'react-bootstrap';
import { AlertCircle } from 'lucide-react';

export type CancelledByOption = 'CUSTOMER' | 'MANICURIST';

interface CancelAppointmentDialogProps {
  show: boolean;
  appointmentId?: number;
  customerName?: string;
  appointmentDate?: string;
  appointmentTime?: string;
  onConfirm: (reason: string, cancelledBy: CancelledByOption) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

const CUSTOMER_REASONS = [
  'Clienta avisó cambio de planes',
  'No se presentó (No-show)',
  'Problema de horario / retraso',
  'Enfermedad de la clienta',
];

const MANICURIST_REASONS = [
  'Emergencia personal / imprevisto',
  'Enfermedad / Licencia médica',
  'Problema operativo en salón',
  'Fuerza mayor',
];

export function CancelAppointmentDialog({
  show,
  customerName = 'Sin nombre',
  appointmentDate = '',
  appointmentTime = '',
  onConfirm,
  onCancel,
  isLoading = false,
}: CancelAppointmentDialogProps) {
  const [isManicurist, setIsManicurist] = useState(false);
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  const handleConfirm = async () => {
    if (!reason.trim()) {
      setError('Debes indicar un motivo para la cancelación');
      return;
    }

    try {
      setError('');
      await onConfirm(reason.trim(), isManicurist ? 'MANICURIST' : 'CUSTOMER');
      setReason('');
      setIsManicurist(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cancelar la cita');
    }
  };

  const handleClose = () => {
    setReason('');
    setIsManicurist(false);
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

        {/* Checkbox Origen de Cancelación */}
        <div
          style={{
            background: isManicurist ? '#fff8f0' : '#f8f9fa',
            border: `1px solid ${isManicurist ? '#f5cfb3' : '#e9ecef'}`,
            borderRadius: '8px',
            padding: '12px 14px',
            marginBottom: '16px',
            transition: 'all 0.2s ease',
          }}
        >
          <Form.Check
            type="checkbox"
            id="cancel-by-manicurist-checkbox"
            label={
              <span
                style={{
                  fontWeight: 600,
                  fontSize: '13.5px',
                  color: isManicurist ? '#9a3412' : '#374151',
                  cursor: 'pointer',
                }}
              >
                Cancelación por parte de la manicurista / salón
              </span>
            }
            checked={isManicurist}
            onChange={(e) => {
              setIsManicurist(e.target.checked);
              if (error) setError('');
            }}
            disabled={isLoading}
          />
          <div
            style={{
              fontSize: '12px',
              color: isManicurist ? '#b45309' : '#6c757d',
              marginTop: '4px',
              marginLeft: '24px',
              lineHeight: '1.4',
            }}
          >
            {isManicurist
              ? '⚠️ Cancelación atribuida a la manicurista o al salón. No penalizará el historial ni alertas de la clienta.'
              : 'Cancelación atribuida a la clienta (inconveniente personal, no-show o aviso de inasistencia).'}
          </div>
        </div>

        {/* Chips de motivos frecuentes */}
        <div style={{ marginBottom: '14px' }}>
          <div
            style={{
              fontSize: '11px',
              fontWeight: 600,
              color: '#6c757d',
              marginBottom: '6px',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
            }}
          >
            Motivos frecuentes ({isManicurist ? '💅 Manicurista / Salón' : '👤 Clienta'}):
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {(isManicurist ? MANICURIST_REASONS : CUSTOMER_REASONS).map((quick) => {
              const isSelected = reason === quick;
              return (
                <button
                  key={quick}
                  type="button"
                  disabled={isLoading}
                  onClick={() => {
                    setReason(quick);
                    if (error) setError('');
                  }}
                  style={{
                    background: isSelected
                      ? isManicurist
                        ? '#fed7aa'
                        : '#fce4e4'
                      : '#fff',
                    border: `1px solid ${
                      isSelected
                        ? isManicurist
                          ? '#ea580c'
                          : '#dc3545'
                        : '#dee2e6'
                    }`,
                    color: isSelected
                      ? isManicurist
                        ? '#7c2d12'
                        : '#7c1c1c'
                      : '#4b5563',
                    borderRadius: '999px',
                    padding: '3px 10px',
                    fontSize: '11.5px',
                    fontWeight: isSelected ? 600 : 400,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {quick}
                </button>
              );
            })}
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
            rows={3}
            placeholder={
              isManicurist
                ? 'Ej: Emergencia personal, imprevisto de salud, problema operativo...'
                : 'Ej: Clienta avisó cambio de planes, problema de horario, no-show...'
            }
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
              minHeight: '80px',
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
          Cerrar
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
