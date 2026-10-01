import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

const GA_MEASUREMENT_ID = 'G-4DCH3TR8LV';

/**
 * Sends a page view for every SPA route change.
 *
 * React Router changes the URL without reloading the page, so the gtag.js
 * snippet in index.html (which runs once) would not see those navigations.
 * The snippet already sends the FIRST page view on load — this component
 * therefore skips its initial render and only tracks subsequent navigation.
 */
const AnalyticsTracker = () => {
  const location = useLocation();
  const firstRenderRef = useRef(true);

  useEffect(() => {
    if (firstRenderRef.current) {
      firstRenderRef.current = false;
      return; // initial page view is already sent by the snippet in index.html
    }
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('config', GA_MEASUREMENT_ID, {
        page_path: location.pathname + location.search,
      });
    }
  }, [location]);

  return null;
};

export default AnalyticsTracker;
