
'use client';

import React, { useMemo, useState, useCallback, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dumbbell, Zap, RotateCw, BarChart, Sun, Moon, Droplet, Star, Loader2, Plus, Flame, Sparkles, Check, Bed } from 'lucide-react';
import { m } from 'framer-motion';
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useUser, useFirestore, useCollection, useMemoFirebase, addDocumentNonBlocking } from '@/firebase';
import { collection, query, orderBy, limit, where, Timestamp } from 'firebase/firestore';
import { differenceInDays, formatDistanceToNow, subDays } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { generateWorkout, GenerateWorkoutOutput } from '@/ai/flows/ai-generated-workout';
import { recommendRestDay, RestDayRecommenderOutput } from '@/ai/flows/ai-rest-day-recommender';
import { customizeWorkout } from '@/ai/flows/ai-customize-workout';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';

const workoutCategories = [
    {
      id: 'hormone-balance',
      name: 'Hormone Balance',
      icon: '⚖️',
      description: 'Gentle exercises to support hormonal health.',
      color: 'text-cycle-luteal'
    },
    {
      id: 'insulin-resistance',
      name: 'Insulin Resistance',
      icon: '💪',
      description: 'Strength training to improve insulin sensitivity.',
      color: 'text-cycle-follicular'
    },
    {
      id: 'stress-relief',
      name: 'Stress Relief',
      icon: '🧘',
      description: 'Calming exercises to reduce cortisol.',
      color: 'text-chart-4'
    },
    {
      id: 'general-wellness',
      name: 'General Wellness',
      icon: '🔄',
      description: 'Workouts matched to your cycle phase.',
      color: 'text-cycle-ovulation'
    }
];

const activityTypes = [
    "Yoga", "Strength Training", "Running", "Walking", "Cycling", "HIIT", "Pilates", "Dancing"
];

const WorkoutCategoryCard = ({ category, index, onClick }: { category: any, index: number, onClick: () => void }) => (
    <m.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 * index }}
        whileHover={{ translateY: -5 }}
        onClick={onClick}
    >
        <Card className="glass-card h-full cursor-pointer">
            <CardHeader>
                <CardTitle className="flex items-center gap-3">
                    <span className="text-2xl">{category.icon}</span>
                    <span className={cn(category.color, "font-bold")}>{category.name}</span>
                </CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-sm text-muted-foreground">{category.description}</p>
            </CardContent>
        </Card>
    </m.div>
);

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


const CycleSyncedWorkouts = ({ onStartWorkout, currentPhase }: { onStartWorkout: (goal: string) => void, currentPhase: string }) => {
    const workout = cyclePhaseWorkouts[currentPhase as keyof typeof cyclePhaseWorkouts];

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
                    <Button className="continue-button-pulse" onClick={() => onStartWorkout('general-wellness')}>Start Workout</Button>
                </div>
            </CardContent>
        </Card>
    );
};

const RestDayRecommender = ({ recommendation, isLoading }: { recommendation: RestDayRecommenderOutput | null; isLoading: boolean; }) => {
    return (
        <Card className="glass-card lg:col-span-2">
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><Bed className="text-chart-4"/> Recovery Advisor</CardTitle>
                <CardDescription>AI-powered insights to balance your workouts and recovery.</CardDescription>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <div className="flex items-center gap-3 text-muted-foreground">
                        <Loader2 className="animate-spin" />
                        <span>Analyzing your recent activity...</span>
                    </div>
                ) : recommendation ? (
                    <div className={cn("p-4 rounded-lg flex items-center gap-4", recommendation.recommendRest ? 'bg-primary/10' : 'bg-muted/50')}>
                        <div className={cn("p-3 rounded-full", recommendation.recommendRest ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground')}>
                            {recommendation.recommendRest ? <Bed size={24} /> : <Dumbbell size={24} />}
                        </div>
                        <div className="flex-1">
                            <h4 className="font-bold">{recommendation.recommendRest ? "Rest Day Recommended" : "You're Good to Go!"}</h4>
                            <p className="text-sm text-muted-foreground">{recommendation.reason}</p>
                        </div>
                    </div>
                ) : (
                    <div className="text-muted-foreground">Not enough data to make a recommendation.</div>
                )}
            </CardContent>
        </Card>
    );
}

const LogActivityForm = ({ onActivityLogged }: { onActivityLogged: () => void }) => {
    const { user } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    const [activityType, setActivityType] = useState('');
    const [duration, setDuration] = useState(30);
    const [isLoading, setIsLoading] = useState(false);

    const handleLogActivity = async () => {
        if (!activityType || !user || !firestore) {
            toast({ variant: 'destructive', title: 'Error', description: 'Please select an activity type.' });
            return;
        }
        setIsLoading(true);

        const activityData = {
            userId: user.uid,
            activityType,
            duration,
            completedAt: new Date(),
        };

        try {
            await addDocumentNonBlocking(collection(firestore, 'users', user.uid, 'fitnessActivities'), activityData);
            toast({ title: 'Activity Logged!', description: `${activityType} for ${duration} minutes.` });
            setActivityType('');
            setDuration(30);
            onActivityLogged();
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'Could not log activity. Please try again.' });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Card className="glass-card">
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><Plus /> Log an Activity</CardTitle>
                <CardDescription>Keep track of your movement and progress.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="space-y-2">
                    <Label>Activity Type</Label>
                    <Select value={activityType} onValueChange={setActivityType}>
                        <SelectTrigger><SelectValue placeholder="Choose an activity..." /></SelectTrigger>
                        <SelectContent>
                            {activityTypes.map(type => <SelectItem key={type} value={type}>{type}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <Label>Duration: {duration} minutes</Label>
                    <Slider value={[duration]} onValueChange={(value) => setDuration(value[0])} min={5} max={120} step={5} />
                </div>
                <Button onClick={handleLogActivity} disabled={!activityType || isLoading} className="w-full">
                    {isLoading ? <Loader2 className="animate-spin" /> : "Log Activity"}
                </Button>
            </CardContent>
        </Card>
    );
};

const FitnessHistory = ({ newActivityTrigger }: { newActivityTrigger: number }) => {
    const { user } = useUser();
    const firestore = useFirestore();
    
    const activitiesQuery = useMemoFirebase(() => {
        if (!user || !firestore) return null;
        return query(collection(firestore, `users/${user.uid}/fitnessActivities`), orderBy('completedAt', 'desc'), limit(10));
    }, [user, firestore, newActivityTrigger]);
    
    const { data: activities, isLoading } = useCollection(activitiesQuery);

    return (
        <Card className="glass-card lg:col-span-3">
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><BarChart /> Recent Activity</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {isLoading ? (
                    <div className="flex items-center justify-center h-40"><Loader2 className="animate-spin text-primary" /></div>
                ) : activities && activities.length > 0 ? (
                    activities.map(activity => (
                        <m.div
                            key={activity.id}
                            layout
                            initial={{ opacity: 0, y: -20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex items-center gap-4 bg-black/20 p-3 rounded-lg"
                        >
                            <div className="p-2 bg-primary/20 rounded-full text-primary"><Flame /></div>
                            <div className="flex-1">
                                <p className="font-bold">{activity.activityType}</p>
                                <p className="text-sm text-muted-foreground">{activity.duration} minutes</p>
                            </div>
                            <p className="text-xs text-muted-foreground">{formatDistanceToNow((activity.completedAt as any).toDate(), { addSuffix: true })}</p>
                        </m.div>
                    ))
                ) : (
                    <div className="flex items-center justify-center h-40 text-muted-foreground">
                        <p>Your logged activities will appear here.</p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

const WorkoutDialog = ({ isOpen, onOpenChange, workout, isLoading, onLogWorkout, isLogging, isLogged, onCustomize, isCustomizing, customizationRequest, setCustomizationRequest }: { isOpen: boolean, onOpenChange: (open: boolean) => void, workout: GenerateWorkoutOutput | null, isLoading: boolean, onLogWorkout: () => void, isLogging: boolean, isLogged: boolean, onCustomize: (request: string) => Promise<void>, isCustomizing: boolean, customizationRequest: string, setCustomizationRequest: (req: string) => void }) => {
    
    const handleCustomization = async () => {
        if (!customizationRequest.trim() || !workout) return;
        await onCustomize(customizationRequest);
    };
    
    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="glass-card max-w-2xl">
                <DialogHeader>
                    {isLoading ? (
                         <DialogTitle className="flex items-center gap-2"><Sparkles className="text-primary animate-pulse" /> Generating Your Workout...</DialogTitle>
                    ) : workout ? (
                        <DialogTitle className="text-2xl font-headline text-gradient">{workout.workoutName}</DialogTitle>
                    ) : (
                        <DialogTitle>Workout Error</DialogTitle>
                    )}
                </DialogHeader>
                <div className="max-h-[70vh] overflow-y-auto pr-4">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center gap-4 h-64">
                            <Loader2 className="size-12 text-primary animate-spin" />
                            <p className="text-muted-foreground">Our AI coach is building a personalized plan...</p>
                        </div>
                    ) : workout ? (
                        <div className="space-y-6">
                            <div>
                                <h3 className="font-bold text-lg text-primary mb-2">Warm-Up</h3>
                                <p className="text-muted-foreground">{workout.warmup}</p>
                            </div>
                            <Separator />
                            <div>
                                <h3 className="font-bold text-lg text-secondary mb-4">Main Workout</h3>
                                <div className="space-y-4">
                                    {workout.exercises.map((ex, index) => (
                                        <div key={index} className="p-4 rounded-lg bg-black/20">
                                            <h4 className="font-bold">{ex.name}</h4>
                                            <p className="text-sm text-muted-foreground font-bold">{ex.sets} of {ex.reps}</p>
                                            <p className="text-sm mt-1">{ex.description}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                             <Separator />
                            <div>
                                <h3 className="font-bold text-lg text-chart-4 mb-2">Cool-Down</h3>
                                <p className="text-muted-foreground">{workout.cooldown}</p>
                            </div>
                            <Separator />
                             <div>
                                <h3 className="font-bold text-lg text-gradient mb-2">Customize</h3>
                                <div className="flex gap-2">
                                    <Input 
                                        placeholder="e.g., 'Make it shorter' or 'No dumbbells'"
                                        value={customizationRequest}
                                        onChange={(e) => setCustomizationRequest(e.target.value)}
                                        disabled={isCustomizing}
                                    />
                                    <Button onClick={handleCustomization} disabled={isCustomizing || !customizationRequest.trim()}>
                                        {isCustomizing ? <Loader2 className="animate-spin" /> : <RotateCw />}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center text-destructive">
                            <p>Could not generate a workout at this time. Please try again later.</p>
                        </div>
                    )}
                </div>
                 <DialogFooter className="pt-4">
                    {workout && !isLoading && (
                        <Button onClick={onLogWorkout} disabled={isLogging || isLogged}>
                            {isLogging ? <Loader2 className="animate-spin" /> : isLogged ? <Check className="mr-2" /> : null}
                            {isLogged ? 'Logged!' : 'Log This Workout'}
                        </Button>
                    )}
                    <Button onClick={() => onOpenChange(false)} variant="outline">
                        Close
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};


export default function FitnessPage() {
    const [newActivityTrigger, setNewActivityTrigger] = useState(0);
    const [isWorkoutDialogOpen, setIsWorkoutDialogOpen] = useState(false);
    const [generatedWorkout, setGeneratedWorkout] = useState<GenerateWorkoutOutput | null>(null);
    const [originalGeneratedWorkout, setOriginalGeneratedWorkout] = useState<GenerateWorkoutOutput | null>(null);
    const [currentWorkoutGoal, setCurrentWorkoutGoal] = useState('');
    const [isGeneratingWorkout, setIsGeneratingWorkout] = useState(false);
    const [isCustomizing, setIsCustomizing] = useState(false);
    const [customizationRequest, setCustomizationRequest] = useState('');
    const [isLoggingWorkout, setIsLoggingWorkout] = useState(false);
    const [isWorkoutLogged, setIsWorkoutLogged] = useState(false);
    const { toast } = useToast();
    const { user } = useUser();
    const firestore = useFirestore();

    const [restRecommendation, setRestRecommendation] = useState<RestDayRecommenderOutput | null>(null);
    const [isRecommendationLoading, setIsRecommendationLoading] = useState(true);

    const cyclesQuery = useMemoFirebase(() => {
        if (!user || !firestore) return null;
        return query(collection(firestore, 'users', user.uid, 'cycles'), orderBy('startDate', 'desc'), limit(1));
    }, [user, firestore]);
    const { data: cyclesData } = useCollection(cyclesQuery);
    const latestCycle = useMemo(() => cyclesData?.[0], [cyclesData]);

    const currentPhase = useMemo(() => {
        if (latestCycle?.startDate && !latestCycle.endDate) {
            const start = (latestCycle.startDate as any).toDate();
            const day = differenceInDays(new Date(), start) + 1;
            if (day <= 0) return 'unknown';

            const avgCycleLength = (latestCycle.length && typeof latestCycle.length === 'number' && latestCycle.length > 0) ? latestCycle.length : 28;
            const ovulationDay = Math.round(avgCycleLength - 14);
            const follicularEnd = ovulationDay > 5 ? ovulationDay - 3 : 5;
            const ovulationEnd = ovulationDay + 2;

            if (day <= 5) return 'menstrual';
            if (day <= follicularEnd) return 'follicular';
            if (day <= ovulationEnd) return 'ovulation';
            if (day <= avgCycleLength) return 'luteal';
        }
        return 'unknown';
    }, [latestCycle]);

    const recentFitnessQuery = useMemoFirebase(() => {
        if (!user || !firestore) return null;
        const oneWeekAgo = subDays(new Date(), 7);
        return query(
            collection(firestore, `users/${user.uid}/fitnessActivities`), 
            where('completedAt', '>=', Timestamp.fromDate(oneWeekAgo)),
            orderBy('completedAt', 'desc')
        );
    }, [user, firestore, newActivityTrigger]);
    const { data: recentFitnessData, isLoading: isFitnessDataLoading } = useCollection(recentFitnessQuery);


    useEffect(() => {
        const getRecommendation = async () => {
            if (isFitnessDataLoading) return;
            
            setIsRecommendationLoading(true);
            try {
                const result = await recommendRestDay({ 
                    fitnessData: JSON.stringify(recentFitnessData || []),
                    cyclePhase: currentPhase as any,
                });
                setRestRecommendation(result);
            } catch (error) {
                setRestRecommendation(null);
            } finally {
                setIsRecommendationLoading(false);
            }
        };
        getRecommendation();
    }, [recentFitnessData, isFitnessDataLoading, currentPhase]);


    const handleStartWorkout = useCallback(async (goal: string) => {
        setIsWorkoutDialogOpen(true);
        setIsGeneratingWorkout(true);
        setGeneratedWorkout(null);
        setOriginalGeneratedWorkout(null);
        setCurrentWorkoutGoal(goal);
        setIsWorkoutLogged(false);
        setCustomizationRequest('');
        
        try {
            const result = await generateWorkout({ 
                cyclePhase: currentPhase as any,
                workoutGoal: goal as any,
            });
            setGeneratedWorkout(result);
            setOriginalGeneratedWorkout(result);
        } catch (error) {
            toast({
                variant: 'destructive',
                title: 'AI Workout Error',
                description: 'Sorry, I had trouble generating a workout. Please try again.'
            });
            setIsWorkoutDialogOpen(false);
        } finally {
            setIsGeneratingWorkout(false);
        }
    }, [currentPhase, toast]);
    
    const handleCustomizeWorkout = useCallback(async (request: string) => {
        if (!originalGeneratedWorkout) return;
        setIsCustomizing(true);
        try {
            const customized = await customizeWorkout({
                originalWorkout: originalGeneratedWorkout,
                customizationRequest: request,
            });
            setGeneratedWorkout(customized);
            setCustomizationRequest(''); // Clear input on success
            toast({
                title: 'Workout Customized!',
                description: 'Your workout has been updated with your request.'
            });
        } catch (error) {
            toast({
                variant: 'destructive',
                title: 'Customization Failed',
                description: 'Could not customize the workout. Please try again.'
            });
        } finally {
            setIsCustomizing(false);
        }
    }, [originalGeneratedWorkout, toast]);


    const handleLogGeneratedWorkout = async () => {
        if (!user || !firestore || !generatedWorkout || !currentWorkoutGoal) {
            toast({ variant: 'destructive', title: 'Error', description: 'Could not log workout.' });
            return;
        }
        setIsLoggingWorkout(true);
        
        const goalName = workoutCategories.find(c => c.id === currentWorkoutGoal)?.name || 'AI Workout';
        const activityData = {
            userId: user.uid,
            activityType: `AI: ${goalName}`,
            duration: 45, // Default duration
            completedAt: new Date(),
            notes: JSON.stringify(generatedWorkout), // Save the full workout object
            cyclePhase: currentPhase,
        };

        try {
            await addDocumentNonBlocking(collection(firestore, 'users', user.uid, 'fitnessActivities'), activityData);
            toast({ title: 'Workout Logged!', description: `You've completed the ${generatedWorkout.workoutName} workout.` });
            setNewActivityTrigger(t => t + 1);
            setIsWorkoutLogged(true);
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'Could not save your workout log. Please try again.' });
        } finally {
            setIsLoggingWorkout(false);
        }
    };

    const handleActivityLogged = useCallback(() => {
        setNewActivityTrigger(t => t + 1);
    }, []);

    return (
        <div className="p-4 md:p-8 space-y-8">
            <header className="flex justify-between items-center">
                <h1 className="text-3xl font-headline font-bold text-gradient flex items-center gap-3">
                    <Dumbbell className="size-8" />
                    AI Workout Studio
                </h1>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-4">
                 <div className="lg:col-span-1 space-y-6">
                    <CycleSyncedWorkouts onStartWorkout={handleStartWorkout} currentPhase={currentPhase} />
                </div>
                <RestDayRecommender recommendation={restRecommendation} isLoading={isRecommendationLoading} />
            </div>
            
            <div>
                <h2 className="text-2xl font-headline font-bold mb-4">Workout Library</h2>
                <CardDescription className="mb-4">Select a goal to generate a workout tailored to your needs and current cycle phase.</CardDescription>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {workoutCategories.map((cat, index) => (
                        <WorkoutCategoryCard 
                            key={cat.id} 
                            category={cat} 
                            index={index} 
                            onClick={() => handleStartWorkout(cat.id)}
                        />
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-4">
                <div className="lg:col-span-1 space-y-6">
                   <LogActivityForm onActivityLogged={handleActivityLogged} />
                </div>
                <div className="lg:col-span-2">
                    <FitnessHistory newActivityTrigger={newActivityTrigger} />
                </div>
            </div>

            <WorkoutDialog
                isOpen={isWorkoutDialogOpen}
                onOpenChange={setIsWorkoutDialogOpen}
                workout={generatedWorkout}
                isLoading={isGeneratingWorkout}
                onLogWorkout={handleLogGeneratedWorkout}
                isLogging={isLoggingWorkout}
                isLogged={isWorkoutLogged}
                onCustomize={handleCustomizeWorkout}
                isCustomizing={isCustomizing}
                customizationRequest={customizationRequest}
                setCustomizationRequest={setCustomizationRequest}
            />
        </div>
    );
}
