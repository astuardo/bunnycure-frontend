import { useEffect, useState } from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { registerConfirmHost, type PendingConfirm } from './confirmDialog';

export const ConfirmDialogHost = () => {
  const [pending, setPending] = useState<PendingConfirm | null>(null);

  useEffect(() => {
    registerConfirmHost((request) =>
      setPending((current) => {
        // Un diálogo a la vez: el anterior se da por cancelado
        current?.resolve(false);
        return request;
      }));
    return () => {
      registerConfirmHost(null);
    };
  }, []);

  const close = (confirmed: boolean) => {
    pending?.resolve(confirmed);
    setPending(null);
  };

  return (
    <Modal show={pending !== null} onHide={() => close(false)} size="sm">
      {pending && (
        <>
          <Modal.Header>
            <Modal.Title>{pending.title ?? 'Confirmar acción'}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <p className="text-sm whitespace-pre-line">{pending.message}</p>
          </Modal.Body>
          <Modal.Footer>
            {/* Cancelar primero: es el foco inicial, así Enter no confirma una acción destructiva por accidente */}
            <Button variant="outline" size="sm" onClick={() => close(false)}>
              {pending.cancelLabel ?? 'Cancelar'}
            </Button>
            <Button variant={pending.tone === 'danger' ? 'danger' : 'primary'} size="sm" onClick={() => close(true)}>
              {pending.confirmLabel ?? 'Confirmar'}
            </Button>
          </Modal.Footer>
        </>
      )}
    </Modal>
  );
};
