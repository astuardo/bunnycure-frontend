import { useLayoutEffect, useState, type ReactNode } from 'react';
import { getAppBuildId } from '../config/buildInfo';
import { useAuthStore } from '../stores/authStore';
import { isPublicPath } from '../utils/publicRoutes';

const AUTH_BUILD_KEY = 'bunnycure-auth-build-id';

interface Props {
  children: ReactNode;
}

export default function BuildVersionGuard({ children }: Props) {
  const [ready, setReady] = useState(false);

  useLayoutEffect(() => {
    const currentBuildId = getAppBuildId();
    const storedBuildId = window.localStorage.getItem(AUTH_BUILD_KEY);
    const pathname = typeof window !== 'undefined' ? window.location.pathname : '';

    // Solo forzar re-login por nueva versión si estamos en rutas protegidas de personal.
    // En rutas públicas (tarjetas de fidelización, reservas, giftcards) nunca redirigir a login.
    if (storedBuildId && storedBuildId !== currentBuildId) {
      if (isPublicPath(pathname)) {
        window.localStorage.setItem(AUTH_BUILD_KEY, currentBuildId);
      } else {
        useAuthStore.getState().handleVersionMismatch();
      }
    }

    if (!storedBuildId) {
      window.localStorage.setItem(AUTH_BUILD_KEY, currentBuildId);
    }

    setReady(true);
  }, []);

  if (!ready) {
    return null;
  }

  return <>{children}</>;
}
