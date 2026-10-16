/**
 * Access token (JWT de vida corta) SOLO en memoria.
 *
 * No se persiste en localStorage: cualquier script inyectado (XSS) podría leerlo y llevárselo.
 * Al recargar la página, la sesión se recupera desde la cookie de refresh (HttpOnly, Secure,
 * inaccesible desde JavaScript): authStore.checkAuth → /api/auth/refresh → nuevo access token.
 */

/** Clave usada por versiones anteriores, que guardaban el token en localStorage. */
const LEGACY_ACCESS_TOKEN_KEY = 'bunnycure-access-token';

// Limpieza única: elimina el token que dejaron versiones anteriores en el navegador.
if (typeof window !== 'undefined') {
  try {
    window.localStorage.removeItem(LEGACY_ACCESS_TOKEN_KEY);
  } catch {
    // Storage no disponible (modo privado estricto): no hay nada que limpiar
  }
}

let memoryToken: string | null = null;

const notifyTokenChange = () => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('bunnycure-access-token-changed'));
  }
};

export const setInMemoryToken = (token: string | null) => {
  memoryToken = token;
  notifyTokenChange();
};

export const getInMemoryToken = (): string | null => memoryToken;

export const clearInMemoryToken = () => {
  memoryToken = null;
  notifyTokenChange();
};
