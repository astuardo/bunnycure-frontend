import { Customer } from '../../types/customer.types';
import { Modal, Button, Alert } from '../ui';

interface DeleteCustomerModalProps {
  show: boolean;
  onHide: () => void;
  customer: Customer | null;
  onConfirm: () => Promise<void>;
  loading?: boolean;
}

export default function DeleteCustomerModal({
  show,
  onHide,
  customer,
  onConfirm,
  loading = false,
}: DeleteCustomerModalProps) {
  if (!customer) return null;

  return (
    <Modal show={show} onHide={onHide} size="sm" centered backdrop="static">
      <Modal.Header closeButton>
        <Modal.Title>🗑️ Confirmar Eliminación</Modal.Title>
      </Modal.Header>
      <Modal.Body className="space-y-3">
        <p className="text-sm text-bunny-text leading-relaxed m-0">
          ¿Estás seguro que deseas eliminar al cliente{' '}
          <strong className="text-bunny-cocoa">{customer.fullName}</strong>?
        </p>
        <Alert variant="warning">
          <small className="text-xs">
            ⚠️ <strong>Advertencia:</strong> Esta acción no se puede deshacer. Se eliminarán todos los datos del cliente.
          </small>
        </Alert>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="outline" size="sm" onClick={onHide} disabled={loading}>
          Cancelar
        </Button>
        <Button
          variant="danger"
          size="sm"
          onClick={onConfirm}
          disabled={loading}
          isLoading={loading}
          loadingText="Eliminando..."
        >
          🗑️ Eliminar Cliente
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
