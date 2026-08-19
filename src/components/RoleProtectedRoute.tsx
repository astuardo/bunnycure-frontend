import React from 'react';
import { Container, Card, Button } from 'react-bootstrap';
import { useAuth } from '../hooks/useAuth';
import ProtectedRoute from './ProtectedRoute';
import { isSalonAdmin, isSpecialist, isReceptionist, isSuperAdmin } from '../types/user.types';

interface RoleProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles: string[];
}

export default function RoleProtectedRoute({ children, allowedRoles }: RoleProtectedRouteProps) {
  const { user } = useAuth();

  const hasAccess = () => {
    if (!user || !user.role) return false;
    const role = user.role.replace('ROLE_', '').toUpperCase();

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
        <Container className="py-5">
          <Card className="border-0 shadow-sm text-center p-5 mx-auto" style={{ maxWidth: '540px', borderRadius: '16px' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔒</div>
            <h4 className="fw-bold text-dark mb-2">Acceso Restringido</h4>
            <p className="text-muted mb-4">
              Tu cuenta con rol <strong>{user?.role}</strong> no dispone de permisos para ingresar a este módulo.
            </p>
            <div>
              <Button variant="primary" onClick={() => window.location.href = '/dashboard'} className="px-4 py-2 rounded-pill fw-semibold">
                Volver al Dashboard
              </Button>
            </div>
          </Card>
        </Container>
      )}
    </ProtectedRoute>
  );
}
