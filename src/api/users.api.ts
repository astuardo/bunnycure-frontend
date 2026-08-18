/**
 * API de Gestión de Usuarios (Personal / Administradores)
 */

import apiClient from './client';
import { ApiResponse } from '../types/api.types';
import {
  User,
  CreateUserFormData,
  UpdateUserFormData,
  ChangeUserPasswordFormData,
} from '../types/user.types';

export const usersApi = {
  /**
   * Listar todos los usuarios del sistema
   */
  list: async (): Promise<User[]> => {
    const response = await apiClient.get<ApiResponse<User[]>>('/api/users');
    return response.data.data || [];
  },

  /**
   * Obtener un usuario por ID
   */
  getById: async (id: number): Promise<User> => {
    const response = await apiClient.get<ApiResponse<User>>(`/api/users/${id}`);
    if (!response.data.data) throw new Error('Usuario no encontrado');
    return response.data.data;
  },

  /**
   * Crear nuevo usuario
   */
  create: async (data: CreateUserFormData): Promise<User> => {
    const response = await apiClient.post<ApiResponse<User>>('/api/users', data);
    if (!response.data.data) throw new Error('Error al crear usuario');
    return response.data.data;
  },

  /**
   * Actualizar datos de usuario
   */
  update: async (id: number, data: UpdateUserFormData): Promise<User> => {
    const response = await apiClient.put<ApiResponse<User>>(`/api/users/${id}`, data);
    if (!response.data.data) throw new Error('Error al actualizar usuario');
    return response.data.data;
  },

  /**
   * Eliminar usuario
   */
  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/api/users/${id}`);
  },

  /**
   * Alternar estado habilitado/deshabilitado
   */
  toggleEnabled: async (id: number): Promise<User> => {
    const response = await apiClient.put<ApiResponse<User>>(`/api/users/${id}/toggle-enabled`);
    if (!response.data.data) throw new Error('Error al cambiar estado del usuario');
    return response.data.data;
  },

  /**
   * Cambiar contraseña de un usuario (Admin)
   */
  changePassword: async (id: number, data: ChangeUserPasswordFormData): Promise<void> => {
    await apiClient.put<ApiResponse<string>>(`/api/users/${id}/change-password`, data);
  },
};

export default usersApi;
