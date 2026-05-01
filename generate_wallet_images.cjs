const fs = require('fs');
const path = require('path');

// Configuración de Identidad BunnyCure
const COLORS = {
  bg: '#fdf6f3',
  text: '#5c3d2e',
  muted: '#9e7b6e',
  active: '#c9897a',
  activeStroke: '#7c3a2d',
  inactive: '#f0f0f0',
  inactiveStroke: '#d1d1d1',
  white: '#ffffff'
};

const REWARD_NAME = "MANICURE EXPRESS GRATIS"; // Puedes cambiar esto según tu campaña

const dir = './public/assets/wallet';
if (!fs.existsSync(dir)){
    fs.mkdirSync(dir, { recursive: true });
}

function generateSVG(stamps) {
  const sellos = [];
  for (let i = 0; i < 10; i++) {
    const row = Math.floor(i / 5);
    const col = i % 5;
    const x = col * 160;
    const y = row * 90;
    const isOk = i < stamps;
    
    sellos.push(`    <use href="#sello-${isOk ? 'ok' : 'off'}" x="${x}" y="${y}" />`);
  }

  return `<svg width="1032" height="336" viewBox="0 0 1032 336" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="${COLORS.bg}" />
  
  <!-- Encabezado -->
  <text x="50%" y="55" font-family="Segoe UI, Roboto, sans-serif" font-size="28" font-weight="bold" fill="${COLORS.text}" text-anchor="middle" letter-spacing="1">BUNNYCURE LOYALTY</text>
  <text x="50%" y="85" font-family="Segoe UI, Roboto, sans-serif" font-size="14" fill="${COLORS.muted}" text-anchor="middle">Colecciona 10 sellos y reclama tu beneficio</text>

  <defs>
    <!-- Icono Conejo Lucide Style -->
    <symbol id="bunny" viewBox="0 0 24 24">
      <path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M13 16a3 3 0 0 1 2.24 5M18 10.5V6a3 3 0 0 0-3-3H9a3 3 0 0 0-3 3v4.5M10 10.5a1.5 1.5 0 1 0 3 0 1.5 1.5 0 0 0-3 0ZM6 10.5h12c1.7 0 3 1.3 3 3v3.5a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3v-3.5c0-1.7 1.3-3 3-3ZM10 16a3 3 0 0 0-2.24 5"/>
    </symbol>
    
    <!-- Estado: Sello Completado -->
    <g id="sello-ok">
      <circle cx="0" cy="0" r="35" fill="${COLORS.active}" stroke="${COLORS.activeStroke}" stroke-width="2" />
      <use href="#bunny" x="-20" y="-20" width="40" height="40" color="${COLORS.white}" />
    </g>
    
    <!-- Estado: Sello Pendiente -->
    <g id="sello-off">
      <circle cx="0" cy="0" r="35" fill="${COLORS.inactive}" stroke="${COLORS.inactiveStroke}" stroke-width="1.5" />
      <use href="#bunny" x="-20" y="-20" width="40" height="40" color="${COLORS.inactiveStroke}" />
    </g>
  </defs>

  <!-- Grilla de 10 Sellos (2 filas de 5) -->
  <g transform="translate(196, 140)">
${sellos.join('\n')}
  </g>

  <!-- Pie de página dinámico con Premio -->
  <rect x="230" y="275" width="572" height="40" rx="20" fill="${COLORS.white}" stroke="#f0e0d8" />
  <text x="50%" y="301" font-family="Segoe UI, Roboto, sans-serif" font-size="15" font-weight="bold" fill="${COLORS.activeStroke}" text-anchor="middle">
    ${stamps}/10 SELLOS — ${stamps === 10 ? '¡PREMIO DISPONIBLE PARA CANJEAR!' : `PRÓXIMO: ${REWARD_NAME}`}
  </text>
</svg>`;
}

// Generar las 11 variaciones
for (let i = 0; i <= 10; i++) {
  fs.writeFileSync(path.join(dir, `hero_${i}.svg`), generateSVG(i));
}

console.log('✅ 11 variaciones de Hero Image generadas en ./public/assets/wallet/');
