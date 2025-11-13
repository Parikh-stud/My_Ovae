'use client';

import { useEffect, useState } from 'react';

const MOBILE_BREAKPOINT = 768; // Standard md breakpoint

/**
 * A hook to determine if the current viewport is mobile-sized.
 * This hook is client-side only and safe for server components.
 * @returns {boolean} - True if the window width is less than the mobile breakpoint, false otherwise.
 */
export const useMobile = (): boolean => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // This function will only run on the client side
    const checkDevice = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };

    // Initial check
    checkDevice();

    // Add resize listener
    window.addEventListener('resize', checkDevice);

    // Cleanup listener on unmount
    return () => window.removeEventListener('resize', checkDevice);
  }, []); // Empty dependency array ensures this effect runs only once on mount

  return isMobile;
};
