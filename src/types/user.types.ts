/**
 * Tipos para Gestión de Usuarios
 */

export interface User {
  id: number;
  username: string;
  fullName: string;
  email?: string;
  role: string;
  enabled: boolean;
}

export interface CreateUserFormData {
  username: string;
  password: string;
  fullName: string;
  email?: string;
}

export interface UpdateUserFormData {
  username: string;
  fullName: string;
  email?: string;
  role?: string;
}

export interface ChangeUserPasswordFormData {
  newPassword: string;
  confirmPassword: string;
}
