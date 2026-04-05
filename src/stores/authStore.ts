/**
 * Store de autenticación con Zustand.
 * Maneja el estado del usuario autenticado.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '../api/auth.api';
import * as authApi from '../api/auth.api';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  setUser: (user: User | null) => void;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      login: async (username: string, password: string) => {
        set({ isLoading: true, error: null });
        try {
          // Login con Spring Security
          await authApi.login({ username, password });
          
          // Obtener datos del usuario
          const user = await authApi.getCurrentUser();
          
          set({ 
            user, 
            isAuthenticated: true, 
            isLoading: false,
            error: null 
          });
        } catch (error: any) {
          console.error('❌ Error en login:', error);
          set({ 
            user: null, 
            isAuthenticated: false, 
            isLoading: false,
            error: error.response?.data?.message || 'Credenciales inválidas'
          });
          throw error;
        }
      },

      logout: async () => {
        try {
          await authApi.logout();
        } catch (error) {
          console.error('Error al hacer logout:', error);
        } finally {
          set({ 
            user: null, 
            isAuthenticated: false, 
            error: null 
          });
        }
      },

      checkAuth: async () => {
        set({ isLoading: true });
        try {
          const user = await authApi.getCurrentUser();
          console.log('✅ Sesión válida:', user.username);
          set({ 
            user, 
            isAuthenticated: true, 
            isLoading: false 
          });
        } catch (error) {
          console.log('⚠️ Sin sesión activa, limpiando estado');
          // Sesión expiró o no existe - limpiar estado
          set({ 
            user: null, 
            isAuthenticated: false, 
            isLoading: false 
          });
        }
      },

      setUser: (user: User | null) => {
        set({ 
          user, 
          isAuthenticated: user !== null 
        });
      },

      clearError: () => {
        set({ error: null });
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ 
        // Solo persistir user e isAuthenticated
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
      // IMPORTANTE: Versión para forzar reset cuando cambie la estructura
      version: 1,
    }
  )
);
