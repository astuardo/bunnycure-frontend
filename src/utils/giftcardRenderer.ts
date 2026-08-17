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

export const GIFT_CARD_SERIF_FONT = "'Cormorant Garamond', 'Playfair Display', Georgia, serif";
export const GIFT_CARD_SANS_FONT = "'Montserrat', 'Segoe UI', system-ui, -apple-system, sans-serif";

export const toWhatsAppPhone = (value?: string): string => {
  const digits = (value || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('56')) return digits;
  if (digits.length === 9 && digits.startsWith('9')) return `56${digits}`;
  return digits;
};

export const isBlankGiftCardBeneficiary = (name?: string): boolean => {
  if (!name) return true;
  const normalized = name.trim().toLowerCase();
  return normalized === 'al portador' || normalized.includes('portador') || normalized.includes('en blanco') || normalized === 'por asignar';
};

export const buildGiftCardWhatsAppMessage = (data: GiftCardRenderData): string => {
  const isBlank = isBlankGiftCardBeneficiary(data.beneficiaryName);
  const beneficiary = data.beneficiaryName || 'Beneficiaria';
  const pinValue = data.pin || 'No disponible';
  const expiry = data.expiresOn || '-';
  const normalizedUrl = normalizeGiftCardPublicUrl(data.publicUrl, data.code);

  const greeting = isBlank
    ? '¡Hola! Aquí tienes una GiftCard BunnyCure al portador 🎁✨'
    : `Hola ${beneficiary}, ¡aquí está tu GiftCard BunnyCure! 🎁✨`;

  return (
    `${greeting}\n\n` +
    `📌 Código: ${data.code}\n` +
    `🔐 PIN de canje: ${pinValue}\n` +
    `📅 Válida hasta: ${expiry}\n` +
    `🔗 Ver saldo y canjear: ${normalizedUrl}\n\n` +
    `Presenta este código o escanea el QR al momento de tu atención en BunnyCure.`
  );
};

const getGiftCardInfoBox = (width: number, height: number): GiftCardInfoBox => ({
  x: Math.round(width * 0.25),
  y: Math.round(height * 0.67),
  width: Math.round(width * 0.51),
  height: Math.round(height * 0.18),
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
  fontSize: number,
  labelColor = '#825942',
  valueColor = '#2c170e',
  boldValue = false
): void => {
  context.font = `500 ${fontSize}px ${GIFT_CARD_SANS_FONT}`;
  context.fillStyle = labelColor;
  const labelText = `${label}: `;
  context.fillText(labelText, x, y, maxWidth);
  const labelWidth = Math.min(context.measureText(labelText).width, Math.max(12, maxWidth - 12));

  context.font = `${boldValue ? '600' : '400'} ${fontSize}px ${GIFT_CARD_SANS_FONT}`;
  context.fillStyle = valueColor;
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
  const qrSize = Math.max(80, Math.min(100, Math.floor(box.height * 0.52)));
  const qrPadding = 5;
  const qrCardWidth = qrSize + qrPadding * 2;
  const qrCardHeight = qrSize + qrPadding * 2;
  const maxTextWidth = box.width - qrCardWidth - 25;

  const isBlank = isBlankGiftCardBeneficiary(data.beneficiaryName);
  const displayTitle = isBlank ? 'GiftCard al Portador' : `Para: ${data.beneficiaryName || 'Beneficiaria'}`;

  const titleFontSize = Math.max(22, Math.min(28, Math.floor(box.height * 0.15)));
  const detailsFontSize = Math.max(13, Math.min(16, Math.floor(box.height * 0.082)));
  const rowGap = Math.max(5, Math.floor(detailsFontSize * 0.55));
  let cursorY = box.y + 8;

  context.textBaseline = 'top';

  // 1. Título / Beneficiaria con tipografía Serif elegante
  context.fillStyle = '#422314';
  context.font = `italic 600 ${titleFontSize}px ${GIFT_CARD_SERIF_FONT}`;
  context.fillText(fitText(context, displayTitle, maxTextWidth), box.x, cursorY, maxTextWidth);
  cursorY += titleFontSize + Math.max(6, rowGap);

  // 2. Línea divisoria decorativa sutil en tono oro
  context.save();
  const dividerWidth = Math.min(180, maxTextWidth);
  const grad = context.createLinearGradient(box.x, cursorY, box.x + dividerWidth, cursorY);
  grad.addColorStop(0, 'rgba(200, 160, 120, 0.85)');
  grad.addColorStop(1, 'rgba(200, 160, 120, 0.0)');
  context.strokeStyle = grad;
  context.lineWidth = 1.2;
  context.beginPath();
  context.moveTo(box.x, cursorY + 2);
  context.lineTo(box.x + dividerWidth, cursorY + 2);
  context.stroke();
  context.restore();
  cursorY += 10;

  // 3. Líneas de detalles: Código, PIN, Vencimiento
  drawGiftCardLine(context, box.x, cursorY, maxTextWidth, 'Código', data.code, detailsFontSize, '#825942', '#2c170e', true);
  cursorY += detailsFontSize + rowGap;
  drawGiftCardLine(context, box.x, cursorY, maxTextWidth, 'PIN de canje', data.pin, detailsFontSize, '#825942', '#8c2a3e', true);
  cursorY += detailsFontSize + rowGap;
  drawGiftCardLine(context, box.x, cursorY, maxTextWidth, 'Válida hasta', data.expiresOn, detailsFontSize, '#825942', '#422314');

  // 4. Renderizar Código QR compacto a la derecha
  if (data.publicUrl) {
    try {
      const qrDataUrl = await QRCode.toDataURL(data.publicUrl, {
        errorCorrectionLevel: 'M',
        margin: 1,
        color: {
          dark: '#382015',
          light: '#ffffff',
        },
        width: 260,
      });

      const qrImg = await new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = qrDataUrl;
      });

      const qrX = box.x + box.width - qrCardWidth;
      const qrY = box.y + 4;

      // Tarjeta blanca compacta con sutil borde dorado para el QR
      context.save();
      context.fillStyle = '#ffffff';
      context.shadowColor = 'rgba(90, 50, 30, 0.12)';
      context.shadowBlur = 8;
      context.shadowOffsetY = 2;
      drawRoundedRect(context, qrX, qrY, qrCardWidth, qrCardHeight, 6);
      context.fill();

      context.strokeStyle = 'rgba(200, 160, 120, 0.6)';
      context.lineWidth = 1;
      drawRoundedRect(context, qrX, qrY, qrCardWidth, qrCardHeight, 6);
      context.stroke();
      context.restore();

      // Dibujar imagen del QR
      context.drawImage(qrImg, qrX + qrPadding, qrY + qrPadding, qrSize, qrSize);

      // Texto de guía centrado debajo del QR
      context.save();
      context.font = `600 ${Math.max(9, Math.floor(detailsFontSize * 0.68))}px ${GIFT_CARD_SANS_FONT}`;
      context.fillStyle = '#825942';
      context.textAlign = 'center';
      context.fillText('Escanea para canjear', qrX + qrCardWidth / 2, qrY + qrCardHeight + 4);
      context.restore();
    } catch {
      // Ignorar fallo de QR
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

/**
 * Genera e imprime o guarda en PDF la GiftCard con formato de tarjeta de regalo lista para entregar
 */
export const printOrDownloadGiftCardPdf = async (data: GiftCardRenderData): Promise<void> => {
  const pngBlob = await renderGiftCardPng(data);
  const pngUrl = URL.createObjectURL(pngBlob);

  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) throw new Error('No se pudo abrir ventana de impresión');

  doc.open();
  doc.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>GiftCard BunnyCure - ${data.code}</title>
        <style>
          @page {
            size: letter portrait;
            margin: 15mm;
          }
          body {
            font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            margin: 0;
            padding: 0;
            color: #422314;
            background: #fff;
            text-align: center;
          }
          .giftcard-container {
            max-width: 650px;
            margin: 0 auto;
            border: 2px dashed #eed0c5;
            border-radius: 16px;
            padding: 16px;
            page-break-inside: avoid;
          }
          .giftcard-image {
            width: 100%;
            height: auto;
            border-radius: 12px;
            box-shadow: 0 4px 15px rgba(90, 50, 30, 0.15);
            display: block;
          }
          .instructions {
            margin-top: 16px;
            font-size: 12px;
            color: #8c6052;
            line-height: 1.5;
            text-align: left;
            padding: 12px 16px;
            background: #fdf6f3;
            border-radius: 10px;
            border: 1px solid #eed0c5;
          }
          .instructions strong {
            color: #8c2a3e;
          }
          .cut-line {
            margin-top: 14px;
            font-size: 11px;
            color: #b09080;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
          }
        </style>
      </head>
      <body>
        <div class="giftcard-container">
          <img src="${pngUrl}" class="giftcard-image" alt="GiftCard BunnyCure" />
          <div class="instructions">
            <div><strong>🐰 BunnyCure &bull; Tarjeta de Regalo Oficial</strong></div>
            <div>&bull; <strong>Código:</strong> ${data.code} | <strong>PIN de canje:</strong> ${data.pin}</div>
            <div>&bull; <strong>Válida hasta:</strong> ${data.expiresOn}</div>
            <div>&bull; <strong>Cómo canjear:</strong> Presenta esta tarjeta o escanea el código QR al momento de tu atención en nuestro salón.</div>
            <div>&bull; <strong>Reservas y Consultas:</strong> +56 9 8887 3031 | app.bunnycure.cl</div>
          </div>
          <div class="cut-line">✂️ ---------------- Recorta por la línea punteada para regalar ---------------- ✂️</div>
        </div>
      </body>
    </html>
  `);
  doc.close();

  iframe.contentWindow?.focus();
  setTimeout(() => {
    iframe.contentWindow?.print();
    setTimeout(() => {
      document.body.removeChild(iframe);
      URL.revokeObjectURL(pngUrl);
    }, 1000);
  }, 400);
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
