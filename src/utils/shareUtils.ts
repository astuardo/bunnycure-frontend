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
 * Abre WhatsApp de manera 100% compatible con móviles, PWAs y navegadores de escritorio.
 * Usa un elemento <a> dinámico con click directo para evitar bloqueos de popup y de webview standalone.
 */
export function openWhatsApp(phone?: string, text?: string): void {
  const waUrl = buildWhatsAppUrl(phone, text);

  try {
    const link = document.createElement('a');
    link.href = waUrl;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      try {
        if (link.parentNode) {
          link.parentNode.removeChild(link);
        }
      } catch {
        // Ignorar
      }
    }, 300);
  } catch (err) {
    console.warn('[openWhatsApp] Fallback a navegación directa:', err);
    window.location.href = waUrl;
  }
}

/**
 * Abre una URL de forma segura en dispositivos móviles o PWAs standalone
 */
export function openExternalUrl(url: string): void {
  if (!url) return;

  try {
    const link = document.createElement('a');
    link.href = url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      try {
        if (link.parentNode) {
          link.parentNode.removeChild(link);
        }
      } catch {
        // Ignorar
      }
    }, 300);
  } catch (err) {
    console.warn('[openExternalUrl] Fallback a navegación directa:', err);
    window.location.href = url;
  }
}

/**
 * Intenta invocar el menú nativo para compartir (Web Share API) en iPhone / Android
 */
export async function shareNative(data: { title: string; text?: string; url: string }): Promise<boolean> {
  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    try {
      if (typeof navigator.canShare === 'function') {
        if (navigator.canShare(data)) {
          await navigator.share(data);
          return true;
        } else if (navigator.canShare({ text: data.text || data.url })) {
          await navigator.share({ title: data.title, text: data.text || data.url });
          return true;
        }
      } else {
        await navigator.share(data);
        return true;
      }
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
