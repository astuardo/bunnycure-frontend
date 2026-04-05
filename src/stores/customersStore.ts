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
            const customers = await customersApi.list(search);
            set({ customers, loading: false });
        } catch (error: any) {
            const errorMessage = error.response?.data?.message || 'Error al cargar clientes';
            set({ error: errorMessage, loading: false });
            toast.error(errorMessage);
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

    clearCurrentCustomer: () => set({ currentCustomer: null }),
    
    clearError: () => set({ error: null }),
}));
