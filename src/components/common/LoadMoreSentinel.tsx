import { useEffect, useRef } from 'react';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';

interface LoadMoreSentinelProps {
  hasMore: boolean;
  loading: boolean;
  onLoadMore: () => void;
  /** Elementos que faltan por cargar (para el texto del botón). */
  remaining?: number;
}

/**
 * Carga la página siguiente cuando el final de la lista entra en pantalla (scroll infinito).
 * Incluye un botón como respaldo para navegadores sin IntersectionObserver o si el usuario prefiere hacer clic.
 */
export function LoadMoreSentinel({ hasMore, loading, onLoadMore, remaining }: LoadMoreSentinelProps) {
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = sentinelRef.current;
    // Se reconecta al terminar cada carga: si el final sigue visible (pantallas altas) carga otra página.
    if (!node || !hasMore || loading || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) onLoadMore();
      },
      { rootMargin: '400px 0px' }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, loading, onLoadMore]);

  if (!hasMore) return null;

  return (
    <div ref={sentinelRef} className="flex justify-center py-4">
      {loading ? (
        <Spinner size="sm" />
      ) : (
        <Button variant="secondary" size="sm" onClick={onLoadMore} className="text-xs">
          {remaining && remaining > 0 ? `Cargar más clientas (${remaining} restantes)` : 'Cargar más'}
        </Button>
      )}
    </div>
  );
}
