
'use client';

import React, { useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Droplet, Sun, Star, Moon, Zap } from 'lucide-react';

const cyclePhaseWorkouts = {
    menstrual: {
        icon: <Droplet className="text-cycle-menstrual" />,
        phase: "Menstrual",
        title: "Restorative Yoga",
        description: "Focus on gentle movement and deep rest. Listen to your body.",
    },
    follicular: {
        icon: <Sun className="text-cycle-follicular" />,
        phase: "Follicular",
        title: "Light Cardio & Hikes",
        description: "Energy is returning. A great time for moderate-intensity activities.",
    },
    ovulation: {
        icon: <Star className="text-cycle-ovulation" />,
        phase: "Ovulation",
        title: "High-Intensity Interval Training (HIIT)",
        description: "Your energy is at its peak. Perfect for a challenging workout.",
    },
    luteal: {
        icon: <Moon className="text-cycle-luteal" />,
        phase: "Luteal",
        title: "Strength Training",
        description: "Focus on building muscle and stability as energy starts to wane.",
    },
    unknown: {
        icon: <Zap className="text-muted-foreground" />,
        phase: "Unknown",
        title: "Mindful Movement",
        description: "Log your cycle to get personalized recommendations.",
    }
};

export const CycleSyncedWorkouts = ({ onGenerateWorkout, currentPhase }: { onGenerateWorkout: (goal: string) => void, currentPhase: string }) => {
    const workout = cyclePhaseWorkouts[currentPhase as keyof typeof cyclePhaseWorkouts] || cyclePhaseWorkouts.unknown;

    const handleClick = useCallback(() => {
        onGenerateWorkout('general-wellness');
    }, [onGenerateWorkout]);

    return (
        <Card className="glass-card">
            <CardHeader>
                <CardTitle>Cycle-Synced Recommendation</CardTitle>
                <CardDescription>A workout tailored to your current <span className={cn('font-bold', workout.icon.props.className)}>{workout.phase}</span> phase.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex flex-col md:flex-row items-center gap-6">
                    <div className="p-4 bg-muted/50 rounded-full">
                        {React.cloneElement(workout.icon, { className: "size-8" })}
                    </div>
                    <div className="flex-1 text-center md:text-left">
                        <h3 className="text-xl font-bold font-headline">{workout.title}</h3>
                        <p className="text-muted-foreground">{workout.description}</p>
                    </div>
                    <Button className="continue-button-pulse" onClick={handleClick}>Start Workout</Button>
                </div>
            </CardContent>
        </Card>
    );
};
