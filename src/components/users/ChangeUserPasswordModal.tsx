import React, { useState, useEffect } from 'react';
import { FiLock, FiCheck, FiX } from 'react-icons/fi';
import { User, ChangeUserPasswordFormData } from '../../types/user.types';
import { Modal, Button, Input, Alert } from '../ui';

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
    <Modal show={show} onHide={onHide} size="md" centered>
      <Modal.Header closeButton>
        <Modal.Title>
          🔐 Cambiar Contraseña de {user?.fullName || user?.username}
        </Modal.Title>
      </Modal.Header>

      <form onSubmit={handleSubmit}>
        <Modal.Body className="space-y-4">
          {error && (
            <Alert variant="danger">
              {error}
            </Alert>
          )}

          <Input
            type="password"
            label="Nueva Contraseña"
            placeholder="Mínimo 8 caracteres (mayúscula, minúscula y número)"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            leftIcon={<FiLock className="text-sm" />}
            required
          />

          <Input
            type="password"
            label="Confirmar Nueva Contraseña"
            placeholder="Repetir nueva contraseña"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            leftIcon={<FiLock className="text-sm" />}
            required
          />
        </Modal.Body>

        <Modal.Footer>
          <Button variant="outline" size="sm" onClick={onHide} disabled={submitting}>
            <FiX className="mr-1" /> Cancelar
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="sm"
            isLoading={submitting}
            loadingText="Guardando..."
            leftIcon={<FiCheck />}
          >
            Cambiar Contraseña
          </Button>
        </Modal.Footer>
      </form>
    </Modal>
  );
};

export default ChangeUserPasswordModal;
