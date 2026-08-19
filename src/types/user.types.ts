/**
 * Tipos para Gestión de Usuarios y Control de Acceso (RBAC)
 */

export type UserRole = 
  | 'SUPER_ADMIN' 
  | 'SALON_ADMIN' 
  | 'ADMIN' 
  | 'RECEPTIONIST' 
  | 'SPECIALIST' 
  | 'STAFF';

export const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: '👑 Super Administrador',
  SALON_ADMIN: '🏢 Dueña / Administradora',
  ADMIN: '🏢 Administradora',
  RECEPTIONIST: '🛎️ Recepcionista',
  SPECIALIST: '💅 Especialista / Manicurista',
  STAFF: '💅 Especialista / Personal',
};

export const ROLE_BADGE_VARIANTS: Record<string, string> = {
  SUPER_ADMIN: 'danger',
  SALON_ADMIN: 'primary',
  ADMIN: 'primary',
  RECEPTIONIST: 'info',
  SPECIALIST: 'success',
  STAFF: 'success',
};

export function isSalonAdmin(role?: string): boolean {
  if (!role) return false;
  const clean = role.replace('ROLE_', '').toUpperCase();
  return clean === 'SALON_ADMIN' || clean === 'ADMIN' || clean === 'SUPER_ADMIN';
}

export function isSpecialist(role?: string): boolean {
  if (!role) return false;
  const clean = role.replace('ROLE_', '').toUpperCase();
  return clean === 'SPECIALIST' || clean === 'STAFF';
}

export function isReceptionist(role?: string): boolean {
  if (!role) return false;
  const clean = role.replace('ROLE_', '').toUpperCase();
  return clean === 'RECEPTIONIST';
}

export function isSuperAdmin(role?: string): boolean {
  if (!role) return false;
  const clean = role.replace('ROLE_', '').toUpperCase();
  return clean === 'SUPER_ADMIN';
}

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
  role?: string;
}

export interface UpdateUserFormData {
  username: string;
  fullName: string;
  email?: string;
  role?: string;
  enabled?: boolean;
}

export interface ChangeUserPasswordFormData {
  newPassword: string;
  confirmPassword: string;
}
