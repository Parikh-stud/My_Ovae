
'use client';

import React, { useState, useEffect } from 'react';
import { m } from 'framer-motion';
import { ArrowRight, CheckCircle2, Moon, Sun, Leaf, Droplets, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LivingBackground } from '@/components/living-background';
import { Progress } from '@/components/ui/progress';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useFirestore, useUser, updateDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useTheme } from 'next-themes';

const themePresets = [
  {
    id: 'hormonal-harmony',
    name: 'Hormonal Harmony',
    description: 'Dynamic colors that shift with your cycle.',
    Preview: () => (
        <div className="w-full h-full relative flex items-center justify-center overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-theme-hormonal-menstrual via-theme-hormonal-follicular to-theme-hormonal-luteal"/>
            <div className="flex gap-2">
                <m.div animate={{ y: [0, -5, 0] }} transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }} className="w-4 h-8 rounded-full bg-white/50" />
                <m.div animate={{ y: [0, 5, 0] }} transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }} className="w-4 h-12 rounded-full bg-white/50" />
                <m.div animate={{ y: [0, -8, 0] }} transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }} className="w-4 h-10 rounded-full bg-white/50" />
            </div>
            <Droplets className="absolute bottom-4 right-4 text-white/50" />
        </div>
    )
  },
  {
    id: 'lunar-cycle',
    name: 'Lunar Cycle',
    description: 'Moon phase inspired aesthetics.',
    Preview: () => (
        <div className="w-full h-full relative flex items-center justify-center overflow-hidden bg-gradient-to-b from-theme-lunar-primary to-theme-lunar-background">
            <m.div
                className="w-16 h-16 rounded-full bg-theme-lunar-foreground shadow-2xl"
                initial={{ scale: 0.8, boxShadow: '0 0 20px #fff' }}
                animate={{ scale: [0.9, 1, 0.9], y: [0, 10, 0] }}
                transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
            >
                <Moon className="m-auto h-full text-theme-lunar-background" />
            </m.div>
        </div>
    )
  },
  {
    id: 'botanical-balance',
    name: 'Botanical Balance',
    description: 'Nature and plant-based visuals.',
    Preview: () => (
        <div className="w-full h-full relative flex items-center justify-center overflow-hidden bg-theme-botanical-background">
            <Leaf className="text-theme-botanical-primary" size={64}/>
            <m.div 
                className="absolute w-px h-12 bg-theme-botanical-secondary"
                initial={{ y: -24, scaleY: 0 }}
                animate={{ scaleY: [0, 1, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'easeOut' }}
            />
        </div>
    )
  },
  {
    id: 'minimal-wellness',
    name: 'Minimal Wellness',
    description: 'Clean design with reduced animations.',
     Preview: () => (
        <div className="w-full h-full relative flex items-center justify-center overflow-hidden bg-theme-minimal-background">
            <div className="w-24 h-px bg-theme-minimal-primary" />
            <div className="w-px h-24 bg-theme-minimal-primary absolute" />
        </div>
    )
  },
  {
    id: 'energy-adaptive',
    name: 'Energy Adaptive',
    description: 'Changes based on your energy and mood.',
    Preview: () => (
        <div className="w-full h-full relative flex items-center justify-center overflow-hidden bg-gradient-to-tr from-theme-energy-primary to-theme-energy-secondary">
             <Zap className="text-white/80" size={64}/>
        </div>
    )
  },
];

const ThemePreviewCard = ({ theme, isSelected, onSelect }: { theme: any, isSelected: boolean, onSelect: (id: string) => void }) => {
    return (
        <m.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            whileHover={{ scale: 1.05 }}
            onClick={() => onSelect(theme.id)}
            className="cursor-pointer"
        >
            <Card className={cn(
                "glass-card-auth transition-all",
                isSelected ? "ring-2 ring-primary border-primary" : "border-white/20"
            )}>
                <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                        {theme.name}
                        {isSelected && <CheckCircle2 className="text-primary" />}
                    </CardTitle>
                    <CardDescription>{theme.description}</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="h-24 bg-muted rounded-md overflow-hidden">
                        <theme.Preview />
                    </div>
                </CardContent>
            </Card>
        </m.div>
    )
}

export default function ThemeSelectionPage() {
    const router = useRouter();
    const { user } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    const { theme: activeTheme, setTheme } = useTheme();
    const [selectedTheme, setSelectedTheme] = useState('hormonal-harmony');

    useEffect(() => {
        if (activeTheme) {
            setSelectedTheme(activeTheme);
        }
    }, [activeTheme]);

    const handleThemeSelect = (themeId: string) => {
        setSelectedTheme(themeId);
        setTheme(themeId);
    }

    const handleNext = () => {
        if (user && firestore) {
            const userRef = doc(firestore, 'users', user.uid);
            updateDocumentNonBlocking(userRef, {
                themePreference: selectedTheme,
                'onboarding.theme': selectedTheme,
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
    
    const handleSkip = () => {
        handleNext();
    };

    return (
        <div className="relative flex flex-col items-center justify-center min-h-screen p-4 overflow-hidden bg-background">
            <LivingBackground />
            <div className="z-10 flex flex-col items-center justify-center text-center w-full max-w-2xl space-y-6">
                 <div className="w-full px-4">
                    <h3 className="text-sm font-body text-muted-foreground mb-2">Step 6 of 7</h3>
                    <Progress value={85} className="h-2 bg-muted/50" />
                </div>
                
                <m.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                >
                    <h1 className="text-3xl md:text-4xl font-headline font-bold text-center text-gradient">Personalize Your Theme</h1>
                    <p className="text-muted-foreground mt-2">Choose an experience that feels right for you.</p>
                </m.div>

                <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-4">
                    {themePresets.map((theme) => (
                        <ThemePreviewCard 
                            key={theme.id}
                            theme={theme}
                            isSelected={selectedTheme === theme.id}
                            onSelect={handleThemeSelect}
                        />
                    ))}
                </div>

                <div className="flex items-center justify-center pt-6">
                    <Button 
                        size="lg" 
                        className="h-16 continue-button-pulse text-lg" 
                        onClick={handleNext}
                    >
                        Finish Setup <ArrowRight className="ml-2" />
                    </Button>
                </div>
                 <Button variant="link" onClick={handleSkip}>Choose Later</Button>
            </div>
        </div>
    );
}
