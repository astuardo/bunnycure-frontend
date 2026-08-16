import QRCode from 'qrcode';
import { normalizeGiftCardPublicUrl } from './giftcardUrl';

export const GIFTCARD_BACKGROUND_TEMPLATE = '/giftcard_fondo.png';

export interface GiftCardRenderData {
  beneficiaryName: string;
  code: string;
  pin: string;
  expiresOn: string;
  publicUrl: string;
}

export interface ShareGiftCardOptions {
  data: GiftCardRenderData;
  beneficiaryPhone?: string;
  onSuccess?: (msg: string) => void;
  onError?: (msg: string) => void;
  onInfo?: (msg: string) => void;
}

export interface SendWhatsAppOptions {
  data: GiftCardRenderData;
  beneficiaryPhone?: string;
  onError?: (msg: string) => void;
}

interface GiftCardInfoBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

const GIFT_CARD_FONT_FAMILY = '"Avenir Next", "Segoe UI", "Helvetica Neue", Arial, sans-serif';

export const toWhatsAppPhone = (value?: string): string => {
  const digits = (value || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('56')) return digits;
  if (digits.length === 9 && digits.startsWith('9')) return `56${digits}`;
  return digits;
};

export const buildGiftCardWhatsAppMessage = (data: GiftCardRenderData): string => {
  const beneficiary = data.beneficiaryName || 'Beneficiaria';
  const pinValue = data.pin || 'No disponible';
  const expiry = data.expiresOn || '-';
  const normalizedUrl = normalizeGiftCardPublicUrl(data.publicUrl, data.code);

  return (
    `Hola ${beneficiary}, ¡aquí está tu GiftCard BunnyCure! 🎁✨\n\n` +
    `📌 Código: ${data.code}\n` +
    `🔐 PIN de canje: ${pinValue}\n` +
    `📅 Válida hasta: ${expiry}\n` +
    `🔗 Ver saldo y canjear: ${normalizedUrl}\n\n` +
    `Presenta este código o escanea el QR al momento de tu atención en BunnyCure.`
  );
};

const getGiftCardInfoBox = (width: number, height: number): GiftCardInfoBox => ({
  x: Math.round(width * 0.54),
  y: Math.round(height * 0.32),
  width: Math.round(width * 0.40),
  height: Math.round(height * 0.48),
});

const fitText = (context: CanvasRenderingContext2D, text: string, maxWidth: number): string => {
  if (context.measureText(text).width <= maxWidth) return text;

  let content = text;
  while (content.length > 3 && context.measureText(`${content}...`).width > maxWidth) {
    content = content.slice(0, -1);
  }
  return `${content.trimEnd()}...`;
};

const drawGiftCardLine = (
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  maxWidth: number,
  label: string,
  value: string,
  fontSize: number
): void => {
  context.font = `600 ${fontSize}px ${GIFT_CARD_FONT_FAMILY}`;
  context.fillStyle = '#8c2f74';
  const labelText = `${label}: `;
  context.fillText(labelText, x, y, maxWidth);
  const labelWidth = Math.min(context.measureText(labelText).width, Math.max(12, maxWidth - 12));

  context.font = `500 ${fontSize}px ${GIFT_CARD_FONT_FAMILY}`;
  context.fillStyle = '#a13a82';
  context.fillText(fitText(context, value, maxWidth - labelWidth), x + labelWidth, y, maxWidth - labelWidth);
};

const drawRoundedRect = (
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
): void => {
  context.beginPath();
  context.moveTo(x + radius, y);
  context.lineTo(x + width - radius, y);
  context.quadraticCurveTo(x + width, y, x + width, y + radius);
  context.lineTo(x + width, y + height - radius);
  context.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  context.lineTo(x + radius, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - radius);
  context.lineTo(x, y + radius);
  context.quadraticCurveTo(x, y, x + radius, y);
  context.closePath();
};

const drawGiftCardInfoWithQr = async (
  context: CanvasRenderingContext2D,
  box: GiftCardInfoBox,
  data: GiftCardRenderData
): Promise<void> => {
  const paddingX = Math.max(14, Math.floor(box.width * 0.05));
  const paddingY = Math.max(12, Math.floor(box.height * 0.06));
  const maxTextWidth = Math.max(10, box.width - paddingX * 2);
  const titleFontSize = Math.max(22, Math.min(36, Math.floor(box.height * 0.11)));
  const detailsFontSize = Math.max(14, Math.min(22, Math.floor(box.height * 0.065)));
  const sectionGap = Math.max(10, Math.floor(detailsFontSize * 0.9));
  const rowGap = Math.max(8, Math.floor(detailsFontSize * 0.8));
  let cursorY = box.y + paddingY;

  context.fillStyle = '#8c2f74';
  context.textBaseline = 'top';

  // 1. Título con nombre de beneficiaria
  context.font = `700 ${titleFontSize}px ${GIFT_CARD_FONT_FAMILY}`;
  context.fillText(fitText(context, data.beneficiaryName || 'Beneficiaria', maxTextWidth), box.x + paddingX, cursorY, maxTextWidth);
  cursorY += titleFontSize + sectionGap;

  // 2. Líneas de detalles: Código, PIN, Vencimiento
  drawGiftCardLine(context, box.x + paddingX, cursorY, maxTextWidth, 'Código', data.code, detailsFontSize);
  cursorY += detailsFontSize + rowGap;
  drawGiftCardLine(context, box.x + paddingX, cursorY, maxTextWidth, 'PIN', data.pin, detailsFontSize);
  cursorY += detailsFontSize + rowGap;
  drawGiftCardLine(context, box.x + paddingX, cursorY, maxTextWidth, 'Vence', data.expiresOn, detailsFontSize);
  cursorY += detailsFontSize + Math.max(14, sectionGap * 1.3);

  // 3. Renderizar Código QR Incrustado
  if (data.publicUrl) {
    try {
      const qrDataUrl = await QRCode.toDataURL(data.publicUrl, {
        errorCorrectionLevel: 'M',
        margin: 1,
        color: {
          dark: '#4a154b',
          light: '#ffffff',
        },
        width: 320,
      });

      const qrImg = await new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = qrDataUrl;
      });

      const qrSize = Math.max(120, Math.min(180, Math.floor(box.height * 0.45)));
      const qrCardPadding = 8;
      const qrCardWidth = qrSize + qrCardPadding * 2;
      const qrCardHeight = qrSize + qrCardPadding * 2;
      const qrX = box.x + paddingX;
      const qrY = cursorY;

      // Tarjeta blanca contenedora para garantizar contraste y escaneo óptimo
      context.save();
      context.fillStyle = '#ffffff';
      context.shadowColor = 'rgba(74, 21, 75, 0.18)';
      context.shadowBlur = 12;
      context.shadowOffsetX = 0;
      context.shadowOffsetY = 4;
      drawRoundedRect(context, qrX, qrY, qrCardWidth, qrCardHeight, 12);
      context.fill();
      context.restore();

      // Borde sutil
      context.save();
      context.strokeStyle = 'rgba(140, 47, 116, 0.2)';
      context.lineWidth = 1.5;
      drawRoundedRect(context, qrX, qrY, qrCardWidth, qrCardHeight, 12);
      context.stroke();
      context.restore();

      // Dibujar QR
      context.drawImage(qrImg, qrX + qrCardPadding, qrY + qrCardPadding, qrSize, qrSize);

      // Texto de guía al costado del QR
      const guideX = qrX + qrCardWidth + 14;
      const guideMaxW = box.x + box.width - guideX - paddingX;
      if (guideMaxW > 40) {
        context.font = `600 ${Math.max(11, Math.floor(detailsFontSize * 0.78))}px ${GIFT_CARD_FONT_FAMILY}`;
        context.fillStyle = '#8c2f74';
        context.fillText('Escanea el QR', guideX, qrY + Math.floor(qrCardHeight * 0.2), guideMaxW);

        context.font = `400 ${Math.max(10, Math.floor(detailsFontSize * 0.68))}px ${GIFT_CARD_FONT_FAMILY}`;
        context.fillStyle = '#a13a82';
        context.fillText('para ver saldo', guideX, qrY + Math.floor(qrCardHeight * 0.45), guideMaxW);
        context.fillText('y canjear online', guideX, qrY + Math.floor(qrCardHeight * 0.65), guideMaxW);
      }
    } catch {
      // Si falla la generación del QR no bloqueamos la generación de la tarjeta
    }
  }
};

export const renderGiftCardPng = async (data: GiftCardRenderData): Promise<Blob> =>
  new Promise((resolve, reject) => {
    const image = new Image();

    image.onload = async () => {
      try {
        const width = image.naturalWidth || image.width || 1748;
        const height = image.naturalHeight || image.height || 1240;
        const scale = 1;
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(width * scale);
        canvas.height = Math.round(height * scale);
        const context = canvas.getContext('2d');

        if (!context) {
          reject(new Error('No se pudo inicializar contexto de canvas'));
          return;
        }

        context.setTransform(scale, 0, 0, scale, 0, 0);
        context.drawImage(image, 0, 0, width, height);

        const infoBox = getGiftCardInfoBox(width, height);
        await drawGiftCardInfoWithQr(context, infoBox, data);

        canvas.toBlob((pngBlob) => {
          if (!pngBlob) {
            reject(new Error('No se pudo generar archivo PNG'));
            return;
          }
          resolve(pngBlob);
        }, 'image/png');
      } catch (err) {
        reject(err);
      }
    };

    image.onerror = () => {
      reject(new Error('No se pudo cargar la plantilla gráfica de GiftCard'));
    };

    image.src = `${GIFTCARD_BACKGROUND_TEMPLATE}?v=${Date.now()}`;
  });

export const downloadGiftCardPng = async (data: GiftCardRenderData, fileName?: string): Promise<void> => {
  const blob = await renderGiftCardPng(data);
  const fileUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = fileUrl;
  link.download = fileName || `giftcard-${data.code}.png`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(fileUrl);
};

export const shareGiftCardPng = async (options: ShareGiftCardOptions): Promise<void> => {
  const { data, beneficiaryPhone, onSuccess, onError, onInfo } = options;
  const message = buildGiftCardWhatsAppMessage(data);
  const waPhone = toWhatsAppPhone(beneficiaryPhone);

  try {
    const pngBlob = await renderGiftCardPng(data);
    const pngFile = new File([pngBlob], `giftcard-${data.code}.png`, { type: 'image/png' });
    const shareData: ShareData = { files: [pngFile], title: 'GiftCard BunnyCure', text: message };
    const nav = navigator as Navigator & { canShare?: (data: ShareData) => boolean };

    if (navigator.share && nav.canShare?.({ files: [pngFile] })) {
      await navigator.share(shareData);
      onSuccess?.('GiftCard generada y compartida');
    } else {
      // Fallback: Descarga directa y apertura de WhatsApp
      const fileUrl = URL.createObjectURL(pngBlob);
      const link = document.createElement('a');
      link.href = fileUrl;
      link.download = `giftcard-${data.code}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(fileUrl);

      if (waPhone) {
        const waUrl = `https://wa.me/${waPhone}?text=${encodeURIComponent(message)}`;
        window.open(waUrl, '_blank', 'noopener,noreferrer');
      }
      onInfo?.('PNG descargado. Se abrió WhatsApp para enviar los datos');
    }
  } catch (error) {
    // Si el usuario canceló el diálogo nativo de compartir, no es un error
    if (error instanceof Error && error.name === 'AbortError') {
      return;
    }
    onError?.('No se pudo generar o compartir la GiftCard');
  }
};

export const sendGiftCardWhatsApp = (options: SendWhatsAppOptions): void => {
  const { data, beneficiaryPhone, onError } = options;
  const waPhone = toWhatsAppPhone(beneficiaryPhone);

  if (!waPhone) {
    onError?.('La beneficiaria no tiene un teléfono válido para WhatsApp');
    return;
  }

  const message = buildGiftCardWhatsAppMessage(data);
  const waUrl = `https://wa.me/${waPhone}?text=${encodeURIComponent(message)}`;
  window.open(waUrl, '_blank', 'noopener,noreferrer');
};
