
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
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { collection, query, orderBy, limit, doc } from "firebase/firestore";
import { differenceInDays } from 'date-fns';

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
import { sanitizeNutritionLogs, sanitizeSymptomLogs, sanitizeWorkoutLogs } from "@/lib/ai/redact";
import { generateCoachingTip } from "@/ai/flows/ai-generated-coaching";
import { predictSymptomFlareUp, SymptomPredictorOutput } from "@/ai/flows/ai-symptom-predictor";
import { useUserProfile } from "@/hooks/use-user-profile";
import { Skeleton } from "@/components/ui/skeleton";
import { PlaceHolderImages } from "@/lib/placeholder-images";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DailyCheckIn } from "./daily-check-in";

const HealthScoreCircle = ({ score }: { score: number }) => {
  const circumference = 2 * Math.PI * 45; 
  const offset = circumference - (score / 100) * circumference;

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
        <circle
          className="text-primary"
          strokeWidth="10"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          stroke="currentColor"
          fill="transparent"
          r="45"
          cx="50%"
          cy="50%"
          style={{ transition: "stroke-dashoffset 0.5s ease-out" }}
        />
      </svg>
      <div className="text-center">
        <span className="text-4xl font-bold font-code text-foreground">
          {score}
        </span>
        <p className="text-xs text-muted-foreground">Healthy</p>
      </div>
    </div>
  );
};

const symptoms = [
  { name: "Fatigue", bodyZone: "torso" },
  { name: "Bloating", bodyZone: "torso" },
  { name: "Cramps", bodyZone: "pelvis" },
  { name: "Acne", bodyZone: "face" },
  { name: "Mood Swings", bodyZone: "head" },
];

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

const SymptomPredictor = ({ aiDataSharingEnabled, isPrivacyLoaded }: { aiDataSharingEnabled: boolean; isPrivacyLoaded: boolean }) => {
    const [targetSymptom, setTargetSymptom] = useState<string>('');
    const [prediction, setPrediction] = useState<SymptomPredictorOutput | null>(null);
    const [isPredicting, setIsPredicting] = useState(false);
    const { user } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();

    const symptomsQuery = useMemoFirebase(() => {
        if (!user || !firestore) return null;
        return query(collection(firestore, `users/${user.uid}/symptomLogs`), orderBy('timestamp', 'desc'), limit(20));
    }, [user, firestore]);
    const { data: historicalSymptoms, isLoading: isLoadingSymptoms } = useCollection(symptomsQuery);

    const sanitizedHistoricalSymptoms = useMemo(
        () => sanitizeSymptomLogs(historicalSymptoms || []),
        [historicalSymptoms]
    );

    const handlePredict = async () => {
        if (!aiDataSharingEnabled) {
            return;
        }

        if (!targetSymptom || !historicalSymptoms || historicalSymptoms.length === 0 || sanitizedHistoricalSymptoms.length === 0) {
            toast({ variant: 'destructive', title: 'Missing Information', description: 'Please select a symptom and ensure you have logged some data.' });
            return;
        }
        setIsPredicting(true);
        setPrediction(null);
        try {
            const result = await predictSymptomFlareUp({
                targetSymptom,
                historicalData: JSON.stringify(sanitizedHistoricalSymptoms),
            });
            setPrediction(result);
        } catch (error) {
            toast({ variant: 'destructive', title: 'Prediction Failed', description: 'The AI predictor encountered an error. Please try again.' });
        } finally {
            setIsPredicting(false);
        }
    };
    
    return (
        <Card className="glass-card lg:col-span-2">
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><BrainCircuit className="text-secondary" /> Symptom Predictor</CardTitle>
                <CardDescription>Select a symptom to get an AI-powered flare-up prediction for the next 1-3 days.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {!aiDataSharingEnabled && isPrivacyLoaded && (
                    <div className="rounded-lg border border-dashed border-muted-foreground/40 bg-muted/10 p-4 text-sm text-muted-foreground">
                        AI-powered predictions are currently unavailable because you have not enabled data sharing with trusted AI partners.
                        <div className="pt-3">
                            <Button variant="link" className="px-0" asChild>
                                <Link href="/settings">Update privacy preferences</Link>
                            </Button>
                        </div>
                    </div>
                )}
                <div className="flex gap-4">
                    <Select value={targetSymptom} onValueChange={setTargetSymptom} disabled={isPredicting || isLoadingSymptoms || !aiDataSharingEnabled}>
                        <SelectTrigger className="flex-1">
                            <SelectValue placeholder={isLoadingSymptoms ? 'Loading symptoms...' : 'Select a symptom...'} />
                        </SelectTrigger>
                        <SelectContent>
                            {symptoms.map(s => <SelectItem key={s.name} value={s.name}>{s.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    <Button onClick={handlePredict} disabled={!targetSymptom || isPredicting || isLoadingSymptoms || !aiDataSharingEnabled}>
                        {isPredicting ? <Loader2 className="animate-spin" /> : 'Predict'}
                    </Button>
                </div>
                {prediction && aiDataSharingEnabled && (
                    <div className="p-4 bg-black/20 rounded-lg space-y-2">
                        <h4 className="font-bold">{prediction.riskScore}% Risk of {targetSymptom}</h4>
                        <p className="text-sm text-muted-foreground">{prediction.predictionReasoning}</p>
                        <div className="pt-2">
                            <p className="text-xs font-bold uppercase text-primary">Preventative Action</p>
                            <p className="text-sm">{prediction.preventativeAction}</p>
                        </div>
                    </div>
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

  const cyclesQuery = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return query(collection(firestore, 'users', user.uid, 'cycles'), orderBy('startDate', 'desc'), limit(1));
  }, [user, firestore]);
  const { data: cyclesData, isLoading: areCyclesLoading } = useCollection(cyclesQuery);
  const latestCycle = useMemo(() => cyclesData?.[0], [cyclesData]);
  
  const cycleDay = useMemo(() => {
    if (latestCycle?.startDate) {
      const start = (latestCycle.startDate as any).toDate();
      const day = differenceInDays(new Date(), start) + 1;
      return day > 0 ? day : 1;
    }
    return null;
  }, [latestCycle]);

  const cyclePhase = useMemo(() => {
    if (!cycleDay || !latestCycle) return null;
    const avgCycleLength = (latestCycle.length && typeof latestCycle.length === 'number') ? latestCycle.length : 28;
    const ovulationDay = avgCycleLength - 14;
    const follicularEnd = ovulationDay - 3;
    const ovulationEnd = ovulationDay + 2;

    if (cycleDay <= 5) return 'Menstrual';
    if (cycleDay <= follicularEnd) return 'Follicular';
    if (cycleDay <= ovulationEnd) return 'Ovulation';
    return 'Luteal';
  }, [cycleDay, latestCycle]);

  const phaseBadgeColors: { [key: string]: string } = {
    Menstrual: 'bg-cycle-menstrual/20 text-cycle-menstrual border-cycle-menstrual/30',
    Follicular: 'bg-cycle-follicular/20 text-cycle-follicular border-cycle-follicular/30',
    Ovulation: 'bg-cycle-ovulation/20 text-cycle-ovulation border-cycle-ovulation/30',
    Luteal: 'bg-cycle-luteal/20 text-cycle-luteal border-cycle-luteal/30',
  }

  const symptomsQuery = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return query(collection(firestore, `users/${user.uid}/symptomLogs`), orderBy('timestamp', 'desc'), limit(5));
  }, [user, firestore]);
  const { data: recentSymptoms, isLoading: areSymptomsLoading } = useCollection(symptomsQuery);

  const nutritionQuery = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return query(collection(firestore, `users/${user.uid}/nutritionLogs`), orderBy('loggedAt', 'desc'), limit(3));
  }, [user, firestore]);
  const { data: recentMeals, isLoading: areMealsLoading } = useCollection(nutritionQuery);

  const fitnessQuery = useMemoFirebase(() => {
      if (!user || !firestore) return null;
      return query(collection(firestore, `users/${user.uid}/fitnessActivities`), orderBy('completedAt', 'desc'), limit(3));
  }, [user, firestore]);
  const { data: recentWorkouts, isLoading: areWorkoutsLoading } = useCollection(fitnessQuery);

  const postsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'communityPosts'), orderBy('createdAt', 'desc'), limit(3));
  }, [firestore]);
  const { data: communityPosts, isLoading: arePostsLoading } = useCollection(postsQuery);

  const sanitizedRecentSymptoms = useMemo(() => sanitizeSymptomLogs(recentSymptoms || []), [recentSymptoms]);
  const sanitizedRecentMeals = useMemo(() => sanitizeNutritionLogs(recentMeals || []), [recentMeals]);
  const sanitizedRecentWorkouts = useMemo(() => sanitizeWorkoutLogs(recentWorkouts || []), [recentWorkouts]);

  const hasAiConsent = userProfile?.onboarding?.privacySettings?.ai_data_sharing === true;
  const isPrivacyLoaded = Boolean(userProfile);
  const shouldShowAiConsentMessage = isPrivacyLoaded && !hasAiConsent;

  useEffect(() => {
    const fetchCoachingTip = async () => {
        if (!userProfile) return;

        setIsAiTipLoading(true);
        try {
            const cycleContext = cycleDay ? `Currently on day ${cycleDay} of her cycle.` : "No current cycle data available.";
            const context = {
                pcosJourneyProgress: userProfile?.pcosJourneyProgress || 1,
                recentSymptoms: JSON.stringify(sanitizedRecentSymptoms),
                cycleData: cycleContext,
                nutritionData: JSON.stringify(sanitizedRecentMeals),
                fitnessData: JSON.stringify(sanitizedRecentWorkouts),
                labResultData: '[]',
                userQuery: "What's one thing I can focus on today based on my recent data?",
            };
            const result = await generateCoachingTip(context);
            setAiCoachingTip(result.coachingTip);
        } catch (error) {
            setAiCoachingTip("Could not load a tip right now. Try focusing on gentle movement today!");
        } finally {
            setIsAiTipLoading(false);
        }
    };
    if(userProfile && cycleDay !== null && !areSymptomsLoading && !areMealsLoading && !areWorkoutsLoading) {
        if (!hasAiConsent) {
            setAiCoachingTip(null);
            setIsAiTipLoading(false);
            return;
        }
        fetchCoachingTip();
    }
  }, [userProfile, cycleDay, sanitizedRecentSymptoms, sanitizedRecentMeals, sanitizedRecentWorkouts, hasAiConsent, areSymptomsLoading, areMealsLoading, areWorkoutsLoading]);


  const handleQuickLogSymptom = async (symptom: {name: string, bodyZone: string}) => {
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
  }
  
  const journeyProgress = userProfile?.pcosJourneyProgress || 0;
  const healthScore = userProfile?.healthScore || 0;
  const progressPercent = journeyProgress > 0 ? Math.min((journeyProgress / 90) * 100, 100) : 0;

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
            {areCyclesLoading ? <div className="space-y-2 flex flex-col items-center"><Skeleton className="h-8 w-24" /><Skeleton className="h-5 w-32" /></div> : cycleDay && cyclePhase ? (
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
            {isProfileLoading ? <Skeleton className="size-40 rounded-full"/> : <HealthScoreCircle score={healthScore} />}
          </CardContent>
        </Card>
      </div>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <SymptomPredictor aiDataSharingEnabled={hasAiConsent} isPrivacyLoaded={isPrivacyLoaded} />
        <Card className="glass-card lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bot className="text-primary" />
              Today's AI Coaching
            </CardTitle>
          </CardHeader>
          <CardContent>
            {shouldShowAiConsentMessage ? (
                <div className="rounded-lg border border-dashed border-muted-foreground/40 bg-muted/10 p-4 text-sm text-muted-foreground">
                    AI-powered coaching is paused because you have not consented to share anonymized data with our AI providers.
                    <div className="pt-3">
                        <Button variant="link" className="px-0" asChild>
                            <Link href="/settings">Manage privacy controls</Link>
                        </Button>
                    </div>
                </div>
            ) : isAiTipLoading ? (
                 <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="animate-spin size-4"/>
                    <span>Generating your daily tip...</span>
                 </div>
            ) : (
                 <p className="font-accent text-lg italic text-muted-foreground">
                    {aiCoachingTip ? `"${aiCoachingTip}"` : 'No tip available right now. Check back soon!'}
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
      <Card className="glass-card">
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
    </div>
  );
}
