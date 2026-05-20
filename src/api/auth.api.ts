/**
 * API Client para autenticación.
 * Usa endpoints REST JSON para login/logout.
 */

import apiClient from './client';
import { clearInMemoryToken, setInMemoryToken } from './tokenStore';
import { refreshAccessToken } from './authSession';

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
 * Guarda el JWT access token solo en memoria.
 */
export const login = async (credentials: LoginRequest): Promise<LoginResponse> => {
  const response = await apiClient.post<ApiResponse<LoginResponse>>(
    '/api/auth/login', 
    credentials
  );
  
  if (response.data.success && response.data.data) {
    // Guardar JWT access token solo en memoria
    if (response.data.data.token) {
      setInMemoryToken(response.data.data.token);
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
  try {
    await apiClient.post<ApiResponse<string>>('/api/auth/logout');
  } finally {
    clearInMemoryToken();
  }
};

/**
 * Renovar access token usando la cookie HttpOnly de refresh.
 */
export const refreshSession = async (): Promise<void> => {
  const token = await refreshAccessToken();
  setInMemoryToken(token);
};
