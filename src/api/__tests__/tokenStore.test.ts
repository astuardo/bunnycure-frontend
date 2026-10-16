import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/** window mínimo para el entorno node de Vitest: eventos + localStorage en memoria. */
class FakeStorage {
  private data = new Map<string, string>();
  getItem(key: string) {
    return this.data.has(key) ? (this.data.get(key) as string) : null;
  }
  setItem(key: string, value: string) {
    this.data.set(key, String(value));
  }
  removeItem(key: string) {
    this.data.delete(key);
  }
  values() {
    return [...this.data.values()];
  }
}

let fakeWindow: EventTarget & { localStorage: FakeStorage };

describe('tokenStore: access token solo en memoria', () => {
  beforeEach(() => {
    vi.resetModules();
    fakeWindow = Object.assign(new EventTarget(), { localStorage: new FakeStorage() });
    vi.stubGlobal('window', fakeWindow);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('no persiste el token en localStorage', async () => {
    const { setInMemoryToken, getInMemoryToken } = await import('../tokenStore');

    setInMemoryToken('jwt-de-prueba');

    expect(getInMemoryToken()).toBe('jwt-de-prueba');
    expect(fakeWindow.localStorage.values()).not.toContain('jwt-de-prueba');
  });

  it('elimina el token que dejaron versiones anteriores y no lo reutiliza', async () => {
    fakeWindow.localStorage.setItem('bunnycure-access-token', 'token-antiguo');

    const { getInMemoryToken } = await import('../tokenStore');

    expect(getInMemoryToken()).toBeNull();
    expect(fakeWindow.localStorage.getItem('bunnycure-access-token')).toBeNull();
  });

  it('notifica los cambios (el registro de push escucha el inicio y cierre de sesión)', async () => {
    const { setInMemoryToken, clearInMemoryToken } = await import('../tokenStore');
    const listener = vi.fn();
    fakeWindow.addEventListener('bunnycure-access-token-changed', listener);

    setInMemoryToken('a');
    clearInMemoryToken();

    expect(listener).toHaveBeenCalledTimes(2);
  });
});
