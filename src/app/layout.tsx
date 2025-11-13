
'use client';

import type {Metadata} from 'next';
import { Toaster } from "@/components/ui/toaster"
import './globals.css';
import { MotionProvider } from '@/components/motion-provider';
import React from 'react';
import { FirebaseClientProvider } from '@/firebase';
import { ThemeProvider } from '@/components/theme-provider';
import { CookieConsent } from '@/components/cookie-consent';
import { GlobalNav } from '@/components/navigation/GlobalNav';
import { Inter, JetBrains_Mono, Playfair_Display, Poppins } from 'next/font/google';

const inter = Inter({ subsets: ['latin'], variable: '--font-body' });
const poppins = Poppins({ subsets: ['latin'], weight: ['700', '900'], variable: '--font-headline' });
const playfair = Playfair_Display({ subsets: ['latin'], style: 'italic', variable: '--font-accent' });
const jetbrains = JetBrains_Mono({ subsets: ['latin'], variable: '--font-code' });


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
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
      <body className={`${inter.variable} ${poppins.variable} ${playfair.variable} ${jetbrains.variable} font-body antialiased`}>
          <ThemeProvider
            attribute="class"
            defaultTheme="dark"
            enableSystem={false}
            themes={['dark', 'light']}
          >
            <FirebaseClientProvider>
              <MotionProvider>
                <GlobalNav>
                    {children}
                </GlobalNav>
              </MotionProvider>
            </FirebaseClientProvider>
          </ThemeProvider>
          <Toaster />
          <CookieConsent />
      </body>
    </html>
  );
}
