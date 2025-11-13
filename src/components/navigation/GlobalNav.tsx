'use client';

import React, { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { m, AnimatePresence } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { DockProvider, Dock, dockItems } from '@/components/navigation/Dock';
import { Button } from '@/components/ui/button';

const BackButton = () => {
    const router = useRouter();
    const pathname = usePathname();

    const showBackButton = ![
        '/',
        '/login',
        '/onboarding/welcome',
        '/onboarding/journey-status',
        '/onboarding/body-mapping',
        '/onboarding/notifications',
        '/onboarding/privacy',
        '/onboarding/theme-selection',
        '/onboarding/completion',
        '/dashboard'
    ].includes(pathname);

    return (
        <AnimatePresence>
            {showBackButton && (
                 <m.div
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.5 }}
                    className="fixed top-5 left-5 z-[1001]"
                 >
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => router.back()}
                        className="glass-card-auth h-12 w-12 rounded-full"
                    >
                        <ArrowLeft />
                    </Button>
                </m.div>
            )}
        </AnimatePresence>
    )
}

export function GlobalNav({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);
    
    const showDock = ![
        '/',
        '/login',
        '/onboarding/welcome',
        '/onboarding/journey-status',
        '/onboarding/body-mapping',
        '/onboarding/notifications',
        '/onboarding/privacy',
        '/onboarding/theme-selection',
        '/onboarding/completion',
    ].includes(pathname);
    
    return (
        <DockProvider>
            <BackButton />
            {children}
            {showDock && (
                <div style={{ display: mounted ? 'block' : 'none' }}>
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
                </div>
            )}
        </DockProvider>
    );
}
