import React, { useState, useEffect } from 'react';
import { FiUser, FiMail, FiLock, FiCheck, FiX } from 'react-icons/fi';
import { User, CreateUserFormData, UpdateUserFormData } from '../../types/user.types';
import { Modal, Button, Input, Select, Alert } from '../ui';

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
  const [role, setRole] = useState('SPECIALIST');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user) {
      setUsername(user.username);
      setFullName(user.fullName);
      setEmail(user.email || '');
      setRole(user.role ? user.role.replace('ROLE_', '').toUpperCase() : 'SPECIALIST');
      setPassword('');
    } else {
      setUsername('');
      setFullName('');
      setEmail('');
      setRole('SPECIALIST');
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
          role,
        });
      } else {
        await onSave({
          username: username.trim(),
          fullName: fullName.trim(),
          email: email.trim() || undefined,
          password,
          role,
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
    <Modal show={show} onHide={onHide} size="md" centered>
      <Modal.Header closeButton>
        <Modal.Title>
          {isEditing ? '✏️ Editar Usuario' : '➕ Nuevo Usuario del Personal'}
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
            label="Nombre de Usuario (Login)"
            placeholder="Ej: manicurista1"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            disabled={isEditing}
            leftIcon={<FiUser className="text-sm" />}
            required
          />

          <Input
            label="Nombre Completo"
            placeholder="Ej: Camila Silva"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
          />

          <Select
            label="Rol y Nivel de Acceso"
            value={role}
            onChange={(e) => setRole(e.target.value)}
          >
            <option value="SPECIALIST">💅 Especialista / Manicurista (Agenda y clientas propias)</option>
            <option value="RECEPTIONIST">🛎️ Recepcionista (Citas, clientes, caja y solicitudes)</option>
            <option value="SALON_ADMIN">🏢 Dueña / Administradora (Control total del salón)</option>
          </Select>

          <Input
            type="email"
            label="Correo Electrónico (Opcional)"
            placeholder="camila@bunnycure.cl"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            leftIcon={<FiMail className="text-sm" />}
          />

          {!isEditing && (
            <Input
              type="password"
              label="Contraseña Inicial"
              placeholder="Mínimo 8 caracteres (mayúscula, minúscula y número)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              helperText="Debe contener mayúscula, minúscula y al menos un dígito."
              leftIcon={<FiLock className="text-sm" />}
              required
            />
          )}
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
            {isEditing ? 'Actualizar' : 'Crear Usuario'}
          </Button>
        </Modal.Footer>
      </form>
    </Modal>
  );
};

export default UserFormModal;
