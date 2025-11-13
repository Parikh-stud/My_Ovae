
'use client';

import React, { Suspense } from 'react';
import type { ReactNode } from 'react';
import { AnimatePresence, m } from 'framer-motion';
import { usePathname } from 'next/navigation';
import { Header } from '@/components/navigation/Header';
import { ErrorBoundary } from 'react-error-boundary';
import { Skeleton } from '@/components/ui/skeleton';
import { Dock, dockItems } from '@/components/navigation/Dock';

const LoadingSkeleton = () => (
    <div className="p-8">
        <Skeleton className="h-10 w-1/4 mb-8" />
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-6">
            <Skeleton className="h-40" />
            <Skeleton className="h-40" />
            <Skeleton className="h-40" />
            <Skeleton className="h-40" />
        </div>
        <Skeleton className="h-64 w-full" />
    </div>
)

const NavErrorFallback = ({ error }: { error: Error }) => (
    <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[1001] p-4 bg-destructive/80 text-destructive-foreground rounded-lg glass-card-auth">
        <p className="text-center text-sm font-bold">Navigation failed to load.</p>
    </div>
);

const HeaderErrorFallback = () => (
    <div className="p-4 border-b border-destructive">
        <p className="text-destructive text-center">Header failed to load.</p>
    </div>
);

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div id="app-container" className="flex-1 flex flex-col overflow-hidden h-screen max-h-screen">
        <ErrorBoundary FallbackComponent={HeaderErrorFallback}>
            <Header />
        </ErrorBoundary>
        <main className="flex-1 overflow-y-auto overflow-x-hidden">
            <AnimatePresence mode="wait">
            <m.div
                key={pathname}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                className="h-full"
            >
                <Suspense fallback={<LoadingSkeleton />}>
                {children}
                </Suspense>
            </m.div>
        </AnimatePresence>
        </main>
        <ErrorBoundary FallbackComponent={NavErrorFallback}>
            <Dock>
                {dockItems.map((item) => (
                <Dock.Item
                    key={item.href}
                    href={item.href}
                    icon={item.icon}
                    label={item.label}
                />
                ))}
            </Dock>
        </ErrorBoundary>
    </div>
  );
}
