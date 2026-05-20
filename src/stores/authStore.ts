/**
 * Store de autenticación con Zustand.
 * Maneja el estado del usuario autenticado.
 */

import { create } from 'zustand';
import type { User } from '../api/auth.api';
import * as authApi from '../api/auth.api';
import { getAppBuildId } from '../config/buildInfo';
import { trackLogin, setUserProperties } from '../utils/analytics';

const APP_BUILD_ID = getAppBuildId();

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  authBuildId: string | null;

  // Actions
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  setUser: (user: User | null) => void;
  clearError: () => void;
  handleSessionExpired: () => void;
  handleVersionMismatch: () => void;
}

export const useAuthStore = create<AuthState>()((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
  authBuildId: null,

  login: async (username: string, password: string) => {
    set({ isLoading: true, error: null });
    try {
      const loginResponse = await authApi.login({ username, password });

      set({
        user: loginResponse.user,
        isAuthenticated: true,
        isLoading: false,
        error: null,
        authBuildId: APP_BUILD_ID,
      });

      trackLogin(loginResponse.user.id, loginResponse.user.email || undefined);
      setUserProperties(loginResponse.user.id, loginResponse.user.role || undefined);

      if (loginResponse.requiresPasswordChange) {
        console.warn('⚠️ Usuario debe cambiar contraseña');
      }
    } catch (error) {
      console.error('❌ Error en login:', error);
      const err = error as { response?: { data?: { error?: { message?: string }; message?: string } } };
      const errorMessage =
        err.response?.data?.error?.message ||
        err.response?.data?.message ||
        'Credenciales inválidas';

      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: errorMessage,
      });
      throw error;
    }
  },

  logout: async () => {
    try {
      await authApi.logout();
    } finally {
      set({
        user: null,
        isAuthenticated: false,
        error: null,
        authBuildId: null,
      });
      sessionStorage.removeItem('redirectAfterLogin');
    }
  },

  checkAuth: async () => {
    set({ isLoading: true });
    try {
      try {
        const user = await authApi.getCurrentUser();
        set({
          user,
          isAuthenticated: true,
          isLoading: false,
          authBuildId: APP_BUILD_ID,
        });
        return;
      } catch {
        await authApi.refreshSession();
        const user = await authApi.getCurrentUser();
        set({
          user,
          isAuthenticated: true,
          isLoading: false,
          authBuildId: APP_BUILD_ID,
        });
        return;
      }
    } catch (error) {
      const err = error as { response?: { status?: number }; message?: string };
      const isAuthenticationError = err.response?.status === 401 || err.response?.status === 302;

      if (isAuthenticationError) {
        set({
          user: null,
          isAuthenticated: false,
          isLoading: false,
          authBuildId: null,
        });
      } else {
        const errorMessage = err.message || 'Error desconocido';
        console.warn('⚠️ Error al verificar sesión (no es error de auth):', errorMessage);
        set({ isLoading: false });
      }
    }
  },

  setUser: (user: User | null) => {
    set({
      user,
      isAuthenticated: user !== null,
      authBuildId: user ? APP_BUILD_ID : null,
    });
  },

  clearError: () => {
    set({ error: null });
  },

  handleSessionExpired: () => {
    console.warn('⚠️ Sesión expirada - limpiando estado local');

    set({
      user: null,
      isAuthenticated: false,
      error: 'Tu sesión ha expirado. Por favor, inicia sesión nuevamente.',
      authBuildId: null,
    });

    const currentPath = window.location.pathname;
    if (currentPath !== '/login' && currentPath !== '/') {
      sessionStorage.setItem('redirectAfterLogin', currentPath);
    }

    window.location.href = '/login?expired=true';
  },

  handleVersionMismatch: () => {
    console.warn('♻️ Nueva versión detectada - forzando re-login');

    set({
      user: null,
      isAuthenticated: false,
      error: null,
      authBuildId: APP_BUILD_ID,
    });

    sessionStorage.removeItem('redirectAfterLogin');

    if (window.location.pathname !== '/login') {
      window.location.href = '/login?version=true';
    }
  },
}));
