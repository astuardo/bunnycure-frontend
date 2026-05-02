/**
 * Componente que trackea page views automáticamente
 * Debe estar dentro del contexto de Router
 */

import { usePageViewTracking } from '../hooks/usePageViewTracking';
import AppRouter from '../routes/AppRouter';

export function AppWithTracking() {
  // Hook que trackea automáticamente cambios de ruta
  usePageViewTracking();

  return <AppRouter />;
}
