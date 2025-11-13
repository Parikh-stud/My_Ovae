
'use client';

import React, { useState, useEffect } from 'react';
import { m } from 'framer-motion';
import { ArrowRight, Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { useFirestore, useUser, updateDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useTheme } from 'next-themes';
import { OnboardingLayout } from '../OnboardingLayout';
import { cn } from '@/lib/utils';

const ThemeToggle = ({ selectedTheme, onSelect }: { selectedTheme: string | undefined, onSelect: (theme: 'light' | 'dark') => void }) => {
    return (
        <div className="relative w-72 h-20 bg-muted/50 rounded-full p-2 flex items-center">
            <m.div
                className="absolute top-2 bottom-2 left-2 w-[calc(50%-0.5rem)] bg-background rounded-full shadow-lg"
                animate={{ x: selectedTheme === 'light' ? 0 : '100%' }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            />
            <button 
                className="relative w-1/2 h-full flex items-center justify-center gap-2 rounded-full z-10"
                onClick={() => onSelect('light')}
            >
                <Sun className={cn(selectedTheme === 'light' ? 'text-primary' : 'text-muted-foreground')} />
                <span className={cn('font-bold', selectedTheme === 'light' ? 'text-foreground' : 'text-muted-foreground')}>Light</span>
            </button>
             <button 
                className="relative w-1/2 h-full flex items-center justify-center gap-2 rounded-full z-10"
                onClick={() => onSelect('dark')}
            >
                <Moon className={cn(selectedTheme === 'dark' ? 'text-primary' : 'text-muted-foreground')} />
                <span className={cn('font-bold', selectedTheme === 'dark' ? 'text-foreground' : 'text-muted-foreground')}>Dark</span>
            </button>
        </div>
    )
}

export default function ThemeSelectionPage() {
    const router = useRouter();
    const { user } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    const { theme, setTheme } = useTheme();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);
    
    const handleSelectTheme = (themeId: 'light' | 'dark') => {
        setTheme(themeId);
    };
    
    const handleNext = () => {
        if (user && firestore) {
            const userRef = doc(firestore, 'users', user.uid);
            updateDocumentNonBlocking(userRef, {
                themePreference: theme,
                'onboarding.currentStep': 'completion',
            });
            router.push('/onboarding/completion');
        } else {
            toast({
                variant: "destructive",
                title: "Authentication Error",
                description: "Could not identify user. Please try logging in again.",
            });
        }
    };
    
    if (!mounted) {
        return null; // or a skeleton loader
    }

    return (
        <OnboardingLayout
            step={6}
            title="Choose Your Vibe"
            description="Select a theme that feels right for you."
        >
            <m.div 
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.4 }}
                className="pt-8"
            >
                <ThemeToggle selectedTheme={theme} onSelect={handleSelectTheme} />
            </m.div>

            <div className="flex items-center justify-center pt-16">
                <Button 
                    size="lg" 
                    className="h-16 continue-button-pulse text-lg"
                    onClick={handleNext}
                >
                    Finalize Setup <ArrowRight className="ml-2" />
                </Button>
            </div>
        </OnboardingLayout>
    );
}
