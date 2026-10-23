import { afterEach, describe, expect, it } from 'vitest';
import { confirmDialog, registerConfirmHost, type PendingConfirm } from '../confirmDialog';

describe('confirmDialog', () => {
  afterEach(() => registerConfirmHost(null));

  it('pasa las opciones al host y resuelve con la respuesta', async () => {
    let received: PendingConfirm | null = null;
    registerConfirmHost((request) => {
      received = request;
      request.resolve(true);
    });

    await expect(confirmDialog({ message: '¿Eliminar?', tone: 'danger' })).resolves.toBe(true);
    expect(received).toMatchObject({ message: '¿Eliminar?', tone: 'danger' });
  });

  it('acepta un texto simple como mensaje', async () => {
    let message = '';
    registerConfirmHost((request) => {
      message = request.message;
      request.resolve(false);
    });

    await expect(confirmDialog('¿Seguro?')).resolves.toBe(false);
    expect(message).toBe('¿Seguro?');
  });
});
