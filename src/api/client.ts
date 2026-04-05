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

// Interceptor de respuesta para manejo de errores
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // Si recibimos 401 (no autorizado) o la respuesta es un redirect a login
    if (error.response?.status === 401 || 
        error.response?.status === 302 ||
        error.request?.responseURL?.includes('/login')) {
      // Limpiar sesión local
      localStorage.removeItem('auth-storage');
      // Redirect a login
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default apiClient;
