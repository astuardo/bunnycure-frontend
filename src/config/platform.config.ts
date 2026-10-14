/**
 * Configuración de la Plataforma SaaS (Software Multitenant)
 * 
 * NOTA DE ARQUITECTURA:
 * - "BunnyCure Studio" es el Salón 1 (salón piloto y caso de éxito real).
 * - Esta plataforma es el motor SaaS para gestionar múltiples salones de belleza, spas y clínicas estéticas.
 * - Puedes cambiar el nombre provisional de la plataforma modificando `DEFAULT_PLATFORM_NAME`
 *   o mediante la variable de entorno `VITE_PLATFORM_NAME`.
 */

export interface TenantColorPreset {
  id: string;
  name: string;
  category: string;
  primary: string;
  secondary: string;
  accent: string;
  badge: string;
}

export const PLATFORM_CONFIG = {
  // Nombre provisional de la plataforma (fácilmente personalizable)
  name: import.meta.env.VITE_PLATFORM_NAME || 'AuraSalon OS',
  shortName: import.meta.env.VITE_PLATFORM_SHORT_NAME || 'AuraSalon',
  tagline: 'El sistema operativo integral para salones boutique, spas y estudios de belleza',
  slogan: 'Tu salón, tu marca, tu propio ecosistema digital.',
  supportWhatsApp: '+56983692046',
  supportWhatsAppDisplay: '+56 9 8369 2046',
  contactEmail: 'hola@bunnycure.cl',
  domain: 'bunnycure.cl',
  appDomain: 'app.bunnycure.cl',

  // Colores Base de la Plataforma (Lienzo neutral, elegante y profesional estilo Linear/Apple)
  baseColors: {
    darkBg: '#0c0b0e',
    darkCard: '#141318',
    darkCardHover: '#1c1a22',
    darkBorder: '#272630',
    textMain: '#fbf8f5',
    textMuted: '#9b98a6',
    neutralGray: '#64748b',
    neutralLight: '#f8fafc',
  },

  // Salón Piloto / Caso de Estudio Destacado
  flagshipTenant: {
    name: 'BunnyCure Studio',
    slug: 'bunnycure',
    category: 'Nail Art & Beauty Studio (Salón Piloto)',
    quote: '«Automatizamos el 90% de las confirmaciones de citas y eliminamos las tarjetas de papel. Nuestras clientas aman tener su tarjeta en Apple Wallet.»',
    owner: 'Cami & Alfredo',
    location: 'Santiago, Chile',
  },

  // Presets de Marcas para demostración del sistema Whitelabel
  themePresets: [
    {
      id: 'bunnycure',
      name: 'BunnyCure Studio',
      category: 'Nail Art & Beauty Bar (Salón 1 / Piloto)',
      primary: '#d48b70',
      secondary: '#6B4C38',
      accent: '#f7c59f',
      badge: 'Terracota Cálido',
    },
    {
      id: 'luxe-gold',
      name: 'Luxe Brow & Lash Bar',
      category: 'Miradas & Estética Facial',
      primary: '#eab308',
      secondary: '#713f12',
      accent: '#fef08a',
      badge: 'Dorado & Champán',
    },
    {
      id: 'emerald-spa',
      name: 'Botanical Wellness Spa',
      category: 'Spa, Masajes & Cuidado Holístico',
      primary: '#10b981',
      secondary: '#064e3b',
      accent: '#a7f3d0',
      badge: 'Verde Salvia & Esmeralda',
    },
    {
      id: 'velvet-lavender',
      name: 'Velvet Hair & Color Atelier',
      category: 'Peluquería & Colorimetría de Autor',
      primary: '#a855f7',
      secondary: '#3b0764',
      accent: '#e9d5ff',
      badge: 'Lavanda & Púrpura',
    },
    {
      id: 'noir-minimal',
      name: 'Atelier Monochrome',
      category: 'Estudio de Belleza Minimalista',
      primary: '#38bdf8',
      secondary: '#0f172a',
      accent: '#bae6fd',
      badge: 'Cyan Futurista & Dark',
    },
  ] as TenantColorPreset[],
};
