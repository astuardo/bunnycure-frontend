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
 */
export const login = async (credentials: LoginRequest): Promise<LoginResponse> => {
  const response = await apiClient.post<ApiResponse<LoginResponse>>(
    '/api/auth/login', 
    credentials
  );
  
  if (response.data.success && response.data.data) {
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
