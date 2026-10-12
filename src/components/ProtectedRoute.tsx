/**
 * Componente para proteger rutas que requieren autenticación (Migrado a Tailwind CSS)
 * Redirige a /login si el usuario no está autenticado.
 */

import { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Spinner } from './ui/Spinner';

const FORCE_RELOGIN_KEY = 'bunnycure-force-relogin-build-id';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, checkAuth, user } = useAuth();
  const location = useLocation();
  const forceRelogin = typeof window !== 'undefined' && window.localStorage.getItem(FORCE_RELOGIN_KEY);

  // Verificar autenticación al montar
  useEffect(() => {
    if (forceRelogin) {
      return;
    }

    // Solo hacer checkAuth si:
    // 1. No está autenticado según el estado
    // 2. O el estado dice autenticado pero no hay usuario (inconsistencia)
    const shouldCheck = !isAuthenticated || (isAuthenticated && !user);
    
    if (shouldCheck) {
      console.log('🔍 Verificando autenticación...');
      checkAuth();
    }
  }, [location.pathname, isAuthenticated, user, checkAuth, forceRelogin]);

  if (forceRelogin) {
    sessionStorage.setItem('redirectAfterLogin', location.pathname);
    return <Navigate to="/login?version=true" state={{ from: location }} replace />;
  }

  // Mostrar loader mientras verifica
  if (isLoading) {
    return (
      <div className="min-h-screen min-h-[100dvh] bg-bunny-primary-light flex items-center justify-center p-4">
        <div className="text-center flex flex-col items-center gap-3">
          <Spinner size="lg" variant="primary" />
          <p className="text-sm font-medium text-bunny-text-muted">Verificando autenticación...</p>
        </div>
      </div>
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
