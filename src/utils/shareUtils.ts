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
 * Construye el enlace universal para WhatsApp
 */
export function buildWhatsAppUrl(phone?: string, text?: string): string {
  const cleanPhone = phone ? phone.replace(/[^0-9]/g, '') : '';
  let finalPhone = cleanPhone;
  if (finalPhone && finalPhone.startsWith('9') && finalPhone.length === 9) {
    finalPhone = '56' + finalPhone;
  }

  const encodedText = text ? encodeURIComponent(text) : '';
  return finalPhone
    ? `https://api.whatsapp.com/send?phone=${finalPhone}&text=${encodedText}`
    : `https://api.whatsapp.com/send?text=${encodedText}`;
}

/**
 * Abre WhatsApp de manera compatible con móviles, PWAs y navegadores de escritorio.
 * En móviles y PWAs standalone, `window.open(..., '_blank')` es bloqueado por el navegador;
 * la asignación a `window.location.href` o navegación directa abre la app nativa de WhatsApp sin bloqueos.
 */
export function openWhatsApp(phone?: string, text?: string): void {
  const waUrl = buildWhatsAppUrl(phone, text);

  const isMobileOrPwa =
    typeof navigator !== 'undefined' &&
    (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent) ||
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as unknown as { standalone?: boolean }).standalone === true);

  if (isMobileOrPwa) {
    window.location.href = waUrl;
  } else {
    window.open(waUrl, '_blank', 'noopener,noreferrer');
  }
}

/**
 * Abre una URL de forma segura en dispositivos móviles o PWAs standalone
 */
export function openExternalUrl(url: string): void {
  if (!url) return;

  const isStandalone =
    typeof window !== 'undefined' &&
    (window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as unknown as { standalone?: boolean }).standalone === true);

  if (isStandalone) {
    window.location.href = url;
  } else {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
}

/**
 * Intenta invocar el menú nativo para compartir (Web Share API) en iPhone / Android
 */
export async function shareNative(data: { title: string; text?: string; url: string }): Promise<boolean> {
  if (typeof navigator !== 'undefined' && navigator.share) {
    try {
      await navigator.share(data);
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
