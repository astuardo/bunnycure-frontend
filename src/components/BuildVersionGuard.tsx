import { useLayoutEffect, useState, type ReactNode } from 'react';
import { getAppBuildId } from '../config/buildInfo';
import { useAuthStore } from '../stores/authStore';

const AUTH_BUILD_KEY = 'bunnycure-auth-build-id';

interface Props {
  children: ReactNode;
}

export default function BuildVersionGuard({ children }: Props) {
  const [ready, setReady] = useState(false);

  useLayoutEffect(() => {
    const currentBuildId = getAppBuildId();
    const storedBuildId = window.localStorage.getItem(AUTH_BUILD_KEY);

    if (storedBuildId && storedBuildId !== currentBuildId) {
      useAuthStore.getState().handleVersionMismatch();
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
