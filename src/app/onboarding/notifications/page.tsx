
'use client';

import React, { useState, useEffect } from 'react';
import { m } from 'framer-motion';
import { ArrowRight, Bell, Moon, Sun, Zap, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LivingBackground } from '@/components/living-background';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useFirestore, useUser, updateDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';


const DayNightCycle = () => {
    const [time, setTime] = useState<Date | null>(null);

    useEffect(() => {
        // Set time only on the client side to avoid hydration mismatch
        setTime(new Date());
        const timer = setInterval(() => {
            setTime(new Date());
        }, 60000);
        return () => clearInterval(timer);
    }, []);

    if (!time) {
        return (
            <div className="relative w-56 h-56 mx-auto">
                 <div className="absolute inset-0 rounded-full bg-gradient-to-br from-chart-3 via-sky-400 to-indigo-800 opacity-30"></div>
                 <div className="absolute inset-2 rounded-full bg-background"></div>
            </div>
        );
    }
    
    const hour = time.getHours();
    const rotation = (hour / 24) * 360 - 90;

    return (
        <div className="relative w-56 h-56 mx-auto">
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-chart-3 via-sky-400 to-indigo-800 opacity-30"></div>
            <div className="absolute inset-2 rounded-full bg-background"></div>
            
            <m.div
                className="absolute top-1/2 left-1/2 w-full h-full"
                animate={{ rotate: rotation }}
                transition={{ duration: 1, ease: 'easeInOut' }}
            >
                <m.div 
                    className="absolute -top-4 left-1/2 -translate-x-1/2 text-chart-3"
                    whileHover={{ scale: 1.2 }}
                >
                    <Sun size={32} />
                </m.div>
                <m.div 
                    className="absolute -bottom-4 left-1/2 -translate-x-1/2 text-slate-300"
                    whileHover={{ scale: 1.2 }}
                >
                    <Moon size={32} />
                </m.div>
            </m.div>
             <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                    <p className="text-4xl font-bold font-code">{`${hour % 12 || 12}:${time.getMinutes().toString().padStart(2, '0')}`}</p>
                    <p className="text-sm text-muted-foreground">{hour >= 12 ? 'PM' : 'AM'}</p>
                </div>
            </div>
        </div>
    );
};

const notificationTypes = [
  {
    id: 'symptoms',
    title: 'Symptom Tracking',
    description: "Gentle reminders to log how you're feeling.",
    icon: Bell,
    color: 'text-secondary',
    defaultEnabled: true,
  },
  {
    id: 'insights',
    title: 'Weekly Insights',
    description: 'Personalized summaries of your health data.',
    icon: Zap,
    color: 'text-primary',
    defaultEnabled: true,
  },
  {
    id: 'community',
    title: 'Community Updates',
    description: 'Notifications from The Sisterhood forums.',
    icon: Users,
    color: 'text-chart-3',
    defaultEnabled: false,
  },
];


const NotificationCard = ({ type, onToggle, isEnabled }: { type: any, onToggle: (id: string, enabled: boolean) => void, isEnabled: boolean }) => (
    <m.div
        className="glass-card-auth p-6 rounded-2xl flex items-center gap-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
    >
        <div className={cn("p-3 bg-black/30 rounded-full", type.color)}>
            <type.icon size={24} />
        </div>
        <div className="flex-1">
            <h4 className="font-bold text-lg">{type.title}</h4>
            <p className="text-sm text-muted-foreground">{type.description}</p>
        </div>
        <Switch
            checked={isEnabled}
            onCheckedChange={(checked) => onToggle(type.id, checked)}
            aria-label={`Toggle ${type.title} notifications`}
        />
    </m.div>
);

export default function NotificationsPage() {
    const router = useRouter();
    const { user } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    const [enabledNotifications, setEnabledNotifications] = useState(() => {
        const initial: { [key: string]: boolean } = {};
        notificationTypes.forEach(type => {
            initial[type.id] = type.defaultEnabled;
        });
        return initial;
    });

    const handleToggle = (id: string, enabled: boolean) => {
        setEnabledNotifications(prev => ({...prev, [id]: enabled}));
    };

    const handleNext = () => {
        if (user && firestore) {
            const userRef = doc(firestore, 'users', user.uid);
            updateDocumentNonBlocking(userRef, {
                'onboarding.notificationPreferences': enabledNotifications,
                'onboarding.currentStep': 'privacy',
            });
            router.push('/onboarding/privacy');
        } else {
            toast({
                variant: "destructive",
                title: "Authentication Error",
                description: "Could not identify user. Please try logging in again.",
            });
        }
    };
    
    const handleSkip = () => {
        handleNext(); // Save default settings and move on
    };

    return (
        <div className="relative flex flex-col items-center justify-center min-h-screen p-4 overflow-hidden bg-background">
            <LivingBackground />
            <div className="z-10 flex flex-col items-center justify-center text-center w-full max-w-2xl space-y-6">
                 <div className="w-full px-4">
                    <h3 className="text-sm font-body text-muted-foreground mb-2">Step 4 of 7</h3>
                    <Progress value={57} className="h-2 bg-muted/50" />
                </div>
                
                <m.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                >
                    <h1 className="text-3xl md:text-4xl font-headline font-bold text-center text-gradient">Smart Notifications</h1>
                    <p className="text-muted-foreground mt-2">Stay on track with gentle, timely reminders.</p>
                </m.div>

                <DayNightCycle />

                <div className="w-full space-y-4">
                    {notificationTypes.map((type) => (
                        <NotificationCard 
                            key={type.id} 
                            type={type} 
                            onToggle={handleToggle} 
                            isEnabled={enabledNotifications[type.id]}
                        />
                    ))}
                </div>

                <div className="flex items-center justify-center pt-6">
                    <Button 
                        size="lg" 
                        className="h-16 continue-button-pulse text-lg" 
                        onClick={handleNext}
                    >
                        Continue <ArrowRight className="ml-2" />
                    </Button>
                </div>
                <Button variant="link" onClick={handleSkip}>Skip for now</Button>
            </div>
        </div>
    );
}
