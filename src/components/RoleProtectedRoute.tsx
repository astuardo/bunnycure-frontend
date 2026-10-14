import React from 'react';
import { useAuth } from '../hooks/useAuth';
import ProtectedRoute from './ProtectedRoute';
import { Card, CardBody, Button } from './ui';
import { isSalonAdmin, isSpecialist, isReceptionist, isSuperAdmin } from '../types/user.types';

interface RoleProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles: string[];
  requireRootTenant?: boolean;
}

export default function RoleProtectedRoute({ children, allowedRoles, requireRootTenant = false }: RoleProtectedRouteProps) {
  const { user } = useAuth();

  const hasAccess = () => {
    if (!user || !user.role) return false;
    const role = user.role.replace('ROLE_', '').toUpperCase();

    // Si requiere ser super admin o raíz (tenant 1)
    if (requireRootTenant) {
      const isSuper = isSuperAdmin(role);
      const isRootAdmin = isSalonAdmin(role) && (!user.tenantId || user.tenantId === 1);
      if (!isSuper && !isRootAdmin) {
        return false;
      }
    }

    // Si la lista de roles permitidos incluye ADMIN/SALON_ADMIN y el usuario es admin
    if (allowedRoles.some(r => r === 'SALON_ADMIN' || r === 'ADMIN') && isSalonAdmin(role)) {
      return true;
    }
    // Si la lista incluye SUPER_ADMIN
    if (allowedRoles.includes('SUPER_ADMIN') && isSuperAdmin(role)) {
      return true;
    }
    // Si la lista incluye RECEPTIONIST
    if (allowedRoles.includes('RECEPTIONIST') && (isReceptionist(role) || isSalonAdmin(role))) {
      return true;
    }
    // Si la lista incluye SPECIALIST/STAFF
    if (allowedRoles.some(r => r === 'SPECIALIST' || r === 'STAFF') && isSpecialist(role)) {
      return true;
    }

    return allowedRoles.includes(role);
  };

  return (
    <ProtectedRoute>
      {hasAccess() ? (
        children
      ) : (
        <div className="min-h-[70vh] flex items-center justify-center p-4">
          <Card className="w-full max-w-lg text-center shadow-bunny-lg border-bunny-border">
            <CardBody className="p-8 sm:p-10">
              <div className="text-5xl mb-4 select-none">🔒</div>
              <h4 className="text-2xl font-bold text-bunny-text mb-2">Acceso Restringido</h4>
              <p className="text-sm text-bunny-text-muted mb-6 leading-relaxed">
                Tu cuenta con rol <strong className="font-semibold text-bunny-text">{user?.role}</strong> no dispone de permisos para ingresar a este módulo.
              </p>
              <div>
                <Button
                  variant="primary"
                  size="md"
                  onClick={() => (window.location.href = '/dashboard')}
                  className="rounded-full px-6"
                >
                  Volver al Dashboard
                </Button>
              </div>
            </CardBody>
          </Card>
        </div>
      )}
    </ProtectedRoute>
  );
}
