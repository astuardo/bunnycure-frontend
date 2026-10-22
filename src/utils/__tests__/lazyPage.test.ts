import { describe, expect, it } from 'vitest';
import { loadPageModule } from '../lazyPage';

const PENDING = Symbol('pending');
const settleOrPending = <T>(p: Promise<T>) =>
  Promise.race([p, new Promise<typeof PENDING>((resolve) => setTimeout(() => resolve(PENDING), 20))]);

describe('loadPageModule', () => {
  it('devuelve el módulo cuando el chunk carga bien', async () => {
    const Page = () => null;
    await expect(loadPageModule(() => Promise.resolve({ default: Page }))).resolves.toEqual({ default: Page });
  });

  it('queda pendiente (sin romper React.lazy) si Vite resuelve el import con undefined mientras recarga', async () => {
    const result = await settleOrPending(loadPageModule(() => Promise.resolve(undefined)));
    expect(result).toBe(PENDING);
  });

  it('propaga el error si el chunk falla sin recarga en curso', async () => {
    const error = new TypeError('Failed to fetch dynamically imported module');
    await expect(loadPageModule(() => Promise.reject(error))).rejects.toBe(error);
  });
});
