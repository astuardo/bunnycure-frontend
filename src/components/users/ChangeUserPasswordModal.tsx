import React, { useState, useEffect } from 'react';
import { Modal, Button, Form, Alert } from 'react-bootstrap';
import { FiLock, FiCheck, FiX } from 'react-icons/fi';
import { User, ChangeUserPasswordFormData } from '../../types/user.types';

interface ChangeUserPasswordModalProps {
  show: boolean;
  user: User | null;
  onHide: () => void;
  onSave: (userId: number, data: ChangeUserPasswordFormData) => Promise<void>;
}

export const ChangeUserPasswordModal: React.FC<ChangeUserPasswordModalProps> = ({
  show,
  user,
  onHide,
  onSave,
}) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setNewPassword('');
    setConfirmPassword('');
    setError(null);
  }, [show, user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!user) return;

    if (!newPassword || newPassword.length < 8) {
      setError('La nueva contraseña debe tener al menos 8 caracteres');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('La nueva contraseña y la confirmación no coinciden');
      return;
    }

    const hasUpper = /[A-Z]/.test(newPassword);
    const hasLower = /[a-z]/.test(newPassword);
    const hasDigit = /\d/.test(newPassword);
    if (!hasUpper || !hasLower || !hasDigit) {
      setError('La contraseña debe contener al menos una mayúscula, una minúscula y un número');
      return;
    }

    try {
      setSubmitting(true);
      await onSave(user.id, { newPassword, confirmPassword });
      onHide();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al cambiar contraseña';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton style={{ background: '#fdf6f3', borderBottom: '1px solid #eed0c5' }}>
        <Modal.Title style={{ color: '#422314', fontSize: '1.15rem', fontWeight: 700 }}>
          🔐 Cambiar Contraseña de {user?.fullName || user?.username}
        </Modal.Title>
      </Modal.Header>

      <Form onSubmit={handleSubmit}>
        <Modal.Body className="p-4">
          {error && <Alert variant="danger" className="py-2 small">{error}</Alert>}

          <Form.Group className="mb-3">
            <Form.Label className="small fw-bold text-muted">
              <FiLock className="me-1" /> Nueva Contraseña
            </Form.Label>
            <Form.Control
              type="password"
              placeholder="Mínimo 8 caracteres (mayúscula, minúscula y número)"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              style={{ borderRadius: '8px', borderColor: '#eed0c5' }}
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label className="small fw-bold text-muted">
              <FiLock className="me-1" /> Confirmar Nueva Contraseña
            </Form.Label>
            <Form.Control
              type="password"
              placeholder="Repetir nueva contraseña"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              style={{ borderRadius: '8px', borderColor: '#eed0c5' }}
            />
          </Form.Group>
        </Modal.Body>

        <Modal.Footer style={{ background: '#fdf6f3', borderTop: '1px solid #eed0c5' }}>
          <Button variant="secondary" onClick={onHide} disabled={submitting} style={{ borderRadius: '8px' }}>
            <FiX className="me-1" /> Cancelar
          </Button>
          <Button
            type="submit"
            disabled={submitting}
            style={{ borderRadius: '8px', background: '#c9897a', borderColor: '#c9897a', color: '#fff' }}
          >
            {submitting ? 'Guardando...' : <><FiCheck className="me-1" /> Cambiar Contraseña</>}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
};

export default ChangeUserPasswordModal;
