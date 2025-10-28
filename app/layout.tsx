
'use client';

import type {Metadata} from 'next';
import { Toaster } from "@/components/ui/toaster"
import './globals.css';
import { MotionProvider } from '@/components/motion-provider';
import React, { useEffect } from 'react';
import { FirebaseClientProvider } from '@/firebase';
import { ThemeProvider } from '@/components/theme-provider';
import { CookieConsent } from '@/components/cookie-consent';


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/service-worker.js')
          .then(registration => {
          })
          .catch(err => {
          });
      });
    }
  }, []);

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700;800&family=JetBrains+Mono&family=Playfair+Display:ital@1&family=Poppins:wght@700;900&display=swap" rel="stylesheet" />
        <meta name="application-name" content="MyOvae" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="MyOvae" />
        <meta name="description" content="Your Personal Guide Through PCOS" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="theme-color" content="#8B5CF6" />

        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body className="font-body antialiased">
          <ThemeProvider
            attribute="class"
            defaultTheme="hormonal-harmony"
            enableSystem={false}
            themes={['hormonal-harmony', 'lunar-cycle', 'botanical-balance', 'minimal-wellness', 'energy-adaptive']}
          >
            <FirebaseClientProvider>
              <MotionProvider>
                {children}
              </MotionProvider>
            </FirebaseClientProvider>
          </ThemeProvider>
          <Toaster />
          <CookieConsent />
      </body>
    </html>
  );
}
