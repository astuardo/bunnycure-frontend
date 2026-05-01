const GIFTCARD_PUBLIC_BASE = 'https://app.bunnycure.cl';

const buildFallbackGiftCardUrl = (code?: string): string =>
  code ? `${GIFTCARD_PUBLIC_BASE}/giftcards/public/${encodeURIComponent(code)}` : GIFTCARD_PUBLIC_BASE;

export const normalizeGiftCardPublicUrl = (publicUrl?: string | null, code?: string): string => {
  if (!publicUrl?.trim()) {
    return buildFallbackGiftCardUrl(code);
  }

  try {
    const parsed = new URL(publicUrl, GIFTCARD_PUBLIC_BASE);
    parsed.protocol = 'https:';
    parsed.host = 'app.bunnycure.cl';

    if (!parsed.pathname || parsed.pathname === '/') {
      parsed.pathname = code ? `/giftcards/public/${encodeURIComponent(code)}` : '/giftcards/public';
    }

    return parsed.toString();
  } catch {
    return buildFallbackGiftCardUrl(code);
  }
};

