/**
 * Utilidades para compartir, copiar enlaces y abrir WhatsApp de forma robusta
 * tanto en navegadores de escritorio como en móviles (iOS Safari, Android) y PWAs instaladas.
 */

/**
 * Copia texto al portapapeles de manera 100% compatible con móviles y PWAs standalone.
 * Combina la API moderna `navigator.clipboard` con un fallback universal usando un elemento `<textarea>`.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  if (!text) return false;

  // 1. Intentar API moderna navigator.clipboard
  if (typeof navigator !== 'undefined' && navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (err) {
      console.warn('[copyToClipboard] navigator.clipboard falló, usando fallback legacy:', err);
    }
  }

  // 2. Fallback universal con textarea invisible
  try {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.top = '0';
    textArea.style.left = '0';
    textArea.style.width = '2em';
    textArea.style.height = '2em';
    textArea.style.padding = '0';
    textArea.style.border = 'none';
    textArea.style.outline = 'none';
    textArea.style.boxShadow = 'none';
    textArea.style.background = 'transparent';
    textArea.setAttribute('readonly', '');

    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    textArea.setSelectionRange(0, text.length);

    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    return successful;
  } catch (err) {
    console.error('[copyToClipboard] Fallback execCommand falló:', err);
    return false;
  }
}

/**
 * Normaliza un número telefónico al formato internacional de WhatsApp (ej. 56912345678)
 * Idéntico a toWhatsAppPhone en giftcardRenderer.ts
 */
export const toWhatsAppPhone = (value?: string): string => {
  const digits = (value || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('56')) return digits;
  if (digits.length === 9 && digits.startsWith('9')) return `56${digits}`;
  return digits;
};

/**
 * Construye el enlace universal oficial de WhatsApp usando wa.me (idéntico a GiftCard)
 */
export function buildWhatsAppUrl(phone?: string, text?: string): string {
  const waPhone = toWhatsAppPhone(phone);
  const encodedText = text ? encodeURIComponent(text) : '';
  if (waPhone) {
    return encodedText
      ? `https://wa.me/${waPhone}?text=${encodedText}`
      : `https://wa.me/${waPhone}`;
  }
  return encodedText
    ? `https://wa.me/?text=${encodedText}`
    : 'https://wa.me/';
}

/**
 * Abre WhatsApp de forma directa (idéntico a sendGiftCardWhatsApp en giftcardRenderer.ts)
 */
export function openWhatsApp(phone?: string, text?: string): void {
  const waUrl = buildWhatsAppUrl(phone, text);
  window.open(waUrl, '_blank', 'noopener,noreferrer');
}

/**
 * Abre una URL de forma segura en una nueva pestaña (idéntico a GiftCard)
 */
export function openExternalUrl(url: string): void {
  if (!url) return;
  window.open(url, '_blank', 'noopener,noreferrer');
}

/**
 * Intenta invocar el menú nativo para compartir (Web Share API) en iPhone / Android.
 * IMPORTANTE: Solo pasa `title` y `text` (donde el link ya viene incluido en `text`).
 * Esto es idéntico a shareGiftCardPng y evita que WhatsApp o iOS descarten el texto/enlace.
 */
export async function shareNative(data: { title: string; text?: string; url?: string }): Promise<boolean> {
  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    try {
      // El mensaje completo con la URL incluida si se pasó separada
      const fullText = data.text && data.url && !data.text.includes(data.url)
        ? `${data.text} ${data.url}`
        : (data.text || data.url || '');

      const sharePayload = {
        title: data.title,
        text: fullText,
      };

      const nav = navigator as Navigator & { canShare?: (payload: any) => boolean };
      if (typeof nav.canShare === 'function' && !nav.canShare(sharePayload)) {
        return false;
      }

      await navigator.share(sharePayload);
      return true;
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        // Usuario canceló el modal nativo
        return true;
      }
      console.warn('[shareNative] Falló navigator.share:', err);
    }
  }
  return false;
}
