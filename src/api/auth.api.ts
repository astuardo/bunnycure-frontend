/**
 * API Client para autenticación.
 * Usa endpoints REST JSON para login/logout.
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

export interface LoginResponse {
  user: User;
  token?: string; // JWT token para autenticación
  requiresPasswordChange: boolean;
  message: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    errorCode: string;
    fieldErrors?: Array<{
      field: string;
      message: string;
    }>;
  };
  timestamp?: string;
}

/**
 * Login del usuario con API REST JSON.
 * Guarda el JWT token en localStorage para autenticación en requests posteriores.
 */
export const login = async (credentials: LoginRequest): Promise<LoginResponse> => {
  const response = await apiClient.post<ApiResponse<LoginResponse>>(
    '/api/auth/login', 
    credentials
  );
  
  if (response.data.success && response.data.data) {
    // Guardar JWT token en localStorage si viene en la respuesta
    if (response.data.data.token) {
      localStorage.setItem('jwt_token', response.data.data.token);
      console.log('✅ JWT token guardado en localStorage');
    }
    
    return response.data.data;
  }
  
  throw new Error(response.data.error?.message || 'Error en login');
};

/**
 * Obtener usuario actual autenticado.
 */
export const getCurrentUser = async (): Promise<User> => {
  const response = await apiClient.get<ApiResponse<User>>('/api/auth/me');
  
  if (response.data.success && response.data.data) {
    return response.data.data;
  }
  
  throw new Error(response.data.error?.message || 'No autenticado');
};

/**
 * Logout del usuario.
 */
export const logout = async (): Promise<void> => {
  await apiClient.post<ApiResponse<string>>('/api/auth/logout');
};

/**
 * Verificar si el usuario está autenticado.
 */
export const checkAuth = async (): Promise<boolean> => {
  try {
    await getCurrentUser();
    return true;
  } catch (error) {
    return false;
  }
};
