/**
 * Utilidades Centralizadas para Validación, Formato y Búsqueda de RUT Chileno
 * Soporta indistintamente formatos con puntos (18.664.589-8) y sin puntos (18664589-8)
 */

/**
 * Limpia un RUT eliminando puntos, guiones, espacios y convirtiendo a mayúsculas
 * Ejemplo: " 18.664.589-k " -> "18664589K"
 */
export const cleanRut = (value?: string | null): string => {
  if (!value) return '';
  return value.trim().toUpperCase().replace(/[^0-9K]/g, '');
};

/**
 * Valida el dígito verificador usando el algoritmo Módulo 11
 */
export const isValidRutDv = (cleanRutStr: string): boolean => {
  if (cleanRutStr.length < 2) return false;
  const body = cleanRutStr.slice(0, -1);
  const dv = cleanRutStr.slice(-1).toUpperCase();

  if (!/^\d+$/.test(body)) return false;

  let sum = 0;
  let multiplier = 2;

  for (let i = body.length - 1; i >= 0; i--) {
    sum += parseInt(body[i], 10) * multiplier;
    multiplier = multiplier === 7 ? 2 : multiplier + 1;
  }

  const expectedDvNumber = 11 - (sum % 11);
  let expectedDv = '';
  if (expectedDvNumber === 11) expectedDv = '0';
  else if (expectedDvNumber === 10) expectedDv = 'K';
  else expectedDv = expectedDvNumber.toString();

  return dv === expectedDv;
};

/**
 * Valida si un string de RUT tiene estructura válida
 * Acepta con puntos (18.664.589-8), sin puntos (18664589-8), o continuo (186645898)
 */
export const isValidRutFormat = (value?: string | null): boolean => {
  if (!value) return false;
  const cleaned = cleanRut(value);
  if (cleaned.length < 7 || cleaned.length > 9) return false;

  const body = cleaned.slice(0, -1);
  const dv = cleaned.slice(-1);

  return /^\d{6,8}$/.test(body) && /^[0-9K]$/.test(dv);
};

/**
 * Formatea un RUT a su representación visual estándar con puntos y guión
 * Ejemplo: "186645898" -> "18.664.589-8"
 * Ejemplo: "18664589-8" -> "18.664.589-8"
 * Ejemplo: "18.664.589-8" -> "18.664.589-8"
 */
export const formatRutWithDots = (value?: string | null): string => {
  if (!value) return '';
  const cleaned = cleanRut(value);
  if (cleaned.length < 2) return cleaned;

  const dv = cleaned.slice(-1);
  const body = cleaned.slice(0, -1);
  const formattedBody = body.replace(/\B(?=(\d{3})+(?!\d))/g, '.');

  return `${formattedBody}-${dv}`;
};

/**
 * Formatea un RUT sin puntos pero con guión
 * Ejemplo: "18.664.589-8" -> "18664589-8"
 * Ejemplo: "186645898" -> "18664589-8"
 */
export const formatRutWithoutDots = (value?: string | null): string => {
  if (!value) return '';
  const cleaned = cleanRut(value);
  if (cleaned.length < 2) return cleaned;

  const dv = cleaned.slice(-1);
  const body = cleaned.slice(0, -1);

  return `${body}-${dv}`;
};

/**
 * Normalizador flexible para entradas de formulario:
 * Formatea a "XX.XXX.XXX-X" preservando mayúsculas en el DV
 */
export const normalizeRut = (value?: string | null): string => {
  if (!value) return '';
  return formatRutWithDots(value);
};

/**
 * Compara si una búsqueda coincide con el RUT almacenado,
 * independientemente de si se busca con puntos o sin puntos, o solo números
 * Ejemplo: query="18664589" coincide con target="18.664.589-8" y "18664589-8"
 */
export const matchRutSearch = (query: string, targetRut?: string | null): boolean => {
  if (!targetRut || !query) return false;

  const cleanQuery = cleanRut(query);
  const cleanTarget = cleanRut(targetRut);

  // Coincidencia limpia exacta o subcadena limpia (ej: 18664589 dentro de 186645898)
  if (cleanQuery && cleanTarget.includes(cleanQuery)) {
    return true;
  }

  // Coincidencia literal por si acaso
  const lowerQuery = query.trim().toLowerCase();
  const lowerTarget = targetRut.trim().toLowerCase();

  return lowerTarget.includes(lowerQuery);
};
