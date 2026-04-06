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
  handleSessionExpired: () => void;
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
          // Login con API REST JSON
          const loginResponse = await authApi.login({ username, password });
          
          set({ 
            user: loginResponse.user, 
            isAuthenticated: true, 
            isLoading: false,
            error: null 
          });
          
          // TODO: Manejar requiresPasswordChange cuando se implemente
          if (loginResponse.requiresPasswordChange) {
            console.warn('⚠️ Usuario debe cambiar contraseña');
          }
          
        } catch (error: any) {
          console.error('❌ Error en login:', error);
          const errorMessage = error.response?.data?.error?.message 
            || error.message 
            || 'Credenciales inválidas';
          
          set({ 
            user: null, 
            isAuthenticated: false, 
            isLoading: false,
            error: errorMessage
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
          // Limpiar estado
          set({ 
            user: null, 
            isAuthenticated: false, 
            error: null 
          });
          
          // IMPORTANTE: Limpiar localStorage para forzar re-login
          localStorage.removeItem('auth-storage');
          
          // Limpiar también sessionStorage
          sessionStorage.removeItem('redirectAfterLogin');
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
        } catch (error: any) {
          // Solo limpiar estado si es un error real de autenticación (401/403)
          // NO limpiar si es error de red o servidor (500, timeout, etc.)
          const isAuthenticationError = error.response?.status === 401 || 
                                       error.response?.status === 403 ||
                                       error.response?.status === 302;
          
          if (isAuthenticationError) {
            console.log('⚠️ Sesión expirada, limpiando estado');
            // Sesión expiró o no existe - limpiar estado
            set({ 
              user: null, 
              isAuthenticated: false, 
              isLoading: false 
            });
          } else {
            // Error de red u otro - mantener estado actual y solo quitar loading
            console.warn('⚠️ Error al verificar sesión (no es error de auth):', error.message);
            set({ isLoading: false });
          }
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

      handleSessionExpired: () => {
        console.warn('⚠️ Sesión expirada - limpiando estado local');
        
        // Limpiar estado de autenticación
        set({ 
          user: null, 
          isAuthenticated: false,
          error: 'Tu sesión ha expirado. Por favor, inicia sesión nuevamente.'
        });
        
        // Limpiar localStorage
        localStorage.removeItem('auth-storage');
        localStorage.removeItem('session_backup');
        
        // Guardar ruta actual para redirect después del login
        const currentPath = window.location.pathname;
        if (currentPath !== '/login' && currentPath !== '/') {
          sessionStorage.setItem('redirectAfterLogin', currentPath);
        }
        
        // Redirigir a login con parámetro de sesión expirada
        window.location.href = '/login?expired=true';
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
