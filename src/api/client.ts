/**
 * Cliente HTTP configurado con Axios para comunicarse con el backend.
 * Incluye manejo de errores y autenticación con cookies.
 */

import axios from 'axios';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Importante para cookies de sesión
});

// Variable para evitar múltiples redirects simultáneos
let isRedirecting = false;

// Interceptor de respuesta para manejo de errores
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // Solo manejar errores de autenticación en requests que NO son login/checkAuth
    const isAuthRequest = error.config?.url?.includes('/api/auth/login') || 
                          error.config?.url?.includes('/api/auth/me');
    
    // Si es un error de autenticación real (401 o redirect HTML a login)
    const isAuthError = error.response?.status === 401 || 
                        error.response?.status === 302 ||
                        (error.request?.responseURL?.includes('/login') && 
                         error.request?.responseType !== 'json');
    
    // Solo redirigir si:
    // 1. Es un error de autenticación
    // 2. NO es un request de login/checkAuth (para evitar loops)
    // 3. No estamos ya redirigiendo
    // 4. Estamos en una ruta protegida (no en /login)
    if (isAuthError && !isAuthRequest && !isRedirecting && window.location.pathname !== '/login') {
      console.warn('⚠️ Sesión expirada o inválida - redirigiendo a login');
      isRedirecting = true;
      
      // Limpiar sesión local
      localStorage.removeItem('auth-storage');
      
      // Guardar la ruta actual para volver después del login
      const currentPath = window.location.pathname;
      if (currentPath !== '/login') {
        sessionStorage.setItem('redirectAfterLogin', currentPath);
      }
      
      // Redirect a login
      window.location.href = '/login';
      
      // Reset flag después de un delay
      setTimeout(() => {
        isRedirecting = false;
      }, 1000);
    }
    
    return Promise.reject(error);
  }
);

export default apiClient;
