/**
 * Cliente HTTP configurado con Axios para comunicarse con el backend.
 * Incluye manejo de errores y autenticación con JWT.
 */

import axios from 'axios';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Importante para cookies de sesión (fallback)
});

// Variable para evitar múltiples redirects simultáneos
let isRedirecting = false;

/**
 * Interceptor de peticiones para agregar JWT token en cada request.
 * Busca el token en localStorage y lo agrega al header Authorization.
 */
apiClient.interceptors.request.use(
  (config) => {
    // Obtener token JWT de localStorage
    const token = localStorage.getItem('jwt_token');
    
    if (token) {
      // Agregar header Authorization con el token
      config.headers.Authorization = `Bearer ${token}`;
      console.log(`🔑 JWT incluido en request: ${config.method?.toUpperCase()} ${config.url}`);
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
    // Log successful requests para debug
    if (response.config.url?.includes('/api/')) {
      console.log(`✅ ${response.config.method?.toUpperCase()} ${response.config.url} → ${response.status}`);
    }
    return response;
  },
  async (error) => {
    // Log del error para debug
    const url = error.config?.url;
    const status = error.response?.status;
    console.error(`❌ ${error.config?.method?.toUpperCase()} ${url} → ${status || 'Network Error'}`);
    
    // Solo manejar errores de autenticación en requests que NO son login/checkAuth
    const isAuthRequest = error.config?.url?.includes('/api/auth/login') || 
                          error.config?.url?.includes('/api/auth/me');
    
    // Detectar error de autenticación (401, 403, o redirect a login)
    const isAuthError = error.response?.status === 401 || 
                        error.response?.status === 403 ||
                        error.response?.status === 302 ||
                        (error.request?.responseURL?.includes('/login') && 
                         error.request?.responseType !== 'json');
    
    // Solo redirigir si:
    // 1. Es un error de autenticación
    // 2. NO es un request de login/checkAuth (para evitar loops)
    // 3. No estamos ya redirigiendo
    // 4. Estamos en una ruta protegida (no en /login)
    if (isAuthError && !isAuthRequest && !isRedirecting && window.location.pathname !== '/login') {
      console.warn('🔒 Sesión expirada o inválida - redirigiendo a login');
      console.warn(`   URL fallida: ${url}`);
      console.warn(`   Status: ${status}`);
      isRedirecting = true;
      
      // Importar authStore dinámicamente para evitar dependencias circulares
      const { useAuthStore } = await import('../stores/authStore');
      
      // Llamar al metodo handleSessionExpired del store
      useAuthStore.getState().handleSessionExpired();
      
      // Reset flag después de un delay
      setTimeout(() => {
        isRedirecting = false;
      }, 1000);
    }
    
    return Promise.reject(error);
  }
);

export default apiClient;
