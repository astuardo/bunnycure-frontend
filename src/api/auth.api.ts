/**
 * API Client para autenticación.
 * Spring Security usa form-based authentication con cookies JSESSIONID.
 */

import apiClient from './client';

export interface LoginRequest {
  username: string;
  password: string;
}

export interface User {
  id: number;
  username: string;
  fullName: string;
  email: string | null;
  role: string;
  enabled: boolean;
}

export interface AuthResponse {
  authenticated: boolean;
  user: User | null;
}

/**
 * Login del usuario.
 * Spring Security maneja el login con form-based authentication.
 * NO retorna JSON, retorna 302 redirect en caso de éxito.
 */
export const login = async (credentials: LoginRequest): Promise<void> => {
  // Spring Security espera form data, no JSON
  const formData = new URLSearchParams();
  formData.append('username', credentials.username);
  formData.append('password', credentials.password);

  const response = await apiClient.post('/login', formData, {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    // No seguir redirects automáticamente para detectar éxito/error
    maxRedirects: 0,
    validateStatus: (status) => status === 302 || status === 200 || status === 401,
  });

  // Spring Security redirige a /admin/dashboard en éxito
  if (response.status === 302 || response.status === 200) {
    return; // Login exitoso
  }

  throw new Error('Credenciales inválidas');
};

/**
 * Obtener usuario actual autenticado.
 * Debemos crear este endpoint en el backend.
 */
export const getCurrentUser = async (): Promise<User> => {
  const response = await apiClient.get<User>('/api/auth/me');
  return response.data;
};

/**
 * Logout del usuario.
 * Spring Security maneja el logout y limpia la sesión.
 */
export const logout = async (): Promise<void> => {
  await apiClient.post('/logout');
};

/**
 * Verificar si el usuario está autenticado.
 * Intenta obtener el usuario actual.
 */
export const checkAuth = async (): Promise<boolean> => {
  try {
    await getCurrentUser();
    return true;
  } catch (error) {
    return false;
  }
};
