
'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dumbbell, Zap, RotateCw, Bed, Loader2, Plus, Sparkles, Check, Info, Star } from 'lucide-react';
import { m } from 'framer-motion';
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useUser, useFirestore, addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { generateWorkout } from '@/ai/flows/ai-generate-workout';
import { customizeWorkout } from '@/ai/flows/ai-customize-workout';
import type { GenerateWorkoutOutput, GenerateWorkoutInput } from '@/ai/flows/types/workout-types';
import { recommendRecoveryAction } from '@/ai/flows/ai-rest-day-recommender';
import type { RecoveryRecommenderOutput } from '@/ai/flows/types/workout-types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { useUserHealthData } from '@/hooks/use-user-health-data';
import { FitnessHistory } from './fitness-history';
import { LogActivityForm } from './log-activity-form';
import { CycleSyncedWorkouts } from './cycle-synced-workouts';
import { MultiSelect, type MultiSelectOption } from '@/components/ui/multi-select';
import { collection, doc } from 'firebase/firestore';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { scoreWorkoutEffectiveness } from '@/ai/flows/ai-workout-effectiveness-scorer';
import type { WorkoutEffectivenessOutput } from '@/ai/flows/types/workout-types';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { useUserProfile } from '@/hooks/use-user-profile';

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

const equipmentOptions: MultiSelectOption[] = [
    { value: 'dumbbells', label: 'Dumbbells' },
    { value: 'resistance-bands', label: 'Resistance Bands' },
    { value: 'kettlebell', label: 'Kettlebell' },
    { value: 'yoga-mat', label: 'Yoga Mat' },
    { value: 'jump-rope', label: 'Jump Rope' },
    { value: 'foam-roller', label: 'Foam Roller' },
];

const WorkoutCategoryCard = ({ category, index, onClick }: { category: any, index: number, onClick: (id: string) => void }) => {
    const handleClick = useCallback(() => {
        onClick(category.id);
    }, [onClick, category.id]);

    return (
        <m.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 * index }}
            whileHover={{ translateY: -5 }}
            onClick={handleClick}
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
};

const RecoveryAdvisor = ({ recommendation, isLoading }: { recommendation: RecoveryRecommenderOutput | null; isLoading: boolean; }) => {
    
    const getRecommendationDetails = () => {
        if (!recommendation) return { icon: <Bed size={24} />, title: 'Awaiting Analysis', color: 'text-muted-foreground' };
        switch (recommendation.recommendation) {
            case 'Workout':
                return { icon: <Dumbbell size={24} />, title: "You're Good to Go!", color: 'text-green-500' };
            case 'Active Recovery':
                return { icon: <Zap size={24} />, title: "Active Recovery Recommended", color: 'text-yellow-500' };
            case 'Rest':
                return { icon: <Bed size={24} />, title: "Rest Day Recommended", color: 'text-blue-500' };
            default:
                return { icon: <Bed size={24} />, title: 'Awaiting Analysis', color: 'text-muted-foreground' };
        }
    };

    const details = getRecommendationDetails();

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
                    <div className="space-y-4">
                        <div className="flex items-center gap-4">
                            <div className="flex flex-col items-center gap-2 w-24">
                                <p className="text-sm text-muted-foreground">Recovery</p>
                                <div className="relative size-20">
                                    <svg className="absolute size-full transform -rotate-90">
                                        <circle className="text-muted/20" strokeWidth="6" stroke="currentColor" fill="transparent" r="28" cx="50%" cy="50%" />
                                        <m.circle
                                            className={details.color}
                                            strokeWidth="6"
                                            strokeDasharray={2 * Math.PI * 28}
                                            strokeLinecap="round"
                                            stroke="currentColor"
                                            fill="transparent"
                                            r="28"
                                            cx="50%"
                                            cy="50%"
                                            initial={{ strokeDashoffset: 2 * Math.PI * 28 }}
                                            animate={{ strokeDashoffset: 2 * Math.PI * 28 * (1 - recommendation.recoveryScore / 100) }}
                                            transition={{ duration: 1, ease: 'easeOut' }}
                                        />
                                    </svg>
                                    <div className="absolute inset-0 flex items-center justify-center text-xl font-bold font-code">
                                        {recommendation.recoveryScore}%
                                    </div>
                                </div>
                            </div>
                            <div className="flex-1 space-y-2">
                                <div className={cn("p-4 rounded-lg flex items-center gap-4 bg-black/20")}>
                                    <div className={cn("p-3 rounded-full bg-muted", details.color)}>
                                        {details.icon}
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="font-bold">{details.title}</h4>
                                        <p className="text-sm text-muted-foreground">{recommendation.reasoning}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                         {recommendation.recommendation === 'Active Recovery' && recommendation.suggestedActivities && (
                            <div className="space-y-2">
                                <h5 className="text-sm font-semibold">Suggested Activities</h5>
                                <div className="flex flex-wrap gap-2">
                                    {recommendation.suggestedActivities.map(activity => (
                                        <Badge key={activity} variant="outline">{activity}</Badge>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="text-muted-foreground text-center p-4">Not enough data to make a recommendation.</div>
                )}
            </CardContent>
        </Card>
    );
}

const WorkoutDialog = ({ isOpen, onOpenChange, workout, isLoading, onLogWorkout, isLogging, isLogged, onCustomize, isCustomizing, customizationRequest, setCustomizationRequest }: { isOpen: boolean, onOpenChange: (open: boolean) => void, workout: GenerateWorkoutOutput | null, isLoading: boolean, onLogWorkout: () => void, isLogging: boolean, isLogged: boolean, onCustomize: (request: string) => Promise<void>, isCustomizing: boolean, customizationRequest: string, setCustomizationRequest: (req: string) => void }) => {
    
    const handleCustomization = useCallback(async () => {
        if (!customizationRequest.trim() || !workout) return;
        await onCustomize(customizationRequest);
    }, [customizationRequest, workout, onCustomize]);

    const handleCustomizationRequestChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setCustomizationRequest(e.target.value);
    }, [setCustomizationRequest]);
    
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
                            {workout.difficultyAnalysis && (
                                <Alert className="bg-primary/10 border-primary/20">
                                    <Info className="text-primary" />
                                    <AlertDescription className="text-primary-foreground/80">
                                        {workout.difficultyAnalysis}
                                    </AlertDescription>
                                </Alert>
                            )}
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
                                        onChange={handleCustomizationRequestChange}
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

const EffectivenessDialog = ({
    isOpen,
    onOpenChange,
    onAnalyze,
    workoutName,
    analysisResult,
    isAnalyzing
}: {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    onAnalyze: (effort: number) => void;
    workoutName: string;
    analysisResult: WorkoutEffectivenessOutput | null;
    isAnalyzing: boolean;
}) => {
    const [effortLevel, setEffortLevel] = useState(5);
    const effortLabels = [
        "Very Light", "Very Light", "Light", "Light", "Moderate", "Moderate", 
        "Hard", "Hard", "Very Hard", "Max Effort"
    ];

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="glass-card">
                <DialogHeader>
                    <DialogTitle>Workout Effectiveness</DialogTitle>
                    <DialogDescription>
                        How would you rate the effort for your <span className="font-bold text-primary">{workoutName}</span> workout?
                    </DialogDescription>
                </DialogHeader>
                <div className="py-6">
                    {isAnalyzing ? (
                        <div className="flex items-center justify-center gap-3 text-muted-foreground h-40">
                            <Loader2 className="animate-spin" />
                            <span>Analyzing your feedback...</span>
                        </div>
                    ) : analysisResult ? (
                        <div className="text-center space-y-4">
                             <div className="relative size-40 mx-auto flex items-center justify-center">
                                <svg className="absolute size-full transform -rotate-90">
                                    <circle className="text-muted/20" strokeWidth="10" stroke="currentColor" fill="transparent" r="45" cx="50%" cy="50%" />
                                    <m.circle
                                        className="text-secondary"
                                        strokeWidth="10"
                                        strokeDasharray={2 * Math.PI * 45}
                                        strokeLinecap="round" stroke="currentColor" fill="transparent" r="45" cx="50%" cy="50%"
                                        initial={{ strokeDashoffset: 2 * Math.PI * 45 }}
                                        animate={{ strokeDashoffset: (2 * Math.PI * 45) * (1 - (analysisResult.effectivenessScore || 0) / 100) }}
                                        transition={{ duration: 1, ease: 'easeOut' }}
                                    />
                                </svg>
                                 <div className="text-4xl font-bold font-code">{analysisResult.effectivenessScore}</div>
                            </div>
                            <h3 className="text-lg font-bold">Effectiveness Score</h3>
                            <p className="text-muted-foreground italic">"{analysisResult.feedback}"</p>
                        </div>
                    ) : (
                         <div className="space-y-4">
                            <Label htmlFor="effort-slider">Rate of Perceived Exertion (RPE): <span className="font-bold text-primary">{effortLevel} / 10</span></Label>
                            <Slider
                                id="effort-slider"
                                min={1}
                                max={10}
                                step={1}
                                value={[effortLevel]}
                                onValueChange={(value) => setEffortLevel(value[0])}
                            />
                            <p className="text-center text-muted-foreground text-sm">{effortLabels[effortLevel - 1]}</p>
                         </div>
                    )}
                </div>
                <DialogFooter>
                    {!analysisResult && (
                        <Button onClick={() => onAnalyze(effortLevel)} disabled={isAnalyzing}>
                           {isAnalyzing ? <Loader2 className="animate-spin" /> : <Sparkles className="mr-2" />}
                            Analyze My Effort
                        </Button>
                    )}
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

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
    const [loggedActivityId, setLoggedActivityId] = useState<string | null>(null);
    const [selectedEquipment, setSelectedEquipment] = useState<string[]>([]);
    const { toast } = useToast();
    const { user } = useUser();
    const { userProfile, isLoading: isProfileLoading } = useUserProfile();
    const firestore = useFirestore();

    const [recoveryRecommendation, setRecoveryRecommendation] = useState<RecoveryRecommenderOutput | null>(null);
    const [isRecommendationLoading, setIsRecommendationLoading] = useState(true);

    const [isEffectivenessDialogOpen, setIsEffectivenessDialogOpen] = useState(false);
    const [effectivenessAnalysis, setEffectivenessAnalysis] = useState<WorkoutEffectivenessOutput | null>(null);
    const [isAnalyzingEffectiveness, setIsAnalyzingEffectiveness] = useState(false);

    const { cyclePhase, recentFitnessActivities, recentSymptoms, areFitnessActivitiesLoading, areSymptomsLoading } = useUserHealthData();


    useEffect(() => {
        if (!isProfileLoading && userProfile?.availableEquipment) {
            setSelectedEquipment(userProfile.availableEquipment);
        }
    }, [userProfile, isProfileLoading]);

    useEffect(() => {
        const getRecommendation = async () => {
            if (areFitnessActivitiesLoading || areSymptomsLoading) return;
            
            setIsRecommendationLoading(true);
            try {
                const healthSnapshot = JSON.stringify({
                    fitness: recentFitnessActivities || [],
                    symptoms: recentSymptoms || [],
                });

                const result = await recommendRecoveryAction({ 
                    healthSnapshot,
                    cyclePhase: (cyclePhase.toLowerCase() || 'unknown') as any,
                });
                setRecoveryRecommendation(result);
            } catch (error) {
                setRecoveryRecommendation(null);
            } finally {
                setIsRecommendationLoading(false);
            }
        };
        getRecommendation();
    }, [recentFitnessActivities, areFitnessActivitiesLoading, recentSymptoms, areSymptomsLoading, cyclePhase]);


    const handleStartWorkout = useCallback(async (goal: string) => {
        if (!user) {
             toast({ variant: 'destructive', title: 'Error', description: 'You must be logged in to generate a workout.' });
             return;
        }
        setIsWorkoutDialogOpen(true);
        setIsGeneratingWorkout(true);
        setGeneratedWorkout(null);
        setOriginalGeneratedWorkout(null);
        setCurrentWorkoutGoal(goal);
        setIsWorkoutLogged(false);
        setCustomizationRequest('');
        
        try {
            const workoutInput: GenerateWorkoutInput = { 
                userId: user.uid,
                workoutGoal: goal as any,
                equipment: selectedEquipment,
                workoutHistory: JSON.stringify(recentFitnessActivities?.filter(a => a.activityType?.includes(goal)) || []),
            };
            const result = await generateWorkout(workoutInput);
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
    }, [cyclePhase, toast, selectedEquipment, recentFitnessActivities, user]);
    
    const handleCustomizeWorkout = useCallback(async (request: string) => {
        if (!originalGeneratedWorkout) return;
        setIsCustomizing(true);
        try {
            const customized = await customizeWorkout({
                originalWorkout: originalGeneratedWorkout,
                customizationRequest: request,
                equipment: selectedEquipment,
            });
            setGeneratedWorkout(customized);
            setCustomizationRequest('');
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
    }, [originalGeneratedWorkout, toast, selectedEquipment]);


    const handleLogGeneratedWorkout = useCallback(async () => {
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
            cyclePhase: cyclePhase,
        };

        try {
            const docRef = await addDocumentNonBlocking(collection(firestore, 'users', user.uid, 'fitnessActivities'), activityData);
            setLoggedActivityId(docRef.id);
            toast({ title: 'Workout Logged!', description: `You've completed the ${generatedWorkout.workoutName} workout.` });
            setNewActivityTrigger(t => t + 1);
            setIsWorkoutLogged(true);
            setIsWorkoutDialogOpen(false);
            setEffectivenessAnalysis(null);
            setIsEffectivenessDialogOpen(true);

            const equipmentInWorkout = new Set<string>();
            generatedWorkout.exercises.forEach(ex => {
                const description = ex.description.toLowerCase();
                equipmentOptions.forEach(opt => {
                    if (description.includes(opt.label.toLowerCase())) {
                        equipmentInWorkout.add(opt.value);
                    }
                });
            });

            const newEquipment = Array.from(equipmentInWorkout);
            const userRef = doc(firestore, 'users', user.uid);
            const currentEquipment = userProfile?.availableEquipment || [];
            const updatedEquipment = [...new Set([...currentEquipment, ...newEquipment])];
            
            if (updatedEquipment.length > currentEquipment.length) {
                updateDocumentNonBlocking(userRef, { availableEquipment: updatedEquipment });
            }

        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'Could not save your workout log. Please try again.' });
        } finally {
            setIsLoggingWorkout(false);
        }
    }, [user, firestore, generatedWorkout, currentWorkoutGoal, cyclePhase, toast, userProfile]);

    const handleAnalyzeEffectiveness = useCallback(async (effortLevel: number) => {
        if (!generatedWorkout || !currentWorkoutGoal || !loggedActivityId || !user || !firestore) {
            toast({ variant: 'destructive', title: 'Error', description: 'Missing context to analyze workout.' });
            return;
        }
        setIsAnalyzingEffectiveness(true);
        try {
            const result = await scoreWorkoutEffectiveness({
                workout: generatedWorkout,
                workoutGoal: currentWorkoutGoal,
                effortLevel,
                cyclePhase: (cyclePhase.toLowerCase() || 'unknown') as any,
            });
            setEffectivenessAnalysis(result);

            // Save the analysis to the activity document
            const activityRef = doc(firestore, 'users', user.uid, 'fitnessActivities', loggedActivityId);
            updateDocumentNonBlocking(activityRef, {
                effectiveness: {
                    score: result.effectivenessScore,
                    feedback: result.feedback,
                    effortLevel: effortLevel,
                }
            });

        } catch (error) {
            toast({ variant: 'destructive', title: 'Analysis Error', description: 'AI could not score your workout effectiveness.' });
        } finally {
            setIsAnalyzingEffectiveness(false);
        }
    }, [generatedWorkout, currentWorkoutGoal, cyclePhase, loggedActivityId, user, firestore, toast]);

    const handleActivityLogged = useCallback(() => {
        setNewActivityTrigger(t => t + 1);
    }, []);

    const handleDialogStateChange = useCallback((open: boolean) => {
        setIsWorkoutDialogOpen(open);
    }, []);

    const handleEffectivenessDialogStateChange = useCallback((open: boolean) => {
        setIsEffectivenessDialogOpen(open);
        if(!open) {
            // Reset for next time
            setLoggedActivityId(null);
        }
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
                    <CycleSyncedWorkouts onGenerateWorkout={handleStartWorkout} currentPhase={cyclePhase.toLowerCase() || 'unknown'} />
                </div>
                <RecoveryAdvisor recommendation={recoveryRecommendation} isLoading={isRecommendationLoading} />
            </div>
            
            <div>
                 <h2 className="text-2xl font-headline font-bold mb-2">Workout Library</h2>
                <CardDescription className="mb-4">Select your available equipment, then choose a goal to generate a workout tailored to you.</CardDescription>
                <div className="mb-6">
                    <MultiSelect
                        options={equipmentOptions}
                        value={selectedEquipment}
                        onChange={setSelectedEquipment}
                        placeholder="Select your equipment..."
                        className="w-full md:w-1/2"
                    />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {workoutCategories.map((cat, index) => (
                        <WorkoutCategoryCard 
                            key={cat.id} 
                            category={cat} 
                            index={index} 
                            onClick={handleStartWorkout}
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
                onOpenChange={handleDialogStateChange}
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
            
            <EffectivenessDialog 
                isOpen={isEffectivenessDialogOpen}
                onOpenChange={handleEffectivenessDialogStateChange}
                onAnalyze={handleAnalyzeEffectiveness}
                workoutName={originalGeneratedWorkout?.workoutName || ''}
                analysisResult={effectivenessAnalysis}
                isAnalyzing={isAnalyzingEffectiveness}
            />
        </div>
    );
}
