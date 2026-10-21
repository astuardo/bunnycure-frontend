import { create } from 'zustand';
import { Customer, CustomerFormData } from '../types/customer.types';
import { customersApi } from '../api/customers.api';
import { toast } from 'react-toastify';

interface CustomersState {
    /** Agenda paginada: primera página de la búsqueda actual + las que se cargan al hacer scroll. */
    customers: Customer[];
    totalCustomers: number;
    customersQuery: string;
    customersPage: number;
    hasMoreCustomers: boolean;
    loadingMore: boolean;
    /** Todas las clientas del salón, para pantallas que calculan sobre el universo completo. */
    directory: Customer[];
    directoryLoaded: boolean;
    loadingDirectory: boolean;
    currentCustomer: Customer | null;
    loading: boolean;
    error: string | null;

    // Actions
    fetchCustomers: (search?: string) => Promise<void>;
    loadMoreCustomers: () => Promise<void>;
    fetchDirectory: (force?: boolean) => Promise<void>;
    fetchCustomerById: (id: number) => Promise<void>;
    createCustomer: (data: CustomerFormData) => Promise<Customer | null>;
    updateCustomer: (id: number, data: CustomerFormData) => Promise<Customer | null>;
    deleteCustomer: (id: number) => Promise<boolean>;
    adjustCustomerLoyalty: (id: number, delta: number) => Promise<Customer | null>;
    syncCustomerVisits: (id: number) => Promise<Customer | null>;
    syncAllCustomersVisits: () => Promise<boolean>;
    clearCurrentCustomer: () => void;
    clearError: () => void;
}

// Cada búsqueda incrementa este contador; las respuestas de búsquedas anteriores se descartan
// para que escribir rápido no deje en pantalla los resultados de una consulta vieja.
let customersRequestSeq = 0;
let directoryRequest: Promise<void> | null = null;

/** Reemplaza (o agrega) una clienta en una lista sin perder los campos que no vienen en la respuesta. */
const upsert = (list: Customer[], customer: Customer, prepend = false): Customer[] => {
    if (list.some((c) => c.id === customer.id)) {
        return list.map((c) => (c.id === customer.id ? { ...c, ...customer } : c));
    }
    return prepend ? [customer, ...list] : [...list, customer];
};

export const useCustomersStore = create<CustomersState>((set, get) => ({
    customers: [],
    totalCustomers: 0,
    customersQuery: '',
    customersPage: 0,
    hasMoreCustomers: false,
    loadingMore: false,
    directory: [],
    directoryLoaded: false,
    loadingDirectory: false,
    currentCustomer: null,
    loading: false,
    error: null,

    fetchCustomers: async (search?: string) => {
        const query = search?.trim() || '';
        const seq = ++customersRequestSeq;
        set({ loading: true, error: null, customersQuery: query });
        try {
            const { items, total, hasMore } = await customersApi.listPage(query || undefined, 0);
            if (seq !== customersRequestSeq) return;
            set({ customers: items, totalCustomers: total, customersPage: 0, hasMoreCustomers: hasMore, loading: false });
        } catch (error) {
            if (seq !== customersRequestSeq) return;
            const err = error as { response?: { status?: number; data?: { message?: string } } };
            const errorMessage = err.response?.data?.message || 'Error al cargar clientes';
            
            // Solo mostrar toast si NO es error de autenticación (401)
            // El interceptor ya maneja redirects de auth
            if (err.response?.status !== 401) {
                console.error('❌ Error fetching customers:', errorMessage);
                set({ error: errorMessage, loading: false });
                toast.error(errorMessage);
            } else {
                console.warn('⚠️ 401 en fetchCustomers - sesión expirada (interceptor manejará)');
                set({ loading: false });
            }
        }
    },

    loadMoreCustomers: async () => {
        const { hasMoreCustomers, loadingMore, loading, customersPage, customersQuery } = get();
        if (!hasMoreCustomers || loadingMore || loading) return;
        const seq = customersRequestSeq;
        set({ loadingMore: true });
        try {
            const nextPage = customersPage + 1;
            const { items, total, hasMore } = await customersApi.listPage(customersQuery || undefined, nextPage);
            if (seq !== customersRequestSeq) return;
            set((state) => ({
                customers: [...state.customers, ...items.filter((c) => !state.customers.some((e) => e.id === c.id))],
                totalCustomers: total,
                customersPage: nextPage,
                hasMoreCustomers: hasMore,
                loadingMore: false,
            }));
        } catch (error) {
            const err = error as { response?: { status?: number; data?: { message?: string } } };
            set({ loadingMore: false });
            if (err.response?.status !== 401) {
                toast.error(err.response?.data?.message || 'Error al cargar más clientas');
            }
        }
    },

    fetchDirectory: async (force = false) => {
        if (!force && get().directoryLoaded) return;
        if (directoryRequest) return directoryRequest;
        set({ loadingDirectory: true });
        directoryRequest = (async () => {
            try {
                const directory = await customersApi.listAll();
                set({ directory, directoryLoaded: true, loadingDirectory: false });
            } catch (error) {
                const err = error as { response?: { status?: number; data?: { message?: string } } };
                set({ loadingDirectory: false });
                if (err.response?.status !== 401) {
                    toast.error(err.response?.data?.message || 'Error al cargar el listado de clientas');
                }
            } finally {
                directoryRequest = null;
            }
        })();
        return directoryRequest;
    },

    fetchCustomerById: async (id: number) => {
        set({ loading: true, error: null });
        try {
            const customer = await customersApi.getById(id);
            set({ currentCustomer: customer, loading: false });
        } catch (error: any) {
            const errorMessage = error.response?.data?.message || 'Error al cargar cliente';
            set({ error: errorMessage, loading: false, currentCustomer: null });
            toast.error(errorMessage);
        }
    },

    createCustomer: async (data: CustomerFormData) => {
        set({ loading: true, error: null });
        try {
            const newCustomer = await customersApi.create(data);
            
            // Agregar a la agenda y al directorio
            set((state) => ({
                customers: upsert(state.customers, newCustomer, true),
                totalCustomers: state.totalCustomers + 1,
                directory: state.directoryLoaded ? upsert(state.directory, newCustomer, true) : state.directory,
                loading: false
            }));
            
            toast.success('Cliente creado exitosamente');
            return newCustomer;
        } catch (error: any) {
            // Si es error de autenticación, no mostrar toast (el interceptor redirige)
            if (error.response?.status === 401 || error.response?.status === 302) {
                console.log('Sesión expirada, redirigiendo a login...');
                return null;
            }
            
            const errorMessage = error.response?.data?.message || 'Error al crear cliente';
            set({ error: errorMessage, loading: false });
            toast.error(errorMessage);
            return null;
        }
    },

    updateCustomer: async (id: number, data: CustomerFormData) => {
        set({ loading: true, error: null });
        try {
            const updatedCustomer = await customersApi.update(id, data);
            
            // Actualizar en la agenda y en el directorio
            set((state) => ({
                customers: state.customers.map((c) => 
                    c.id === id ? updatedCustomer : c
                ),
                directory: state.directory.map((c) => (c.id === id ? updatedCustomer : c)),
                currentCustomer: updatedCustomer,
                loading: false
            }));
            
            toast.success('Cliente actualizado exitosamente');
            return updatedCustomer;
        } catch (error: any) {
            const errorMessage = error.response?.data?.message || 'Error al actualizar cliente';
            set({ error: errorMessage, loading: false });
            toast.error(errorMessage);
            return null;
        }
    },

    deleteCustomer: async (id: number) => {
        set({ loading: true, error: null });
        try {
            await customersApi.delete(id);
            
            // Remover de la agenda y del directorio
            set((state) => ({
                customers: state.customers.filter((c) => c.id !== id),
                totalCustomers: Math.max(0, state.totalCustomers - 1),
                directory: state.directory.filter((c) => c.id !== id),
                loading: false
            }));
            
            toast.success('Cliente eliminado exitosamente');
            return true;
        } catch (error: any) {
            const errorMessage = error.response?.data?.message || 'Error al eliminar cliente';
            set({ error: errorMessage, loading: false });
            toast.error(errorMessage);
            return false;
        }
    },

    adjustCustomerLoyalty: async (id: number, delta: number) => {
        set({ loading: true, error: null });
        try {
            const updatedCustomer = await customersApi.adjustLoyalty(id, delta);
            let walletSyncError: string | null = null;

            try {
                // Fuerza sincronización del objeto en Wallet y captura error real si falla.
                await customersApi.getGoogleWalletLinks(id);
            } catch (walletError) {
                const err = walletError as { response?: { data?: { message?: string } }; message?: string };
                walletSyncError = err.response?.data?.message || err.message || 'No se pudo sincronizar Google Wallet';
            }
            
            // Actualizar en la lista y en el actual
            set((state) => {
                const updatedCustomers = upsert(state.customers, updatedCustomer);
                
                const currentCustomer = state.currentCustomer?.id === id 
                    ? { ...state.currentCustomer, ...updatedCustomer } 
                    : (state.currentCustomer ?? updatedCustomer);
                
                return {
                    customers: updatedCustomers,
                    directory: state.directoryLoaded ? upsert(state.directory, updatedCustomer) : state.directory,
                    currentCustomer,
                    loading: false
                };
            });
            
            toast.success(delta > 0 ? `Sello(s) agregado(s)` : `Sello(s) removido(s)`);
            if (walletSyncError) {
                toast.warning(`Sellos actualizados, pero Wallet no se sincronizó: ${walletSyncError}`);
            }
            return updatedCustomer;
        } catch (error: any) {
            const errorMessage = error.response?.data?.message || 'Error al ajustar sellos';
            set({ error: errorMessage, loading: false });
            toast.error(errorMessage);
            return null;
        }
    },

    syncCustomerVisits: async (id: number) => {
        set({ loading: true, error: null });
        try {
            const updatedCustomer = await customersApi.syncVisits(id);
            set((state) => ({
                customers: state.customers.map((c) => (c.id === id ? { ...c, ...updatedCustomer } : c)),
                directory: state.directory.map((c) => (c.id === id ? { ...c, ...updatedCustomer } : c)),
                currentCustomer: state.currentCustomer?.id === id 
                    ? { ...state.currentCustomer, ...updatedCustomer }
                    : (state.currentCustomer ?? updatedCustomer),
                loading: false
            }));
            toast.success('Visitas sincronizadas correctamente con el historial de citas');
            return updatedCustomer;
        } catch (error: any) {
            const errorMessage = error.response?.data?.message || 'Error al sincronizar visitas';
            set({ error: errorMessage, loading: false });
            toast.error(errorMessage);
            return null;
        }
    },

    syncAllCustomersVisits: async () => {
        set({ loading: true, error: null });
        try {
            const result = await customersApi.syncAllVisits();
            set({ loading: false });
            await Promise.all([get().fetchCustomers(get().customersQuery), get().fetchDirectory(true)]);
            toast.success(`Sincronización completada: ${result.totalProcessed} clientes procesados (${result.updatedCount} actualizados).`);
            return true;
        } catch (error: any) {
            const errorMessage = error.response?.data?.message || 'Error al sincronizar todas las visitas';
            set({ error: errorMessage, loading: false });
            toast.error(errorMessage);
            return false;
        }
    },

    clearCurrentCustomer: () => set({ currentCustomer: null }),
    
    clearError: () => set({ error: null }),
}));
