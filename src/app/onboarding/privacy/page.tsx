'use client';

import React, { useState } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { ArrowRight, Dna, Lock, Shield, Stethoscope, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LivingBackground } from '@/components/living-background';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { useFirestore, useUser, updateDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Checkbox } from '@/components/ui/checkbox';
import Link from 'next/link';


const privacySettings = [
  {
    id: 'provider_sharing',
    title: 'Healthcare Provider Access',
    description: 'Share your data securely with your healthcare team',
    icon: Stethoscope,
    color: 'text-secondary',
    defaultEnabled: false,
  },
  {
    id: 'research_contribution',
    title: 'Anonymous Research Contribution',
    description: 'Help advance PCOS research with anonymized data',
    icon: Dna,
    color: 'text-primary',
    defaultEnabled: true,
  },
  {
    id: 'community_privacy',
    title: 'Community Feature Access',
    description: 'Enable features like forums and peer support',
    icon: Users,
    color: 'text-chart-3',
    defaultEnabled: true,
  },
];


const PrivacyCard = ({ setting, onToggle, isEnabled }: { setting: any, onToggle: (id: string, enabled: boolean) => void, isEnabled: boolean }) => (
    <m.div
        className="glass-card-auth p-6 rounded-2xl flex items-center gap-6"
        initial={{ opacity: 0, x: -50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5 }}
    >
        <div className={cn("p-3 bg-black/30 rounded-full", setting.color)}>
            <setting.icon size={24} />
        </div>
        <div className="flex-1">
            <h4 className="font-bold text-lg">{setting.title}</h4>
            <p className="text-sm text-muted-foreground">{setting.description}</p>
        </div>
        <Switch
            checked={isEnabled}
            onCheckedChange={(checked) => onToggle(setting.id, checked)}
            aria-label={`Toggle ${setting.title}`}
        />
    </m.div>
);

const SecurityShield = ({ level }: { level: number }) => {
    const shieldVariants = {
        hidden: { pathLength: 0, opacity: 0 },
        visible: (i: number) => ({
            pathLength: 1,
            opacity: 1,
            transition: {
                pathLength: { delay: i * 0.3, type: "spring", duration: 1.5, bounce: 0 },
                opacity: { delay: i * 0.3, duration: 0.01 }
            }
        })
    };

    return (
        <div className="relative w-48 h-56 flex items-center justify-center">
            <m.svg
                width="150"
                height="180"
                viewBox="0 0 150 180"
                initial="hidden"
                animate="visible"
                className="absolute"
            >
                <m.path
                    d="M75 10 L 10 35 L 10 95 C 10 145 75 170 75 170 C 75 170 140 145 140 95 L 140 35 Z"
                    fill="transparent"
                    strokeWidth="4"
                    stroke="hsl(var(--primary) / 0.2)"
                />
                <AnimatePresence>
                {level >= 1 && (
                    <m.path
                        key="shield-fill-1"
                        d="M75 10 L 10 35 L 10 95 C 10 145 75 170 75 170 V 10 Z"
                        fill="hsl(var(--primary) / 0.3)"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.5, delay: 0.2 }}
                    />
                )}
                {level >= 2 && (
                    <m.path
                        key="shield-fill-2"
                        d="M75 10 L 140 35 L 140 95 C 140 145 75 170 75 170 V 10 Z"
                        fill="hsl(var(--primary) / 0.3)"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.5, delay: 0.4 }}
                    />
                )}
                </AnimatePresence>
                 <m.path
                    d="M75 10 L 10 35 L 10 95 C 10 145 75 170 75 170 C 75 170 140 145 140 95 L 140 35 Z"
                    fill="transparent"
                    strokeWidth="5"
                    stroke="url(#shield-gradient)"
                    variants={shieldVariants}
                    custom={1}
                />
                <defs>
                    <linearGradient id="shield-gradient" gradientTransform="rotate(45)">
                        <stop offset="0%" stopColor="hsl(var(--primary))" />
                        <stop offset="100%" stopColor="hsl(var(--secondary))" />
                    </linearGradient>
                </defs>
            </m.svg>
            <AnimatePresence>
                {level >= 3 && (
                     <m.div
                        initial={{ scale: 0, opacity: 0}}
                        animate={{ scale: 1, opacity: 1}}
                        transition={{type: 'spring', stiffness: 200, damping: 10, delay: 0.8}}
                     >
                        <Badge className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-sm bg-chart-4/20 text-chart-4 border-chart-4/50">
                            HIPAA Compliant
                        </Badge>
                    </m.div>
                )}
            </AnimatePresence>
        </div>
    );
};


export default function PrivacyPage() {
    const router = useRouter();
    const { user } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    const [hasAgreed, setHasAgreed] = useState(false);
    const [privacySwitches, setPrivacySwitches] = useState(() => {
        const initial: { [key: string]: boolean } = {};
        privacySettings.forEach(setting => {
            initial[setting.id] = setting.defaultEnabled;
        });
        return initial;
    });

    const handleToggle = (id: string, enabled: boolean) => {
        setPrivacySwitches(prev => ({...prev, [id]: enabled}));
    };

    const handleNext = () => {
        if (!hasAgreed) {
            toast({
                variant: "destructive",
                title: "Agreement Required",
                description: "You must agree to the Terms of Service and Privacy Policy to continue.",
            });
            return;
        }

        if (user && firestore) {
            const userRef = doc(firestore, 'users', user.uid);
            updateDocumentNonBlocking(userRef, {
                'onboarding.privacySettings': privacySwitches,
                'onboarding.currentStep': 'theme-selection',
            });
            router.push('/onboarding/theme-selection');
        } else {
            toast({
                variant: "destructive",
                title: "Authentication Error",
                description: "Could not identify user. Please try logging in again.",
            });
        }
    };
    
    const handleUseDefaults = () => {
        if (!hasAgreed) {
            toast({
                variant: "destructive",
                title: "Agreement Required",
                description: "You must agree to the Terms of Service and Privacy Policy to continue.",
            });
            return;
        }
        handleNext();
    };

    const securityLevel = 1 + Object.values(privacySwitches).filter(Boolean).length;


    return (
        <div className="relative flex flex-col items-center justify-center min-h-screen p-4 overflow-hidden bg-background">
            <LivingBackground />
            <div className="z-10 flex flex-col items-center justify-center text-center w-full max-w-2xl space-y-6">
                 <div className="w-full px-4">
                    <h3 className="text-sm font-body text-muted-foreground mb-2">Step 5 of 7</h3>
                    <Progress value={71} className="h-2 bg-muted/50" />
                </div>
                
                <m.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                >
                    <h1 className="text-3xl md:text-4xl font-headline font-bold text-center text-gradient">Privacy & Your Data</h1>
                    <p className="text-muted-foreground mt-2">You're in control. Always.</p>
                </m.div>

                <SecurityShield level={securityLevel} />

                <div className="w-full space-y-4 text-left">
                    <div className="glass-card-auth p-6 rounded-2xl flex items-center gap-6">
                        <div className="p-3 bg-black/30 rounded-full text-chart-4">
                           <Lock size={24} />
                        </div>
                        <div className="flex-1">
                            <h4 className="font-bold text-lg">End-to-End Encryption</h4>
                            <p className="text-sm text-muted-foreground">Your personal data is always encrypted.</p>
                        </div>
                        <Switch checked disabled aria-label="End-to-End Encryption" />
                    </div>

                    {privacySettings.map((setting) => (
                        <PrivacyCard 
                            key={setting.id} 
                            setting={setting} 
                            onToggle={handleToggle} 
                            isEnabled={privacySwitches[setting.id]}
                        />
                    ))}

                    <div className="flex items-center space-x-2 pt-4">
                        <Checkbox id="terms" checked={hasAgreed} onCheckedChange={(checked) => setHasAgreed(checked as boolean)} />
                        <label
                            htmlFor="terms"
                            className="text-sm text-muted-foreground leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                            I agree to the{' '}
                            <Link href="/terms" target="_blank" rel="noopener noreferrer" className="underline text-primary hover:text-primary/80">
                                Terms of Service
                            </Link>{' '}
                            and{' '}
                            <Link href="/privacy" target="_blank" rel="noopener noreferrer" className="underline text-primary hover:text-primary/80">
                                Privacy Policy
                            </Link>.
                        </label>
                    </div>
                </div>

                <div className="flex items-center justify-center pt-6">
                    <Button 
                        size="lg" 
                        className="h-16 continue-button-pulse text-lg" 
                        onClick={handleNext}
                        disabled={!hasAgreed}
                    >
                        Continue <ArrowRight className="ml-2" />
                    </Button>
                </div>
                <Button variant="link" onClick={handleUseDefaults} disabled={!hasAgreed}>Use default settings</Button>
            </div>
        </div>
    );
}
