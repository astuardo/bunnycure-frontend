import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Customer } from '../../types/customer.types';

const listPage = vi.fn();
const listAll = vi.fn();

vi.mock('../../api/customers.api', () => ({
  customersApi: {
    listPage: (...args: unknown[]) => listPage(...args),
    listAll: (...args: unknown[]) => listAll(...args),
  },
}));
vi.mock('react-toastify', () => ({ toast: { error: vi.fn(), success: vi.fn(), warning: vi.fn() } }));

const { useCustomersStore } = await import('../customersStore');

const customer = (id: number, fullName = `Clienta ${id}`) => ({ id, fullName }) as Customer;
const page = (ids: number[], total: number, hasMore: boolean) => ({ items: ids.map((id) => customer(id)), total, hasMore });

const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => (resolve = r));
  return { promise, resolve };
};

describe('customersStore: agenda paginada y directorio completo', () => {
  beforeEach(() => {
    listPage.mockReset();
    listAll.mockReset();
    useCustomersStore.setState({
      customers: [], totalCustomers: 0, customersQuery: '', customersPage: 0, hasMoreCustomers: false,
      loadingMore: false, directory: [], directoryLoaded: false, loadingDirectory: false, loading: false,
    });
  });

  it('carga la primera página y luego las siguientes sin duplicar', async () => {
    listPage.mockResolvedValueOnce(page([1, 2], 3, true)).mockResolvedValueOnce(page([2, 3], 3, false));

    await useCustomersStore.getState().fetchCustomers();
    await useCustomersStore.getState().loadMoreCustomers();

    const state = useCustomersStore.getState();
    expect(state.customers.map((c) => c.id)).toEqual([1, 2, 3]);
    expect(state.totalCustomers).toBe(3);
    expect(state.hasMoreCustomers).toBe(false);
    expect(listPage).toHaveBeenLastCalledWith(undefined, 1);
  });

  it('las páginas siguientes respetan la búsqueda actual', async () => {
    listPage.mockResolvedValueOnce(page([7], 2, true)).mockResolvedValueOnce(page([8], 2, false));

    await useCustomersStore.getState().fetchCustomers('  maria ');
    await useCustomersStore.getState().loadMoreCustomers();

    expect(listPage).toHaveBeenNthCalledWith(1, 'maria', 0);
    expect(listPage).toHaveBeenNthCalledWith(2, 'maria', 1);
  });

  it('descarta la respuesta de una búsqueda anterior que llega tarde', async () => {
    const slow = deferred<ReturnType<typeof page>>();
    listPage.mockReturnValueOnce(slow.promise).mockResolvedValueOnce(page([2], 1, false));

    const first = useCustomersStore.getState().fetchCustomers('mar');
    await useCustomersStore.getState().fetchCustomers('maria');
    slow.resolve(page([1], 1, false));
    await first;

    expect(useCustomersStore.getState().customers.map((c) => c.id)).toEqual([2]);
    expect(useCustomersStore.getState().customersQuery).toBe('maria');
  });

  it('el directorio carga todas las clientas una sola vez salvo que se fuerce', async () => {
    listAll.mockResolvedValue([customer(1), customer(2), customer(3)]);

    await Promise.all([useCustomersStore.getState().fetchDirectory(), useCustomersStore.getState().fetchDirectory()]);
    await useCustomersStore.getState().fetchDirectory();
    expect(listAll).toHaveBeenCalledTimes(1);
    expect(useCustomersStore.getState().directory).toHaveLength(3);

    await useCustomersStore.getState().fetchDirectory(true);
    expect(listAll).toHaveBeenCalledTimes(2);
  });
});
