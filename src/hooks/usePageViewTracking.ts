/**
 * Hook para trackear page views automáticamente en GA4
 */

import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { trackPageView } from '../utils/analytics';

export const usePageViewTracking = () => {
  const location = useLocation();

  useEffect(() => {
    // Trackear page view cada vez que la ruta cambia
    trackPageView(location.pathname + location.search, document.title);
  }, [location]);
};
