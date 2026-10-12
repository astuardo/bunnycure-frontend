import React from 'react';
import { Modal, Button, ButtonVariant } from '../ui';

interface ConfirmDialogProps {
  show: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'primary' | 'danger' | 'warning' | 'success';
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  show,
  title,
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  variant = 'primary',
  onConfirm,
  onCancel,
  loading = false,
}) => {
  const buttonVariant: ButtonVariant = variant === 'danger' ? 'danger' : 'primary';

  return (
    <Modal show={show} onHide={onCancel} size="sm" centered>
      <Modal.Header closeButton>
        <Modal.Title>{title}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <p className="text-sm text-bunny-text leading-relaxed m-0">{message}</p>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="outline" size="sm" onClick={onCancel} disabled={loading}>
          {cancelText}
        </Button>
        <Button
          variant={buttonVariant}
          size="sm"
          onClick={onConfirm}
          isLoading={loading}
          loadingText="Procesando..."
        >
          {confirmText}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};
