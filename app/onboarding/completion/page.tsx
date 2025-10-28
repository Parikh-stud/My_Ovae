
'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { Sparkles, Star, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LivingBackground } from '@/components/living-background';
import { Progress } from '@/components/ui/progress';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { useFirestore, useUser, updateDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';
import { useUserProfile } from '@/hooks/use-user-profile';
import { Skeleton } from '@/components/ui/skeleton';


const CelebrationParticles = () => {
    const particleCount = 200;
    const colors = ["#8B5CF6", "#EC4899", "#F97316"];

    return (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {Array.from({ length: particleCount }).map((_, i) => (
                <m.div
                    key={i}
                    initial={{ opacity: 0, scale: 0, x: '50vw', y: '50vh' }}
                    animate={{
                        opacity: [0, 1, 0],
                        scale: [0.5, 1, 0.5],
                        x: Math.random() * 100 + 'vw',
                        y: Math.random() * 100 + 'vh',
                    }}
                    transition={{
                        duration: Math.random() * 2 + 2,
                        ease: 'easeInOut',
                        delay: Math.random() * 1,
                        repeat: Infinity,
                        repeatType: 'loop',
                    }}
                    className="absolute rounded-full"
                    style={{
                        width: `${Math.random() * 5 + 2}px`,
                        height: `${Math.random() * 5 + 2}px`,
                        backgroundColor: colors[i % colors.length],
                    }}
                />
            ))}
        </div>
    );
};


const SymptomConstellation = ({ userSymptoms }: { userSymptoms: { name: string, severity: number }[] }) => {
    return (
        <m.div
            className="relative w-64 h-64"
            initial="hidden"
            animate="visible"
            variants={{
                hidden: { opacity: 0 },
                visible: {
                    opacity: 1,
                    transition: { staggerChildren: 0.3, delayChildren: 0.5 }
                }
            }}
        >
            {userSymptoms.map((symptom, i) => {
                const angle = (i / userSymptoms.length) * 2 * Math.PI;
                const radius = 50 + symptom.severity * 10;
                const x = Math.cos(angle) * radius;
                const y = Math.sin(angle) * radius;

                return (
                    <m.div
                        key={i}
                        className="absolute top-1/2 left-1/2"
                        variants={{ hidden: { opacity: 0, scale: 0 }, visible: { opacity: 1, scale: 1 } }}
                        style={{
                            transform: `translate(${x}px, ${y}px)`
                        }}
                    >
                        <Star className="text-yellow-300 animate-pulse" style={{ animationDelay: `${i*0.1}s`}} fill="currentColor" size={symptom.severity * 3} />
                    </m.div>
                );
            })}
             <Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-16 text-primary opacity-50" />
        </m.div>
    )
}

export default function CompletionPage() {
    const router = useRouter();
    const { user } = useUser();
    const firestore = useFirestore();
    const [step, setStep] = useState(0);
    const { userProfile, isLoading: isProfileLoading } = useUserProfile();

    const symptomsForConstellation = useMemo(() => {
        if (!userProfile?.onboarding?.symptoms) {
            return [];
        }
        
        const symptomsData = userProfile.onboarding.symptoms;
        const processedSymptoms: { name: string, severity: number }[] = [];

        for (const zone in symptomsData) {
            for (const symptomName in symptomsData[zone]) {
                processedSymptoms.push({
                    name: symptomName,
                    severity: symptomsData[zone][symptomName],
                });
            }
        }
        return processedSymptoms;

    }, [userProfile]);

    useEffect(() => {
        const completeOnboarding = () => {
            if (user && firestore && step === 0) { // Only run once
                const userRef = doc(firestore, 'users', user.uid);
                updateDocumentNonBlocking(userRef, {
                    onboardingCompleted: true,
                    'onboarding.currentStep': 'complete',
                });
            }
        };
        
        completeOnboarding();
        
        const sequence = [1, 2, 3, 4];
        sequence.forEach((s, i) => {
            setTimeout(() => setStep(s), i * 800);
        });
    }, [user, firestore]);

    const handleNext = () => {
        router.push('/dashboard');
    };

    return (
        <div className="relative flex flex-col items-center justify-center min-h-screen p-4 overflow-hidden bg-background">
            <LivingBackground />
            <AnimatePresence>
                {step >= 1 && <CelebrationParticles />}
            </AnimatePresence>
            <div className="z-10 flex flex-col items-center justify-center text-center w-full max-w-2xl space-y-6">
                <div className="w-full px-4">
                    <h3 className="text-sm font-body text-muted-foreground mb-2">Step 7 of 7</h3>
                    <Progress value={100} className="h-2" />
                </div>
                
                <AnimatePresence mode="wait">
                    {step === 1 && (
                         <m.div
                            key="step1"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            transition={{ duration: 0.5, delay: 0.2 }}
                            className="text-center"
                        >
                            <h1 className="text-3xl md:text-4xl font-headline font-bold text-center text-gradient">Creating your personalized plan...</h1>
                            <p className="text-muted-foreground mt-2">Your wellness journey is about to begin.</p>
                        </m.div>
                    )}
                     {step >= 2 && (
                         <m.div
                            key="step2"
                            initial={{ opacity: 0, scale: 0.5 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.5 }}
                            className="flex flex-col items-center"
                        >
                            {isProfileLoading ? (
                                <Skeleton className="w-64 h-64 rounded-full" />
                            ) : (
                                <SymptomConstellation userSymptoms={symptomsForConstellation} />
                            )}
                            <h2 className="text-2xl font-headline mt-4">Your Wellness Constellation is Ready</h2>
                        </m.div>
                    )}
                </AnimatePresence>


                 <AnimatePresence>
                   {step >= 3 && (
                    <m.div
                         initial={{ opacity: 0 }}
                         animate={{ opacity: 1 }}
                         transition={{ duration: 0.5 }}
                    >
                        <Card className="glass-card-auth text-left">
                            <CardHeader>
                                <CardTitle>What's Next?</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2 text-muted-foreground">
                                <p>✓ Start tracking your symptoms and cycles.</p>
                                <p>✓ Discover personalized insights from our AI coach.</p>
                                <p>✓ Connect with the Sisterhood community.</p>
                            </CardContent>
                        </Card>
                    </m.div>
                   )}
                </AnimatePresence>

                <AnimatePresence>
                    {step >= 4 && (
                        <m.div
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.5, type: 'spring' }}
                            className="flex items-center justify-center pt-6"
                        >
                            <Button
                                size="lg"
                                className="h-16 continue-button-pulse text-lg"
                                onClick={handleNext}
                            >
                                Start Exploring <ArrowRight className="ml-2" />
                            </Button>
                        </m.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
