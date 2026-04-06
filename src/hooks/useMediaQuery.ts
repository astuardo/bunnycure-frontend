import { useState, useEffect } from 'react';

export const useMediaQuery = (query: string): boolean => {
  const [matches, setMatches] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.matchMedia(query).matches;
    }
    return false;
  });

  useEffect(() => {
    const media = window.matchMedia(query);
    
    const listener = () => setMatches(media.matches);
    
    // Set initial value
    setMatches(media.matches);
    
    // Listen for changes
    media.addEventListener('change', listener);

    return () => media.removeEventListener('change', listener);
  }, [query]);

  return matches;
};

export const useIsMobile = () => useMediaQuery('(max-width: 767px)');
export const useIsTablet = () => useMediaQuery('(min-width: 768px) and (max-width: 991px)');
export const useIsDesktop = () => useMediaQuery('(min-width: 992px)');
export const useIsSmallScreen = () => useMediaQuery('(max-width: 991px)');