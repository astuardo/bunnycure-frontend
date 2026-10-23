import { useEffect, useRef, useState } from 'react';

/** Zona del borde izquierdo (px) donde empieza el gesto de volver. */
const EDGE_ZONE = 28;
/** Movimiento mínimo antes de decidir si el gesto es horizontal o un scroll vertical. */
const AXIS_LOCK = 10;
/** Velocidad (px/ms) que basta para confirmar el gesto aunque no se haya recorrido la distancia. */
const FLING_VELOCITY = 0.45;
/** Distancia para confirmar "volver". */
const BACK_DISTANCE = 72;

export type EdgeSwipeDrag = { kind: 'close'; offset: number } | { kind: 'back'; progress: number };

interface Options {
  /** Solo pantallas táctiles angostas (el menú lateral móvil). */
  enabled: boolean;
  drawerOpen: boolean;
  drawerWidth: number;
  /** Hay una pantalla anterior a la que volver. */
  canGoBack: boolean;
  onClose: () => void;
  onBack: () => void;
}

/**
 * Safari en iPhone (fuera de la app instalada) ya usa el borde izquierdo para "atrás": ahí no se
 * intercepta. Es la misma acción (volver), así que el comportamiento es igual en todas partes.
 */
const browserOwnsEdgeSwipe = () => {
  const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const standalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;
  return isIOS && !standalone;
};

/** El toque empezó sobre algo que se desplaza hacia los lados (tabla, pestañas): es scroll, no "volver". */
const insideHorizontalScroller = (target: EventTarget | null) => {
  for (let el = target instanceof Element ? target : null; el && el !== document.body; el = el.parentElement) {
    const overflowX = getComputedStyle(el).overflowX;
    if ((overflowX === 'auto' || overflowX === 'scroll') && el.scrollWidth > el.clientWidth + 1) return true;
  }
  return false;
};

/**
 * Gestos de navegación móvil con una sola regla: deslizar desde el borde izquierdo VUELVE a la
 * pantalla anterior (como en iPhone y Android), y deslizar hacia la izquierda con el menú abierto lo
 * cierra. El menú se abre con su botón o la pestaña "Más", nunca con un gesto, para que un mismo
 * movimiento no haga dos cosas. Se confirma por distancia o velocidad; un gesto vertical es scroll.
 */
export function useEdgeSwipe({ enabled, drawerOpen, drawerWidth, canGoBack, onClose, onBack }: Options) {
  const [drag, setDrag] = useState<EdgeSwipeDrag | null>(null);
  const latest = useRef({ drawerOpen, drawerWidth, canGoBack, onClose, onBack });

  useEffect(() => {
    latest.current = { drawerOpen, drawerWidth, canGoBack, onClose, onBack };
  });

  useEffect(() => {
    if (!enabled) return;

    let start: { x: number; y: number; mode: 'close' | 'back' } | null = null;
    let axis: 'h' | 'v' | null = null;
    let lastX = 0;
    let lastT = 0;
    let velocity = 0;

    const reset = () => {
      start = null;
      axis = null;
      setDrag(null);
    };

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      const t = e.touches[0];
      const s = latest.current;
      let mode: 'close' | 'back' | null = null;
      if (s.drawerOpen) mode = 'close';
      else if (t.clientX <= EDGE_ZONE && s.canGoBack && !browserOwnsEdgeSwipe() && !insideHorizontalScroller(e.target)) mode = 'back';
      if (!mode) return;
      start = { x: t.clientX, y: t.clientY, mode };
      axis = null;
      lastX = t.clientX;
      lastT = e.timeStamp;
      velocity = 0;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!start) return;
      const t = e.touches[0];
      const dx = t.clientX - start.x;
      const dy = t.clientY - start.y;
      if (!axis) {
        if (Math.abs(dx) < AXIS_LOCK && Math.abs(dy) < AXIS_LOCK) return;
        axis = Math.abs(dx) > Math.abs(dy) ? 'h' : 'v';
        if (axis === 'v') {
          start = null; // es un scroll: no se toca
          return;
        }
      }
      const dt = e.timeStamp - lastT;
      if (dt > 0) velocity = (t.clientX - lastX) / dt;
      lastX = t.clientX;
      lastT = e.timeStamp;

      const width = latest.current.drawerWidth;
      if (start.mode === 'close') setDrag({ kind: 'close', offset: Math.max(0, Math.min(width, width + dx)) });
      else setDrag({ kind: 'back', progress: Math.max(0, Math.min(1, dx / BACK_DISTANCE)) });
    };

    const onTouchEnd = () => {
      if (!start || axis !== 'h') {
        reset();
        return;
      }
      const s = latest.current;
      const dx = lastX - start.x;
      if (start.mode === 'close') {
        if (-dx > s.drawerWidth * 0.35 || velocity < -FLING_VELOCITY) s.onClose();
      } else if (dx > BACK_DISTANCE || velocity > FLING_VELOCITY) {
        s.onBack();
      }
      reset();
    };

    document.addEventListener('touchstart', onTouchStart, { passive: true });
    document.addEventListener('touchmove', onTouchMove, { passive: true });
    document.addEventListener('touchend', onTouchEnd);
    document.addEventListener('touchcancel', reset);
    return () => {
      document.removeEventListener('touchstart', onTouchStart);
      document.removeEventListener('touchmove', onTouchMove);
      document.removeEventListener('touchend', onTouchEnd);
      document.removeEventListener('touchcancel', reset);
    };
  }, [enabled]);

  return drag;
}
