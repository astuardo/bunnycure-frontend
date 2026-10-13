/**
 * Utilidades para compartir, copiar enlaces y abrir WhatsApp de forma robusta
 * tanto en navegadores de escritorio como en móviles (iOS Safari, Android) y PWAs instaladas.
 */

/**
 * Copia texto al portapapeles de manera 100% compatible con móviles (iOS Safari, Android) y PWAs standalone.
 * Combina la API moderna `navigator.clipboard` con un fallback universal usando `<textarea>` adaptado para iOS.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  if (!text) return false;

  // 1. Intentar API moderna navigator.clipboard
  if (typeof navigator !== 'undefined' && navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (err) {
      console.warn('[copyToClipboard] navigator.clipboard falló o bloqueado, usando fallback universal:', err);
    }
  }

  // 2. Fallback universal compatible con iOS Safari y Android
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
    textArea.style.opacity = '0';

    // ¡CRÍTICO PARA iOS SAFARI!:
    // NO asignar textArea.setAttribute('readonly', '') porque iOS Safari no permite copiar de elementos readonly con execCommand.
    textArea.contentEditable = 'true';
    textArea.readOnly = false;

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
 * Idéntico a toWhatsAppPhone en giftcardRenderer.ts pero cubre variaciones de 8, 9, 10 y 11 dígitos.
 */
export const toWhatsAppPhone = (value?: string): string => {
  const digits = (value || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('56')) {
    if (digits.length === 11) return digits;
    if (digits.length === 10 && !digits.startsWith('569')) return `569${digits.slice(2)}`;
    return digits;
  }
  if (digits.length === 9 && digits.startsWith('9')) return `56${digits}`;
  if (digits.length === 8) return `569${digits}`;
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
 * Abre WhatsApp de forma directa evitando popup blockers en móviles y PWAs instaladas.
 */
export function openWhatsApp(phone?: string, text?: string): void {
  const waUrl = buildWhatsAppUrl(phone, text);
  const isMobile = typeof navigator !== 'undefined' && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

  if (isMobile) {
    // En móviles o PWAs standalone, un enlace <a> temporal disparado directamente en el evento
    // asegura la apertura fluida de la app WhatsApp sin ventanas en blanco o bloqueo de popups.
    const a = document.createElement('a');
    a.href = waUrl;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      if (document.body.contains(a)) {
        document.body.removeChild(a);
      }
    }, 150);
  } else {
    window.open(waUrl, '_blank', 'noopener,noreferrer');
  }
}

/**
 * Abre una URL de forma segura en una nueva pestaña
 */
export function openExternalUrl(url: string): void {
  if (!url) return;
  const a = document.createElement('a');
  a.href = url;
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    if (document.body.contains(a)) {
      document.body.removeChild(a);
    }
  }, 150);
}

/**
 * Invoca el menú nativo para compartir (Web Share API) en iPhone y Android.
 * Soporta de manera fluida WhatsApp, Mensajes, AirDrop, etc.
 */
export async function shareNative(data: { title: string; text?: string; url?: string }): Promise<boolean> {
  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    try {
      const sharePayload: ShareData = {
        title: data.title,
        text: data.text,
        url: data.url,
      };

      const nav = navigator as Navigator & { canShare?: (payload: ShareData) => boolean };
      if (typeof nav.canShare === 'function' && !nav.canShare(sharePayload)) {
        // Fallback si la plataforma no acepta url separada
        const fallbackText = data.text && data.url && !data.text.includes(data.url)
          ? `${data.text}\n${data.url}`
          : (data.text || data.url || '');
        const fallbackPayload: ShareData = {
          title: data.title,
          text: fallbackText,
        };
        if (nav.canShare(fallbackPayload)) {
          await navigator.share(fallbackPayload);
          return true;
        }
        return false;
      }

      await navigator.share(sharePayload);
      return true;
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        // Cancelado voluntariamente por la usuaria
        return true;
      }
      console.warn('[shareNative] Error en navigator.share:', err);
    }
  }
  return false;
}
