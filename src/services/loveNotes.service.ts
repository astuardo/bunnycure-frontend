/**
 * Servicio de Mensajes de Amor y Dedicatorias Románticas para Cami
 * Gestiona el control de frecuencia diaria y la obtención de citas de amor.
 */

export interface LoveNote {
  id: number;
  message: string;
  author?: string;
  tag?: string;
}

const CAMI_LOVE_STORAGE_KEY = 'bunnycure_cami_last_love_note_date_v1';
const TARGET_USERNAME = 'camireyes';

/**
 * Colección curada de mensajes románticos, poemas y dedicatorias en español
 */
export const CURATED_LOVE_NOTES: LoveNote[] = [
  {
    id: 1,
    message: "Buenos días, mi amor hermoso. Eres la luz de mis días, mi mayor orgullo y la mujer más talentosa y maravillosa del mundo. Que hoy tengas un día increíble en BunnyCure. ✨💖",
    author: "Para mi Cami con todo mi amor",
    tag: "Amor & Motivación",
  },
  {
    id: 2,
    message: "Enamorarme de ti ha sido lo más lindo que me ha pasado en la vida. Gracias por llenar mis días de sonrisas, arte y dulzura. Te amo infinito.",
    author: "Siempre pensando en ti ❤️",
    tag: "Romántico",
  },
  {
    id: 3,
    message: "«Te amo sin saber cómo, ni cuándo, ni de dónde. Te amo directamente sin problemas ni orgullo: así te amo porque no sé amar de otra manera.»",
    author: "Pablo Neruda",
    tag: "Poesía",
  },
  {
    id: 4,
    message: "«Si el corazón se cansa de querer, ¿para qué sirve? Mi corazón solo sabe latir por ti.»",
    author: "Mario Benedetti",
    tag: "Poesía",
  },
  {
    id: 5,
    message: "Admiro tu pasión, tu dedicación y el amor con el que haces cada detalle. Eres una artista increíble y una mujer extraordinaria. ¡A romperla hoy, mi reina! 🐰💅✨",
    author: "Tu fan número 1",
    tag: "Inspiración",
  },
  {
    id: 6,
    message: "No hay un solo día en que no agradezca tenerte a mi lado. Eres mi lugar seguro, mi paz y mi alegría favorita.",
    author: "Con todo mi corazón ❤️",
    tag: "Amor",
  },
  {
    id: 7,
    message: "«Andábamos sin buscarnos, pero sabiendo que andábamos para encontrarnos.» Cada día a tu lado confirma que estabas hecha para mí.",
    author: "Julio Cortázar",
    tag: "Poesía",
  },
  {
    id: 8,
    message: "Una sonrisa tuya tiene el poder de iluminar cualquier día nublado. Gracias por existir y ser mi persona favorita en el universo entero. 🌹",
    author: "Te amo con el alma",
    tag: "Dedicación",
  },
  {
    id: 9,
    message: "Hoy es un nuevo día para brillar. Recuerda que eres capaz de lograr todo lo que te propongas. Aquí estoy siempre para apoyarte y celebrarte.",
    author: "Tu compañero de vida",
    tag: "Motivación",
  },
  {
    id: 10,
    message: "«Por una mirada, un mundo; por una sonrisa, un cielo; por un beso... ¡yo no sé qué te diera por un beso!»",
    author: "Gustavo Adolfo Bécquer",
    tag: "Poesía",
  },
  {
    id: 11,
    message: "Me encanta verte soñar, crear y triunfar. Cada logro tuyo lo celebro como mío porque tu felicidad es la mía. Te amo profundamente, Cami.",
    author: "Siempre juntos 💍❤️",
    tag: "Amor",
  },
  {
    id: 12,
    message: "Que este día esté lleno de clientas felices, uñas hermosas y mucha paz en tu corazón. Eres la mejor en lo que haces. ¡Te adoro mi amor! 🌸✨",
    author: "Besos y abrazos infinitos",
    tag: "BunnyCure Love",
  },
  {
    id: 13,
    message: "«Ojalá que cuando me mires veas lo que yo veo cuando te miro: la persona más hermosa del mundo.»",
    author: "Con todo mi amor",
    tag: "Romántico",
  },
  {
    id: 14,
    message: "El mundo necesita más de tu arte, tu simpatía y esa energía única que tienes. ¡Que hoy sea un día mágico para ti!",
    author: "Tu amor de siempre",
    tag: "Brillo & Energía",
  },
  {
    id: 15,
    message: "No importa cuán ocupado sea el día, siempre hay un momento en mi mente reservado solo para pensarte y sonreír. Te amo mucho, Cami. ❤️",
    author: "Para la dueña de mi corazón",
    tag: "Amor",
  },
];

/**
 * Obtiene la fecha de hoy en formato local YYYY-MM-DD
 */
export const getTodayDateString = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Verifica si el usuario actual es Cami Reyes
 */
export const isCamiUser = (username?: string | null): boolean => {
  if (!username) return false;
  const clean = username.trim().toLowerCase();
  return clean === TARGET_USERNAME || clean === 'cami' || clean === 'camila';
};

/**
 * Verifica si ya se mostró el mensaje del día
 */
export const hasSeenTodayLoveNote = (): boolean => {
  if (typeof window === 'undefined') return true;
  const storedDate = window.localStorage.getItem(CAMI_LOVE_STORAGE_KEY);
  return storedDate === getTodayDateString();
};

/**
 * Marca que el mensaje de hoy ya fue visualizado
 */
export const markTodayLoveNoteAsSeen = (): void => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(CAMI_LOVE_STORAGE_KEY, getTodayDateString());
};

/**
 * Obtiene una nota de amor aleatoria
 */
export const getRandomLoveNote = (excludeId?: number): LoveNote => {
  const available = excludeId
    ? CURATED_LOVE_NOTES.filter((n) => n.id !== excludeId)
    : CURATED_LOVE_NOTES;
  const randomIndex = Math.floor(Math.random() * available.length);
  return available[randomIndex] || CURATED_LOVE_NOTES[0];
};

/**
 * Intenta obtener una frase de amor desde API externa con fallback automático a la colección curada
 */
export const fetchDailyLoveNote = async (): Promise<LoveNote> => {
  try {
    // Intentamos obtener una frase con timeout corto para no bloquear la UI
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);

    const response = await fetch('https://api.quotable.io/random?tags=love|romance', {
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      if (data && data.content) {
        return {
          id: Date.now(),
          message: data.content,
          author: data.author ? `${data.author} (traducción de amor)` : 'Para ti con amor ❤️',
          tag: 'Global Love Quote',
        };
      }
    }
  } catch (err) {
    // Si falla o hay timeout/cors, fallback silencioso e instantáneo a la colección en español
  }

  // Selección basada en el día del año para que cada día tenga una especial predeterminada
  const now = new Date();
  const dayOfYear = Math.floor(
    (now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 1000 / 60 / 60 / 24
  );
  const selectedIndex = dayOfYear % CURATED_LOVE_NOTES.length;
  return CURATED_LOVE_NOTES[selectedIndex];
};
