
'use client';
import {
  ArrowRight,
  Bot,
  BrainCircuit,
  Flame,
  HeartPulse,
  Loader2,
  Moon,
  Users,
  Sparkles,
  TrendingUp,
  Target,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState, useCallback } from "react";
import { collection, query, orderBy, limit, doc } from "firebase/firestore";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc, addDocumentNonBlocking } from "@/firebase";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { generateCoachingTip } from "@/ai/flows/ai-generated-coaching";
import { predictSymptomFlareUp, SymptomPredictorOutput } from "@/ai/flows/ai-symptom-predictor";
import { useUserProfile } from "@/hooks/use-user-profile";
import { Skeleton } from "@/components/ui/skeleton";
import { PlaceHolderImages } from "@/lib/placeholder-images";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DailyCheckIn } from "./daily-check-in";
import { useUserHealthData } from "@/hooks/use-user-health-data";
import { m } from "framer-motion";
import { ChartTooltipContent } from "@/components/ui/chart";
import { subDays } from "date-fns";

const HealthScoreCircle = () => {
  const { 
      recentSymptoms, 
      recentFitnessActivities, 
      recentMeals,
      dailyCheckIns
  } = useUserHealthData(7);

  const healthScore = useMemo(() => {
    if (!recentSymptoms || !recentFitnessActivities || !recentMeals || !dailyCheckIns) {
      return 0; // Return 0 or a loading state if data is not ready
    }
    
    // 1. Daily Check-in Score (Weight: 30%)
    const checkInCount = dailyCheckIns.length;
    const totalMood = dailyCheckIns.reduce((sum, day) => sum + (day.mood || 0), 0);
    const totalEnergy = dailyCheckIns.reduce((sum, day) => sum + (day.energyLevel || 0), 0);
    // Max possible score for check-ins is (5+5) * 7 days. We scale it to 100.
    const checkInScore = checkInCount > 0 ? ((totalMood + totalEnergy) / (checkInCount * 10)) * 100 : 70; // Default to 70 if no check-ins to not overly penalize

    // 2. Symptom Score (Weight: 40%)
    const symptomImpact = recentSymptoms.reduce((sum, symptom) => sum + (symptom.severity || 0), 0);
    // Max impact is arbitrary, let's cap it for scoring. Assume 5 severe symptoms a day is a high load. 5*5*7 = 175
    const maxSymptomImpact = 35; // 5 severe symptoms over the week
    const symptomScore = 100 - Math.min((symptomImpact / maxSymptomImpact) * 100, 100);

    // 3. Nutrition Score (Weight: 15%)
    const avgNutritionScore = recentMeals.length > 0 ? recentMeals.reduce((sum, meal) => sum + (meal.pcosScore || 0), 0) / recentMeals.length : 75; // Default to 75

    // 4. Fitness Score (Weight: 15%)
    const fitnessFrequency = recentFitnessActivities.length;
    // Score based on frequency, capping at 4 workouts in a week for 100.
    const fitnessScore = Math.min((fitnessFrequency / 4) * 100, 100);

    // Final Weighted Score
    const finalScore = 
        (checkInScore * 0.30) + 
        (symptomScore * 0.40) + 
        (avgNutritionScore * 0.15) + 
        (fitnessScore * 0.15);

    return Math.round(finalScore);

  }, [recentSymptoms, recentFitnessActivities, recentMeals, dailyCheckIns]);

  const circumference = 2 * Math.PI * 45; 
  const offset = circumference - (healthScore / 100) * circumference;

  return (
    <div className="relative size-40 flex items-center justify-center">
      <svg className="absolute size-full transform -rotate-90">
        <circle
          className="text-muted/50"
          strokeWidth="10"
          stroke="currentColor"
          fill="transparent"
          r="45"
          cx="50%"
          cy="50%"
        />
        <m.circle
          className="text-primary"
          strokeWidth="10"
          strokeDasharray={circumference}
          strokeLinecap="round"
          stroke="currentColor"
          fill="transparent"
          r="45"
          cx="50%"
          cy="50%"
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.5, ease: "easeOut" }}
        />
      </svg>
      <div className="text-center">
        <span className="text-4xl font-bold font-code text-foreground">
          {healthScore > 0 ? healthScore : '--'}
        </span>
        <p className="text-xs text-muted-foreground">Health Score</p>
      </div>
    </div>
  );
};

const CommunityPostItem = ({ post }: { post: any }) => {
    const firestore = useFirestore();
    const authorRef = useMemoFirebase(() => {
        if (!firestore || !post.userId) return null;
        return doc(firestore, 'publicUserProfiles', post.userId);
    }, [firestore, post.userId]);

    const { data: author } = useDoc(authorRef);
    const avatarPlaceholder = PlaceHolderImages.find(img => img.id === 'avatar2');
    
    return (
         <div className="flex items-start gap-4">
            <Avatar>
                <AvatarImage src={author?.photoURL || avatarPlaceholder?.imageUrl} data-ai-hint={avatarPlaceholder?.imageHint || "person smiling"} />
                <AvatarFallback>{author?.displayName?.charAt(0) || 'U'}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
                <div className="flex items-baseline gap-2">
                    <p className="font-semibold">{author?.displayName || 'Community Member'}</p>
                    <Badge variant="outline">{post.category}</Badge>
                </div>
                <p className="text-sm text-muted-foreground line-clamp-2">{post.content}</p>
            </div>
        </div>
    )
}

const SymptomForecastChart = ({ forecast }: { forecast: SymptomPredictorOutput['dailyForecast'] }) => {
    return (
        <ResponsiveContainer width="100%" height={200}>
            <BarChart data={forecast} margin={{ top: 5, right: 0, left: 0, bottom: 5 }}>
                <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} domain={[0, 100]} />
                <Tooltip 
                    content={<ChartTooltipContent />}
                    cursor={{fill: 'hsl(var(--muted-foreground) / 0.1)'}}
                />
                <Bar 
                    dataKey="riskScore" 
                    fill="hsl(var(--primary))" 
                    radius={[4, 4, 0, 0]} 
                />
            </BarChart>
        </ResponsiveContainer>
    );
};

const AccuracyTracker = () => {
    const score = 82; // Static placeholder score
    const circumference = 2 * Math.PI * 28;
    const offset = circumference - (score / 100) * circumference;

    return (
        <div className="flex items-center gap-4">
            <div className="relative size-16 flex items-center justify-center">
                 <svg className="absolute size-full transform -rotate-90">
                    <circle className="text-muted/30" strokeWidth="6" stroke="currentColor" fill="transparent" r="28" cx="50%" cy="50%" />
                    <circle
                        className="text-chart-4"
                        strokeWidth="6"
                        strokeDasharray={circumference}
                        strokeDashoffset={offset}
                        strokeLinecap="round"
                        stroke="currentColor"
                        fill="transparent"
                        r="28"
                        cx="50%"
                        cy="50%"
                    />
                </svg>
                <span className="text-lg font-bold font-code">{score}%</span>
            </div>
            <div>
                <p className="font-semibold">Prediction Accuracy</p>
                <p className="text-xs text-muted-foreground">The AI is learning from your logs.</p>
            </div>
        </div>
    )
}


const SymptomPredictor = () => {
    const [targetSymptom, setTargetSymptom] = useState<string>('');
    const [prediction, setPrediction] = useState<SymptomPredictorOutput | null>(null);
    const [isPredicting, setIsPredicting] = useState(false);
    const { toast } = useToast();
    const { user } = useUser();
    const firestore = useFirestore();
    const [symptomOptions, setSymptomOptions] = useState<{name: string, bodyZone: string}[]>([]);

    const { recentSymptoms, areSymptomsLoading } = useUserHealthData(20);

    useEffect(() => {
        if (recentSymptoms) {
            const symptomCounts = recentSymptoms.reduce((acc, symptom) => {
                acc[symptom.symptomType] = (acc[symptom.symptomType] || 0) + 1;
                return acc;
            }, {} as Record<string, number>);

            const recurringSymptoms = Object.keys(symptomCounts)
                .filter(name => symptomCounts[name] > 1)
                .map(name => {
                    const symptom = recentSymptoms.find(s => s.symptomType === name);
                    return { name, bodyZone: symptom?.bodyZone || 'General' };
                });
            
            setSymptomOptions(recurringSymptoms);
            if (recurringSymptoms.length > 0 && !targetSymptom) {
                setTargetSymptom(recurringSymptoms[0].name);
            }
        }
    }, [recentSymptoms, targetSymptom]);

    const handlePredict = useCallback(async () => {
        if (!targetSymptom || !user || !firestore) {
            toast({ variant: 'destructive', title: 'Missing Information', description: 'Please select a symptom to predict.' });
            return;
        }
        setIsPredicting(true);
        setPrediction(null);
        try {
            const result = await predictSymptomFlareUp({
                targetSymptom,
                historicalData: JSON.stringify(recentSymptoms),
            });
            setPrediction(result);

            // Save the prediction to Firestore for accuracy tracking
            const predictionLogRef = collection(firestore, 'users', user.uid, 'predictions');
            addDocumentNonBlocking(predictionLogRef, {
                userId: user.uid,
                predictionDate: new Date(),
                targetSymptom: targetSymptom,
                forecast: result.dailyForecast.map(f => ({ date: f.day, predictedRisk: f.riskScore })), // Simplified for now
                // wasSymptomLogged would be updated later by a separate process
            });

        } catch (error) {
            toast({ variant: 'destructive', title: 'Prediction Failed', description: 'The AI predictor encountered an error. Please try again.' });
        } finally {
            setIsPredicting(false);
        }
    }, [targetSymptom, recentSymptoms, toast, user, firestore]);
    
    return (
        <Card className="glass-card lg:col-span-2">
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><BrainCircuit className="text-secondary" /> Symptom Predictor</CardTitle>
                <CardDescription>Select a recurring symptom to get an AI-powered 7-day flare-up forecast.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex flex-col sm:flex-row gap-4">
                    <Select value={targetSymptom} onValueChange={setTargetSymptom} disabled={isPredicting || areSymptomsLoading}>
                        <SelectTrigger className="flex-1">
                            <SelectValue placeholder={areSymptomsLoading ? 'Loading symptoms...' : 'Select a recurring symptom...'} />
                        </SelectTrigger>
                        <SelectContent>
                            {symptomOptions.length > 0 ? symptomOptions.map(s => <SelectItem key={s.name} value={s.name}>{s.name}</SelectItem>) : <SelectItem value="no-data" disabled>No recurring symptoms logged yet</SelectItem>}
                        </SelectContent>
                    </Select>
                    <Button onClick={handlePredict} disabled={!targetSymptom || isPredicting || areSymptomsLoading} className="w-full sm:w-auto">
                        {isPredicting ? <Loader2 className="animate-spin" /> : 'Predict'}
                    </Button>
                </div>
                {prediction && (
                    <m.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-4 bg-black/20 rounded-lg space-y-4"
                    >
                        <div>
                            <div className="flex justify-between items-center mb-2">
                                <p className="text-sm text-muted-foreground">7-Day Risk Forecast for <span className="font-bold text-foreground">{targetSymptom}</span></p>
                                {prediction.confidenceScore && <Badge>Confidence: {prediction.confidenceScore}%</Badge>}
                            </div>
                            <SymptomForecastChart forecast={prediction.dailyForecast} />
                        </div>
                        
                        <div className="space-y-2">
                            <p className="text-xs font-bold uppercase text-primary">Reasoning</p>
                            <p className="text-sm text-muted-foreground">{prediction.predictionReasoning}</p>
                        </div>

                         {prediction.correlatedSymptoms && prediction.correlatedSymptoms.length > 0 && (
                            <div className="space-y-2">
                                <p className="text-xs font-bold uppercase text-secondary">Correlated Symptoms</p>
                                <div className="flex flex-wrap gap-2">
                                    {prediction.correlatedSymptoms.map(s => <Badge key={s}>{s}</Badge>)}
                                </div>
                            </div>
                        )}
                        
                        <div className="space-y-2 pt-2">
                            <p className="text-xs font-bold uppercase text-chart-4">Preventative Action</p>
                            <p className="text-sm">{prediction.preventativeAction}</p>
                        </div>
                    </m.div>
                )}
            </CardContent>
        </Card>
    )
}

export default function DashboardPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const { userProfile, isLoading: isProfileLoading } = useUserProfile();

  const [aiCoachingTip, setAiCoachingTip] = useState<string | null>(null);
  const [isAiTipLoading, setIsAiTipLoading] = useState(true);
  const [isLoggingSymptom, setIsLoggingSymptom] = useState<string | null>(null);

  const {
    cycleDay,
    cyclePhase,
    areSymptomsLoading,
    areMealsLoading,
    areFitnessActivitiesLoading,
    areLabResultsLoading,
    areCyclesLoading,
  } = useUserHealthData();
  
  const phaseBadgeColors: { [key: string]: string } = {
    Menstrual: 'bg-cycle-menstrual/20 text-cycle-menstrual border-cycle-menstrual/30',
    Follicular: 'bg-cycle-follicular/20 text-cycle-follicular border-cycle-follicular/30',
    Ovulation: 'bg-cycle-ovulation/20 text-cycle-ovulation border-cycle-ovulation/30',
    Luteal: 'bg-cycle-luteal/20 text-cycle-luteal border-cycle-luteal/30',
  }

  const postsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'communityPosts'), orderBy('createdAt', 'desc'), limit(3));
  }, [firestore, user]);
  const { data: communityPosts, isLoading: arePostsLoading } = useCollection(postsQuery);

  useEffect(() => {
    const fetchCoachingTip = async () => {
        if (!userProfile || !user) return;
        
        setIsAiTipLoading(true);
        try {
            const context = {
                userId: user.uid,
                userQuery: "What's one thing I can focus on today based on my recent data?",
                 userProfile: {
                    wellnessGoal: userProfile.wellnessGoal || 'General Health',
                    pcosJourneyProgress: userProfile.pcosJourneyProgress || 1,
                },
                conversationHistory: userProfile.conversationHistory || [],
            };
            const result = await generateCoachingTip(context);
            setAiCoachingTip(result.coachingTip);
        } catch (error) {
            setAiCoachingTip("Could not load a tip right now. Try focusing on gentle movement today!");
        } finally {
            setIsAiTipLoading(false);
        }
    };
    if(userProfile && !isProfileLoading && cycleDay !== null && !areSymptomsLoading && !areMealsLoading && !areFitnessActivitiesLoading && !areLabResultsLoading) {
        fetchCoachingTip();
    }
  }, [user, userProfile, isProfileLoading, cycleDay, areSymptomsLoading, areMealsLoading, areFitnessActivitiesLoading, areLabResultsLoading]);


  const handleQuickLogSymptom = useCallback(async (symptom: {name: string, bodyZone: string}) => {
    if (!user || !firestore || isLoggingSymptom) return;
    setIsLoggingSymptom(symptom.name);
    const collectionRef = collection(firestore, 'users', user.uid, 'symptomLogs');
    try {
      await addDocumentNonBlocking(collectionRef, {
        symptomType: symptom.name,
        severity: 3, 
        bodyZone: symptom.bodyZone,
        userId: user.uid,
        timestamp: new Date(),
      });
      toast({
        title: "Symptom Logged!",
        description: `${symptom.name} has been added to your log for today.`
      });
    } catch (error) {
        toast({
          variant: "destructive",
          title: "Error",
          description: `Could not log ${symptom.name}. Please try again.`
        });
    } finally {
        setIsLoggingSymptom(null);
    }
  }, [user, firestore, toast, isLoggingSymptom]);
  
  const journeyProgress = userProfile?.pcosJourneyProgress || 0;
  const progressPercent = journeyProgress > 0 ? Math.min((journeyProgress / 90) * 100, 100) : 0;
  const symptoms = [
      { name: "Fatigue", bodyZone: "General" },
      { name: "Bloating", bodyZone: "Torso" },
      { name: "Cramps", bodyZone: "Pelvis" },
      { name: "Acne", bodyZone: "Face" },
      { name: "Mood Swings", bodyZone: "Head" },
  ];

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-3xl font-headline font-bold tracking-tight">
            Welcome Back, {userProfile?.displayName || user?.displayName || 'there'}!
          </h2>
          <p className="text-muted-foreground">
            Here's your wellness overview for today.
          </p>
        </div>
      </div>
      <DailyCheckIn />
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="glass-card lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Flame className="text-chart-3" />
              PCOS Compass: Your 90-Day Journey
            </CardTitle>
            {isProfileLoading ? <Skeleton className="h-4 w-3/4" /> : <CardDescription>
              Day {journeyProgress}: You're making amazing progress in your journey!
            </CardDescription>}
          </CardHeader>
          <CardContent>
            {isProfileLoading ? <Skeleton className="h-3 w-full" /> : <Progress value={progressPercent} className="h-3" />}
            <div className="flex justify-between text-xs text-muted-foreground mt-2">
              <span>Tracking Mastery</span>
              <span>Lifestyle Integration</span>
              <span>Advanced Insights</span>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Moon className="text-primary" />
              Cycle Overview
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            {areCyclesLoading ? <div className="space-y-2 flex flex-col items-center"><Skeleton className="h-8 w-24" /><Skeleton className="h-5 w-32" /></div> : cycleDay && cyclePhase !== 'Unknown' ? (
                <>
                    <div className="text-5xl font-bold font-code">Day {cycleDay}</div>
                    <Badge className={cn("mt-2", cyclePhase && phaseBadgeColors[cyclePhase])}>
                        {cyclePhase} Phase
                    </Badge>
                </>
            ) : (
                <div className="text-muted-foreground text-sm">
                    <p>No cycle data yet.</p>
                    <Button variant="link" asChild><Link href="/cycle-tracker">Log your period</Link></Button>
                </div>
            )}
          </CardContent>
        </Card>
        <Card className="glass-card flex flex-col items-center justify-center">
          <CardHeader className="pb-2">
            <CardTitle className="text-center">Health Score</CardTitle>
          </CardHeader>
          <CardContent>
             <HealthScoreCircle />
          </CardContent>
        </Card>
      </div>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <SymptomPredictor />
        <Card className="glass-card lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bot className="text-primary" />
              Today's AI Coaching
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isAiTipLoading ? (
                 <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="animate-spin size-4"/>
                    <span>Generating your daily tip...</span>
                 </div>
            ) : (
                 <p className="font-accent text-lg italic text-muted-foreground">
                    "{aiCoachingTip}"
                </p>
            )}
          </CardContent>
        </Card>
      </div>
       <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HeartPulse className="text-destructive" />
              Log Your Symptoms
            </CardTitle>
            <CardDescription>
              Quickly add how you're feeling today.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {symptoms.map((symptom) => (
              <Button key={symptom.name} variant="outline" size="lg" className="h-12" onClick={() => handleQuickLogSymptom(symptom)} disabled={!!isLoggingSymptom}>
                {isLoggingSymptom === symptom.name ? <Loader2 className="animate-spin" /> : symptom.name}
              </Button>
            ))}
            <Button variant="secondary" size="lg" className="h-12" asChild>
              <Link href="/symptom-log">Add Detailed Entry +</Link>
            </Button>
          </CardContent>
        </Card>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="glass-card lg:col-span-2">
            <CardHeader>
            <div className="flex justify-between items-center">
                <div>
                <CardTitle className="flex items-center gap-2">
                    <Users className="text-secondary" />
                    The Sisterhood Feed
                </CardTitle>
                <CardDescription>
                    Connect with the community for support and inspiration.
                </CardDescription>
                </div>
                <Button variant="ghost" asChild>
                    <Link href="/community">
                    View All <ArrowRight className="ml-2 size-4" />
                    </Link>
                </Button>
            </div>
            </CardHeader>
            <CardContent className="space-y-4">
            {arePostsLoading ? (
                <div className="space-y-4">
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                </div>
            ) : communityPosts && communityPosts.length > 0 ? (
                communityPosts.map((post: any) => (
                <CommunityPostItem key={post.id} post={post} />
                ))
            ) : (
                <p className="text-sm text-muted-foreground text-center">No community posts yet. Be the first!</p>
            )}
            </CardContent>
        </Card>
         <Card className="glass-card">
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><Target className="text-chart-4"/> Accuracy Tracker</CardTitle>
                <CardDescription>How well the AI is learning.</CardDescription>
            </CardHeader>
            <CardContent>
                <AccuracyTracker />
            </CardContent>
        </Card>
      </div>
    </div>
  );
}
