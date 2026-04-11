import React from 'react';
import { Modal, Button } from 'react-bootstrap';

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
  return (
      <Modal show={show} onHide={onCancel} centered className="bunny-modal confirm-dialog-modal">
        <Modal.Header closeButton>
          <Modal.Title>{title}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>{message}</p>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={onCancel} disabled={loading}>
            {cancelText}
          </Button>
          <Button variant={variant} onClick={onConfirm} disabled={loading}>
            {loading ? 'Procesando...' : confirmText}
          </Button>
        </Modal.Footer>
      </Modal>
  );
};
