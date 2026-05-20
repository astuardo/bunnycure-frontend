/**
 * Cliente HTTP configurado con Axios para comunicarse con el backend.
 * Incluye manejo de errores y autenticación con JWT.
 */

import axios, { type AxiosRequestConfig } from 'axios';
import { refreshAccessToken } from './authSession';
import { setInMemoryToken, getInMemoryToken } from './tokenStore';

interface RetryableRequestConfig extends AxiosRequestConfig {
  _retry?: boolean;
}

const getCookieValue = (name: string): string | null => {
  const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = document.cookie.match(new RegExp(`(?:^|; )${escapedName}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
};

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Importante para cookies de sesión (fallback)
  xsrfCookieName: 'XSRF-TOKEN',
  xsrfHeaderName: 'X-XSRF-TOKEN',
});

// Variable para evitar múltiples redirects simultáneos
let isRedirecting = false;

/**
 * Interceptor de peticiones para agregar JWT access token en cada request.
 */
apiClient.interceptors.request.use(
  (config) => {
    const token = getInMemoryToken();
    
    if (token) {
      const headers = config.headers as Record<string, string>;
      headers.Authorization = `Bearer ${token}`;
    }

    // Adjuntar CSRF token cuando esté disponible (backend Spring Security)
    const csrfToken =
      getCookieValue('XSRF-TOKEN') ||
      getCookieValue('CSRF-TOKEN') ||
      getCookieValue('_csrf');
    if (csrfToken) {
      config.headers['X-XSRF-TOKEN'] = csrfToken;
      config.headers['X-CSRF-TOKEN'] = csrfToken;
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

/**
 * Interceptor de respuesta para manejo de errores de autenticación.
 * Detecta cuando la sesión expira (401) y redirige automáticamente al login.
 */
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    // Solo manejar errores de autenticación en requests que NO son login/checkAuth
    const isAuthRequest = error.config?.url?.includes('/api/auth/login') || 
                          error.config?.url?.includes('/api/auth/me') ||
                          error.config?.url?.includes('/api/auth/refresh');
    
    // Detectar error de autenticación (401 o redirect a login)
    // Nota: 403 puede ser CSRF o permisos, no siempre sesión expirada.
    const isAuthError = error.response?.status === 401 || 
                        error.response?.status === 302 ||
                        (error.request?.responseURL?.includes('/login') && 
                         error.request?.responseType !== 'json');
    
    // Solo redirigir si:
    // 1. Es un error de autenticación
    // 2. NO es un request de login/checkAuth (para evitar loops)
    // 3. No estamos ya redirigiendo
    // 4. Estamos en una ruta protegida (no en /login)
    if (isAuthError && !isAuthRequest) {
      const originalRequest = error.config as RetryableRequestConfig | undefined;

      if (originalRequest && !originalRequest._retry) {
        originalRequest._retry = true;

        try {
          const newToken = await refreshAccessToken();
          setInMemoryToken(newToken);
          const headers = (originalRequest.headers ?? {}) as Record<string, string>;
          headers.Authorization = `Bearer ${newToken}`;
          originalRequest.headers = headers;
          return apiClient.request(originalRequest);
        } catch {
          // Falls through to session expiration handling below
        }
      }
    }

    if (isAuthError && !isAuthRequest && !isRedirecting && window.location.pathname !== '/login') {
      isRedirecting = true;
      const { useAuthStore } = await import('../stores/authStore');
      useAuthStore.getState().handleSessionExpired();
      setTimeout(() => {
        isRedirecting = false;
      }, 1000);
    }
    
    return Promise.reject(error);
  }
);

export default apiClient;
