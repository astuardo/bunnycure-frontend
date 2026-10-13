/**
 * Rutas públicas (clientas / visitantes) que NUNCA deben forzar login,
 * redirecciones por cambio de versión ni manejo de sesión expirada.
 */
const PUBLIC_PATH_PREFIXES = [
  '/mi-tarjeta',
  '/tarjeta',
  '/pass',
  '/mi-pase',
  '/reservar',
  '/giftcards/public',
  '/install',
  '/login',
  '/forgot-password',
  '/reset-password',
];

export const isPublicPath = (pathname: string = typeof window !== 'undefined' ? window.location.pathname : ''): boolean =>
  PUBLIC_PATH_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));

/** Marca persistente: este dispositivo ha iniciado sesión como personal del salón al menos una vez. */
export const STAFF_DEVICE_KEY = 'bunnycure-staff-device';

/** ID de la última tarjeta Bunny Pass abierta en este dispositivo. */
export const MY_PASS_ID_KEY = 'bunny_my_loyalty_public_id';

export const markStaffDevice = (): void => {
  try {
    window.localStorage.setItem(STAFF_DEVICE_KEY, '1');
  } catch {
    // Ignorar (modo privado / storage bloqueado)
  }
};

export const isStaffDevice = (): boolean => {
  try {
    return window.localStorage.getItem(STAFF_DEVICE_KEY) === '1';
  } catch {
    return false;
  }
};

export const getSavedPassId = (): string | null => {
  try {
    return window.localStorage.getItem(MY_PASS_ID_KEY);
  } catch {
    return null;
  }
};
