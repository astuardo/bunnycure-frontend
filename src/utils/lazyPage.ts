import { lazy, type ComponentType } from 'react';

type PageModule<T> = { default: T };

/**
 * Carga el módulo de una página para React.lazy tolerando el chunk viejo tras un deploy.
 *
 * Cuando el listener de `vite:preloadError` (main.tsx) llama a preventDefault() para recargar,
 * Vite resuelve el import con `undefined` en vez de rechazarlo. Si se lo pasáramos a React,
 * lazy() fallaría con "undefined is not an object (evaluating '_result.default')" antes de
 * que la recarga ocurra. En ese caso devolvemos una promesa que nunca se resuelve: Suspense
 * sigue mostrando el fallback hasta que la página se recarga.
 */
export async function loadPageModule<T>(
  factory: () => Promise<PageModule<T> | undefined>,
): Promise<PageModule<T>> {
  const mod = await factory();
  if (!mod) return new Promise<never>(() => {});
  return mod;
}

export function lazyPage<T extends ComponentType<any>>(factory: () => Promise<PageModule<T>>) {
  return lazy(() => loadPageModule(factory));
}
