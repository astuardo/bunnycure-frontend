import { create } from 'zustand';
import { Customer, CustomerFormData } from '../types/customer.types';
import { customersApi } from '../api/customers.api';
import { toast } from 'react-toastify';

interface CustomersState {
    customers: Customer[];
    currentCustomer: Customer | null;
    loading: boolean;
    error: string | null;
    
    // Actions
    fetchCustomers: (search?: string) => Promise<void>;
    fetchCustomerById: (id: number) => Promise<void>;
    createCustomer: (data: CustomerFormData) => Promise<Customer | null>;
    updateCustomer: (id: number, data: CustomerFormData) => Promise<Customer | null>;
    deleteCustomer: (id: number) => Promise<boolean>;
    adjustCustomerLoyalty: (id: number, delta: number) => Promise<Customer | null>;
    clearCurrentCustomer: () => void;
    clearError: () => void;
}

export const useCustomersStore = create<CustomersState>((set) => ({
    customers: [],
    currentCustomer: null,
    loading: false,
    error: null,

    fetchCustomers: async (search?: string) => {
        set({ loading: true, error: null });
        try {
            console.log('📡 Fetching customers...', search ? `search="${search}"` : 'all');
            const customers = await customersApi.list(search);
            console.log(`✅ Loaded ${customers.length} customers`);
            set({ customers, loading: false });
        } catch (error) {
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
            
            // Agregar a la lista
            set((state) => ({
                customers: [newCustomer, ...state.customers],
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
            
            // Actualizar en la lista
            set((state) => ({
                customers: state.customers.map((c) => 
                    c.id === id ? updatedCustomer : c
                ),
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
            
            // Remover de la lista
            set((state) => ({
                customers: state.customers.filter((c) => c.id !== id),
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
            
            // Actualizar en la lista y en el actual
            set((state) => {
                const updatedCustomers = state.customers.map((c) => 
                    c.id === id ? updatedCustomer : c
                );
                
                // Si el cliente actualizado es el que estamos viendo en detalles, lo actualizamos también
                const currentCustomer = state.currentCustomer?.id === id ? updatedCustomer : state.currentCustomer;
                
                return {
                    customers: updatedCustomers,
                    currentCustomer,
                    loading: false
                };
            });
            
            toast.success(delta > 0 ? `Sello(s) agregado(s)` : `Sello(s) removido(s)`);
            return updatedCustomer;
        } catch (error: any) {
            const errorMessage = error.response?.data?.message || 'Error al ajustar sellos';
            set({ error: errorMessage, loading: false });
            toast.error(errorMessage);
            return null;
        }
    },

    clearCurrentCustomer: () => set({ currentCustomer: null }),
    
    clearError: () => set({ error: null }),
}));
