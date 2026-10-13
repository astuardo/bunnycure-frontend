/**
 * Utilidades para construcción de URLs y mensajes de la Tarjeta de Fidelización (Bunny Pass).
 * Idéntico a giftcardUrl.ts para garantizar compatibilidad total entre subdominios y móviles.
 */

const LOYALTY_PUBLIC_BASE = 'https://app.bunnycure.cl';

/**
 * Normaliza la URL pública de la tarjeta de fidelización.
 * Siempre garantiza https://app.bunnycure.cl/mi-tarjeta/:publicId
 * evitando que enlaces generados desde admin.bunnycure.cl o servidores internos
 * lleven a la clienta a rutas protegidas de administración.
 */
export const normalizeLoyaltyCardPublicUrl = (publicId?: string | null): string => {
  if (!publicId?.trim()) {
    return `${LOYALTY_PUBLIC_BASE}/`;
  }
  return `${LOYALTY_PUBLIC_BASE}/mi-tarjeta/${encodeURIComponent(publicId.trim())}`;
};

/**
 * Construye el mensaje oficial para compartir por WhatsApp o redes.
 */
export const buildLoyaltyCardWhatsAppMessage = (
  customerName?: string,
  stamps: number = 0,
  publicId?: string
): string => {
  const firstName = customerName ? customerName.trim().split(' ')[0] : 'Clienta';
  const url = normalizeLoyaltyCardPublicUrl(publicId);
  const clampedStamps = Math.min(Math.max(stamps, 0), 10);
  const remaining = Math.max(0, 10 - clampedStamps);

  const statusText = clampedStamps >= 10
    ? '🎉 ¡Tienes tu premio listo para canjear en tu próxima visita!'
    : `⭐ Tienes ${clampedStamps}/10 sellos acumulados (te faltan ${remaining} para tu premio).`;

  return [
    `¡Hola ${firstName}! 💅✨`,
    '',
    `Aquí tienes tu Tarjeta Digital de Fidelización Bunny Pass:`,
    statusText,
    '',
    `📲 Ábrela aquí y agrégala a la pantalla de inicio de tu teléfono:`,
    url,
    '',
    `Presenta tu tarjeta al momento de tu cita en BunnyCure Studio. ¡Te esperamos! 💕`,
  ].join('\n');
};
