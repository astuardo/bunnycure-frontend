/** @type {import('tailwindcss').Config} */
export default {
  // La app no tiene modo oscuro: las clases dark: solo aplican con .dark (nunca), no con el tema del sistema
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        bunny: {
          primary: '#C9897A',
          'primary-hover': '#B77768',
          'primary-dark': '#7C3A2D',
          'primary-light': '#FDF0EC',
          secondary: '#6B4C38',
          cocoa: '#5D534A',
          'cocoa-light': '#8C8279',
          sand: '#F2EBE0',
          beige: '#E6E2DD',
          paper: '#FDFCF8',
          border: '#F0E0D8',
          'border-strong': '#E8CFC4',
          text: '#5C3D2E',
          'text-muted': '#9E7B6E',
          success: '#4B856E',
          danger: '#BE4D4D',
          warning: '#E6993A',
          info: '#8C5B76',
        },
      },
      boxShadow: {
        bunny: '0 2px 12px rgba(180, 120, 100, 0.08)',
        'bunny-lg': '0 8px 24px rgba(180, 120, 100, 0.12)',
      },
      borderRadius: {
        bunny: '12px',
        'bunny-lg': '16px',
      },
      // Entradas: salida exponencial desde un estado ya casi visible (sin rebotes). Con
      // prefers-reduced-motion, index.css deja solo el fundido.
      keyframes: {
        'fade-in': { from: { opacity: '0' }, to: { opacity: '1' } },
        'slide-up': { from: { opacity: '0', transform: 'translateY(12px)' }, to: { opacity: '1', transform: 'none' } },
        pop: { from: { opacity: '0', transform: 'scale(0.92)' }, to: { opacity: '1', transform: 'none' } },
        'drawer-in': { from: { transform: 'translateX(-100%)' }, to: { transform: 'translateX(0)' } },
      },
      animation: {
        'fade-in': 'fade-in 200ms cubic-bezier(0.16, 1, 0.3, 1) both',
        fadeIn: 'fade-in 200ms cubic-bezier(0.16, 1, 0.3, 1) both',
        'slide-up': 'slide-up 300ms cubic-bezier(0.16, 1, 0.3, 1) both',
        pop: 'pop 400ms cubic-bezier(0.16, 1, 0.3, 1) both',
        'drawer-in': 'drawer-in 260ms cubic-bezier(0.32, 0.72, 0, 1)',
      },
    },
  },
  // En táctil el :hover queda pegado tras tocar: hover: solo aplica con mouse/trackpad
  future: {
    hoverOnlyWhenSupported: true,
  },
  plugins: [
    // touch: solo en pantallas táctiles (dedo), para agrandar áreas de toque sin cambiar el escritorio
    ({ addVariant }) => addVariant('touch', '@media (pointer: coarse)'),
  ],
}
