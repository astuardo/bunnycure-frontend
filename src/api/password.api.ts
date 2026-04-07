/**
 * API de Recuperación de Contraseña
 */

import apiClient from './client';

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  newPassword: string;
  confirmPassword: string;
}

export const passwordApi = {
  /**
   * Solicitar reset de contraseña (envía email)
   */
  forgotPassword: async (email: string): Promise<void> => {
    await apiClient.post('/forgot-password', null, {
      params: { email }
    });
  },

  /**
   * Validar si un token es válido
   */
  validateToken: async (token: string): Promise<boolean> => {
    try {
      await apiClient.get('/reset-password', {
        params: { token }
      });
      return true;
    } catch (error) {
      return false;
    }
  },

  /**
   * Resetear contraseña con token
   */
  resetPassword: async (token: string, newPassword: string, confirmPassword: string): Promise<void> => {
    await apiClient.post('/reset-password', null, {
      params: {
        token,
        newPassword,
        confirmPassword
      }
    });
  },
};
