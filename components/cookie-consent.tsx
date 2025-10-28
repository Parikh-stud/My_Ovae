
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { m, AnimatePresence } from 'framer-motion';
import Link from 'next/link';

export const CookieConsent = () => {
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    // This code only runs on the client
    const consent = localStorage.getItem('cookie_consent');
    if (consent === null) {
      // Small delay to prevent layout shift on initial render
      const timer = setTimeout(() => setShowBanner(true), 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem('cookie_consent', 'true');
    setShowBanner(false);
  };

  const handleDecline = () => {
    localStorage.setItem('cookie_consent', 'false');
    setShowBanner(false);
  };

  return (
    <AnimatePresence>
      {showBanner && (
        <m.div
          initial={{ y: '100%' }}
          animate={{ y: '0%' }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="fixed bottom-0 left-0 right-0 z-50 p-4"
        >
          <div className="glass-card-auth max-w-4xl mx-auto p-6 rounded-2xl shadow-2xl flex flex-col md:flex-row items-center gap-6">
            <div className="flex-1 text-center md:text-left">
              <h3 className="text-lg font-headline font-bold">Our Use of Cookies</h3>
              <p className="text-sm text-muted-foreground">
                We use essential cookies to make our site work. With your consent, we may also use non-essential cookies to improve user experience. By clicking “Accept,” you agree to our cookie use. You can read our full{' '}
                <Link href="/privacy" className="underline hover:text-primary">
                  Privacy Policy
                </Link> for more information.
              </p>
            </div>
            <div className="flex gap-4 shrink-0">
              <Button onClick={handleAccept} className="continue-button-pulse">Accept</Button>
              <Button variant="outline" onClick={handleDecline}>Decline</Button>
            </div>
          </div>
        </m.div>
      )}
    </AnimatePresence>
  );
};
