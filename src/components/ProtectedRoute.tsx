/**
 * Componente para proteger rutas que requieren autenticación.
 * Redirige a /login si el usuario no está autenticado.
 */

import { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Container, Spinner } from 'react-bootstrap';
import { useAuth } from '../hooks/useAuth';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, checkAuth, user } = useAuth();
  const location = useLocation();

  // Verificar autenticación al montar
  useEffect(() => {
    // Solo hacer checkAuth si:
    // 1. No está autenticado según el estado
    // 2. O el estado dice autenticado pero no hay usuario (inconsistencia)
    const shouldCheck = !isAuthenticated || (isAuthenticated && !user);
    
    if (shouldCheck) {
      console.log('🔍 Verificando autenticación...');
      checkAuth();
    }
  }, [location.pathname, isAuthenticated, user, checkAuth]); // Incluir todas las dependencias

  // Mostrar loader mientras verifica
  if (isLoading) {
    return (
      <Container className="d-flex justify-content-center align-items-center min-vh-100">
        <div className="text-center">
          <Spinner animation="border" variant="primary" />
          <p className="mt-3 text-muted">Verificando autenticación...</p>
        </div>
      </Container>
    );
  }

  // Redirigir a login si no está autenticado
  if (!isAuthenticated) {
    // Guardar ruta actual para restaurar después del login
    sessionStorage.setItem('redirectAfterLogin', location.pathname);
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Renderizar children si está autenticado
  return <>{children}</>;
}
