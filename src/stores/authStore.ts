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
const AUTH_BUILD_KEY = 'bunnycure-auth-build-id';
const FORCE_RELOGIN_KEY = 'bunnycure-force-relogin-build-id';

const getStoredAuthBuildId = (): string | null => {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(AUTH_BUILD_KEY);
};

const setStoredAuthBuildId = (buildId: string | null) => {
  if (typeof window === 'undefined') return;
  if (buildId) {
    window.localStorage.setItem(AUTH_BUILD_KEY, buildId);
  } else {
    window.localStorage.removeItem(AUTH_BUILD_KEY);
  }
};

const setForceReloginMarker = (buildId: string | null) => {
  if (typeof window === 'undefined') return;
  if (buildId) {
    window.localStorage.setItem(FORCE_RELOGIN_KEY, buildId);
  } else {
    window.localStorage.removeItem(FORCE_RELOGIN_KEY);
  }
};

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

      setStoredAuthBuildId(APP_BUILD_ID);
      setForceReloginMarker(null);

      await authApi.getCsrfToken();

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
      setStoredAuthBuildId(null);
      setForceReloginMarker(null);
      sessionStorage.removeItem('redirectAfterLogin');
    }
  },

  checkAuth: async () => {
    set({ isLoading: true });
    try {
      const storedBuildId = getStoredAuthBuildId();
      const forceReloginBuildId =
        typeof window !== 'undefined' ? window.localStorage.getItem(FORCE_RELOGIN_KEY) : null;
      const hasVersionMismatch =
        Boolean(forceReloginBuildId) ||
        (storedBuildId && storedBuildId !== APP_BUILD_ID);

      if (hasVersionMismatch) {
        setForceReloginMarker(APP_BUILD_ID);
        setStoredAuthBuildId(APP_BUILD_ID);

        set({
          user: null,
          isAuthenticated: false,
          isLoading: false,
          authBuildId: null,
        });

        void authApi.logout();
        return;
      }

      try {
        const user = await authApi.getCurrentUser();
        await authApi.getCsrfToken();
        set({
          user,
          isAuthenticated: true,
          isLoading: false,
          authBuildId: APP_BUILD_ID,
        });
        setStoredAuthBuildId(APP_BUILD_ID);
        setForceReloginMarker(null);
        return;
      } catch {
        await authApi.refreshSession();
        const user = await authApi.getCurrentUser();
        await authApi.getCsrfToken();
        set({
          user,
          isAuthenticated: true,
          isLoading: false,
          authBuildId: APP_BUILD_ID,
        });
        setStoredAuthBuildId(APP_BUILD_ID);
        setForceReloginMarker(null);
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
    setForceReloginMarker(null);

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

    setStoredAuthBuildId(APP_BUILD_ID);
    setForceReloginMarker(APP_BUILD_ID);
    sessionStorage.removeItem('redirectAfterLogin');

    void authApi.logout();

    if (window.location.pathname !== '/login') {
      window.location.href = '/login?version=true';
    }
  },
}));
