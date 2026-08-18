import React, { useState, useEffect } from 'react';
import { Modal, Button, Form, Alert } from 'react-bootstrap';
import { FiUser, FiMail, FiLock, FiCheck, FiX } from 'react-icons/fi';
import { User, CreateUserFormData, UpdateUserFormData } from '../../types/user.types';

interface UserFormModalProps {
  show: boolean;
  user: User | null;
  onHide: () => void;
  onSave: (data: CreateUserFormData | UpdateUserFormData) => Promise<void>;
}

export const UserFormModal: React.FC<UserFormModalProps> = ({
  show,
  user,
  onHide,
  onSave,
}) => {
  const isEditing = !!user;

  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user) {
      setUsername(user.username);
      setFullName(user.fullName);
      setEmail(user.email || '');
      setPassword('');
    } else {
      setUsername('');
      setFullName('');
      setEmail('');
      setPassword('');
    }
    setError(null);
  }, [user, show]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!username.trim()) {
      setError('El nombre de usuario es obligatorio');
      return;
    }
    if (!fullName.trim()) {
      setError('El nombre completo es obligatorio');
      return;
    }

    if (!isEditing) {
      if (!password || password.length < 8) {
        setError('La contraseña debe tener al menos 8 caracteres');
        return;
      }
      const hasUpper = /[A-Z]/.test(password);
      const hasLower = /[a-z]/.test(password);
      const hasDigit = /\d/.test(password);
      if (!hasUpper || !hasLower || !hasDigit) {
        setError('La contraseña debe contener al menos una mayúscula, una minúscula y un número');
        return;
      }
    }

    try {
      setSubmitting(true);
      if (isEditing) {
        await onSave({
          username: username.trim(),
          fullName: fullName.trim(),
          email: email.trim() || undefined,
          role: user.role,
        });
      } else {
        await onSave({
          username: username.trim(),
          fullName: fullName.trim(),
          email: email.trim() || undefined,
          password,
        });
      }
      onHide();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al guardar usuario';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton style={{ background: '#fdf6f3', borderBottom: '1px solid #eed0c5' }}>
        <Modal.Title style={{ color: '#422314', fontSize: '1.15rem', fontWeight: 700 }}>
          {isEditing ? '✏️ Editar Usuario' : '➕ Nuevo Usuario del Personal'}
        </Modal.Title>
      </Modal.Header>

      <Form onSubmit={handleSubmit}>
        <Modal.Body className="p-4">
          {error && <Alert variant="danger" className="py-2 small">{error}</Alert>}

          <Form.Group className="mb-3">
            <Form.Label className="small fw-bold text-muted">
              <FiUser className="me-1" /> Nombre de Usuario (Login)
            </Form.Label>
            <Form.Control
              type="text"
              placeholder="Ej: manicurista1"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={isEditing}
              required
              style={{ borderRadius: '8px', borderColor: '#eed0c5' }}
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label className="small fw-bold text-muted">Nombre Completo</Form.Label>
            <Form.Control
              type="text"
              placeholder="Ej: Camila Silva"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              style={{ borderRadius: '8px', borderColor: '#eed0c5' }}
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label className="small fw-bold text-muted">
              <FiMail className="me-1" /> Correo Electrónico (Opcional)
            </Form.Label>
            <Form.Control
              type="email"
              placeholder="camila@bunnycure.cl"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{ borderRadius: '8px', borderColor: '#eed0c5' }}
            />
          </Form.Group>

          {!isEditing && (
            <Form.Group className="mb-3">
              <Form.Label className="small fw-bold text-muted">
                <FiLock className="me-1" /> Contraseña Inicial
              </Form.Label>
              <Form.Control
                type="password"
                placeholder="Mínimo 8 caracteres (mayúscula, minúscula y número)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={{ borderRadius: '8px', borderColor: '#eed0c5' }}
              />
              <Form.Text className="text-muted" style={{ fontSize: '11.5px' }}>
                Debe tener mayúscula, minúscula y al menos un dígito.
              </Form.Text>
            </Form.Group>
          )}
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
            {submitting ? 'Guardando...' : <><FiCheck className="me-1" /> {isEditing ? 'Actualizar' : 'Crear Usuario'}</>}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
};

export default UserFormModal;
