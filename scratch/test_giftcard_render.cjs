const fs = require('fs');
const { createCanvas, loadImage } = require('canvas');
const QRCode = require('qrcode');

async function testRender() {
  const bg = await loadImage('public/giftcard_fondo.png');
  const width = bg.width;
  const height = bg.height;

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // Draw background template
  ctx.drawImage(bg, 0, 0, width, height);

  // Bottom Box
  const boxX = Math.round(width * 0.20);
  const boxY = Math.round(height * 0.655);
  const boxW = Math.round(width * 0.56);
  const boxH = Math.round(height * 0.24);

  // Background subtle card for legibility (optional soft glass/glow)
  ctx.save();
  ctx.fillStyle = 'rgba(255, 253, 250, 0.72)';
  ctx.shadowColor = 'rgba(120, 60, 80, 0.08)';
  ctx.shadowBlur = 16;
  ctx.shadowOffsetY = 4;
  
  // Rounded rect
  const r = 16;
  ctx.beginPath();
  ctx.moveTo(boxX + r, boxY);
  ctx.lineTo(boxX + boxW - r, boxY);
  ctx.quadraticCurveTo(boxX + boxW, boxY, boxX + boxW, boxY + r);
  ctx.lineTo(boxX + boxW, boxY + boxH - r);
  ctx.quadraticCurveTo(boxX + boxW, boxY + boxH, boxX + boxW - r, boxY + boxH);
  ctx.lineTo(boxX + r, boxY + boxH);
  ctx.quadraticCurveTo(boxX, boxY + boxH, boxX, boxY + boxH - r);
  ctx.lineTo(boxX, boxY + r);
  ctx.quadraticCurveTo(boxX, boxY, boxX + r, boxY);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = 'rgba(180, 140, 110, 0.35)';
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ctx.restore();

  // QR Code
  const publicUrl = 'https://app.bunnycure.cl/giftcards/public/GC-2026-000123';
  const qrDataUrl = await QRCode.toDataURL(publicUrl, {
    errorCorrectionLevel: 'M',
    margin: 1,
    color: { dark: '#5c1d42', light: '#ffffff' },
    width: 260,
  });
  const qrImg = await loadImage(qrDataUrl);

  const qrSize = Math.round(boxH * 0.72);
  const qrX = boxX + boxW - qrSize - 20;
  const qrY = boxY + Math.round((boxH - qrSize) / 2);

  ctx.save();
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = 'rgba(100, 40, 70, 0.15)';
  ctx.shadowBlur = 8;
  ctx.fillRect(qrX - 6, qrY - 6, qrSize + 12, qrSize + 12);
  ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);
  ctx.restore();

  // Text details on left
  const textX = boxX + 22;
  const textMaxW = qrX - textX - 16;
  const fontFam = '"Segoe UI", "Avenir Next", Arial, sans-serif';

  // Title: Beneficiary
  ctx.textBaseline = 'top';
  ctx.fillStyle = '#61214e';
  ctx.font = `bold 26px ${fontFam}`;
  ctx.fillText('Para: Valentina Morales', textX, boxY + 20, textMaxW);

  // Code
  ctx.font = `600 19px ${fontFam}`;
  ctx.fillStyle = '#7a2b64';
  ctx.fillText('Código: ', textX, boxY + 62);
  ctx.font = `bold 19px ${fontFam}`;
  ctx.fillStyle = '#3a122e';
  ctx.fillText('GC-2026-000123', textX + 75, boxY + 62);

  // PIN
  ctx.font = `600 19px ${fontFam}`;
  ctx.fillStyle = '#7a2b64';
  ctx.fillText('PIN de canje: ', textX, boxY + 95);
  ctx.font = `bold 20px ${fontFam}`;
  ctx.fillStyle = '#a62450';
  ctx.fillText('482910', textX + 115, boxY + 95);

  // Expiry
  ctx.font = `600 17px ${fontFam}`;
  ctx.fillStyle = '#7a2b64';
  ctx.fillText('Válida hasta: ', textX, boxY + 128);
  ctx.font = `500 17px ${fontFam}`;
  ctx.fillStyle = '#553045';
  ctx.fillText('16/08/2027', textX + 110, boxY + 128);

  // QR label
  ctx.font = `600 12px ${fontFam}`;
  ctx.fillStyle = '#7a2b64';
  ctx.textAlign = 'center';
  ctx.fillText('Escanea para canjear', qrX + qrSize / 2, qrY + qrSize + 9);

  const outBuf = canvas.toBuffer('image/png');
  fs.writeFileSync('test_output_giftcard.png', outBuf);
  console.log('Successfully generated test_output_giftcard.png');
}

testRender().catch(console.error);
