
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, FileText, BrainCircuit, Target, CalendarHeart, CalendarClock, LineChart, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUser, useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, orderBy, where, Timestamp, limit } from "firebase/firestore";
import { useUserProfile } from "@/hooks/use-user-profile";
import { useMemo, useState, useEffect } from "react";
import { addDays, differenceInDays, format, isFuture, subDays } from 'date-fns';
import { generateCoachingTip } from "@/ai/flows/ai-generated-coaching";
import { identifyPcosSubtype, PcosSubtypeOutput } from "@/ai/flows/ai-pcos-subtype-identifier";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis, ZAxis, Area, AreaChart } from 'recharts';
import { ChartContainer, ChartTooltipContent } from "@/components/ui/chart";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { m } from "framer-motion";

const HealthScoreDashboard = () => {
    const { userProfile, isLoading } = useUserProfile();
    const healthScore = userProfile?.healthScore || 0;

    const scoreHistory = useMemo(() => {
        if (isLoading || healthScore === 0) return [];
        // When historical data is available, this array can be populated with more entries.
        // For now, it reflects the current, real score.
        return [
            { date: 'Current', score: healthScore },
        ];
    }, [healthScore, isLoading]);

    const chartConfig = {
        score: {
          label: "Health Score",
          color: "hsl(var(--primary))",
        },
    }

    return (
        <Card className="glass-card lg:col-span-2">
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><LineChart className="text-primary"/> Health Score Trend</CardTitle>
                <CardDescription>An overview of your wellness metrics. Historical data coming soon.</CardDescription>
            </CardHeader>
            <CardContent>
                {isLoading ? <Skeleton className="h-64" /> : scoreHistory.length > 0 ? (
                    <ChartContainer config={chartConfig} className="h-64 w-full">
                        <AreaChart data={scoreHistory} margin={{ top: 5, right: 20, left: -10, bottom: 0 }}>
                            <defs>
                                <linearGradient id="fillScore" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8}/>
                                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.1}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid vertical={false} strokeDasharray="3 3" />
                            <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} />
                            <YAxis domain={[60, 100]} tickLine={false} axisLine={false} tickMargin={8} />
                            <Tooltip content={<ChartTooltipContent indicator="dot" />} />
                            <Area type="monotone" dataKey="score" stroke="hsl(var(--primary))" strokeWidth={2} fillOpacity={1} fill="url(#fillScore)" />
                        </AreaChart>
                    </ChartContainer>
                ) : (
                    <div className="h-64 flex items-center justify-center text-muted-foreground">
                        <p>Your health score will appear here once calculated.</p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

const PredictionCard = ({ icon: Icon, title, date, daysAway, color }: { icon: React.ElementType, title: string, date: Date | null, daysAway: number, color: string }) => {
    if (!date || !isFuture(date)) {
        return (
             <div className="flex items-center gap-4 text-muted-foreground p-3 rounded-lg bg-muted/50">
                <div className={cn("p-3 rounded-full bg-muted", color)}>
                    <Icon className="size-6" />
                </div>
                <div>
                    <h4 className="font-bold">{title}</h4>
                    <p className="text-sm">Not enough data to predict.</p>
                </div>
            </div>
        )
    }

    return (
        <div className="flex items-center gap-4 p-3 rounded-lg bg-muted/50">
            <div className={cn("p-3 rounded-full", color)}>
                 <Icon className="size-6" />
            </div>
            <div>
                <h4 className="font-bold">{title}</h4>
                <p className="text-sm text-muted-foreground">{format(date, 'MMMM do')} • <span className="font-semibold">{daysAway} days away</span></p>
            </div>
        </div>
    )
}

const CyclePredictionEngine = () => {
    const { user } = useUser();
    const firestore = useFirestore();
    const cyclesQuery = useMemoFirebase(() => {
        if (!user || !firestore) return null;
        return query(collection(firestore, 'users', user.uid, 'cycles'), orderBy('startDate', 'desc'), limit(6));
    }, [user, firestore]);
    const { data: cycles, isLoading } = useCollection(cyclesQuery);

    const predictions = useMemo(() => {
        if (!cycles || cycles.length < 2) return null;

        const completedCycles = cycles.slice(1).filter(c => c.length && typeof c.length === 'number');
        if (completedCycles.length === 0) return null;

        const avgCycleLength = Math.round(completedCycles.reduce((sum, c) => sum + c.length, 0) / completedCycles.length);
        if(isNaN(avgCycleLength)) return null;

        const lastCycle = cycles[0];
        const lastStartDate = (lastCycle.startDate as any)?.toDate();
        if(!lastStartDate) return null;

        const nextPeriodStart = addDays(lastStartDate, avgCycleLength);
        const ovulationDay = Math.round(avgCycleLength - 14);
        const nextOvulationDate = addDays(lastStartDate, ovulationDay);
        const fertileWindowStart = addDays(nextOvulationDate, -5);

        const now = new Date();
        return {
            nextPeriod: { date: nextPeriodStart, daysAway: differenceInDays(nextPeriodStart, now) },
            nextOvulation: { date: nextOvulationDate, daysAway: differenceInDays(nextOvulationDate, now) },
            fertileWindow: { date: fertileWindowStart, daysAway: differenceInDays(fertileWindowStart, now) }
        }
    }, [cycles]);

    return (
        <Card className="glass-card">
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><BrainCircuit className="text-secondary"/> Cycle Prediction Engine</CardTitle>
                <CardDescription>AI-powered cycle forecasting.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                 {isLoading ? (
                    <>
                        <Skeleton className="h-16 w-full" />
                        <Skeleton className="h-16 w-full" />
                        <Skeleton className="h-16 w-full" />
                    </>
                ) : (
                    <>
                        <PredictionCard icon={CalendarClock} title="Next Period" date={predictions?.nextPeriod.date || null} daysAway={predictions?.nextPeriod.daysAway || 0} color="bg-cycle-menstrual/20 text-cycle-menstrual" />
                        <PredictionCard icon={CalendarHeart} title="Fertile Window" date={predictions?.fertileWindow.date || null} daysAway={predictions?.fertileWindow.daysAway || 0} color="bg-cycle-follicular/20 text-cycle-follicular" />
                        <PredictionCard icon={Target} title="Ovulation Day" date={predictions?.nextOvulation.date || null} daysAway={predictions?.nextOvulation.daysAway || 0} color="bg-cycle-ovulation/20 text-cycle-ovulation" />
                    </>
                 )}
            </CardContent>
        </Card>
    );
};

const SymptomCorrelationMatrix = () => {
    const { user } = useUser();
    const firestore = useFirestore();
    
    const symptomsQuery = useMemoFirebase(() => {
        if (!user || !firestore) return null;
        const oneYearAgo = subDays(new Date(), 365);
        return query(
            collection(firestore, 'users', user.uid, 'symptomLogs'),
            where('timestamp', '>=', Timestamp.fromDate(oneYearAgo)),
            orderBy('timestamp', 'desc')
        );
    }, [user, firestore]);
    const { data: symptoms, isLoading: symptomsLoading } = useCollection(symptomsQuery);

    const cyclesQuery = useMemoFirebase(() => {
        if (!user || !firestore) return null;
        const oneYearAgo = subDays(new Date(), 365);
        return query(collection(firestore, 'users', user.uid, 'cycles'), where('startDate', '>=', Timestamp.fromDate(oneYearAgo)), orderBy('startDate', 'asc'));
    }, [user, firestore]);
    const { data: cycles, isLoading: cyclesLoading } = useCollection(cyclesQuery);

    const chartData = useMemo(() => {
        if (!symptoms || !cycles || cycles.length === 0) return [];
        
        return symptoms.map(symptom => {
            if(!symptom.timestamp || typeof symptom.severity !== 'number') return null;

            const symptomDate = (symptom.timestamp as any).toDate();
            const cycle = [...cycles].reverse().find(c => {
                const startDate = (c.startDate as any)?.toDate();
                return startDate && symptomDate >= startDate;
            });

            if (cycle) {
                const cycleDay = differenceInDays(symptomDate, (cycle.startDate as any).toDate()) + 1;
                return {
                    cycleDay,
                    severity: symptom.severity,
                    name: symptom.symptomType,
                };
            }
            return null;
        }).filter(Boolean);

    }, [symptoms, cycles]);

     const chartConfig = {
        symptoms: { label: "Symptoms" }
    };

    return (
        <Card className="glass-card lg:col-span-2">
            <CardHeader>
                <CardTitle>Symptom Correlation Matrix</CardTitle>
                <CardDescription>Discover how your symptoms relate to your cycle day (last 365 days).</CardDescription>
            </CardHeader>
            <CardContent>
                {(symptomsLoading || cyclesLoading) ? <Skeleton className="h-80 w-full" /> : chartData.length > 0 ? (
                    <ChartContainer config={chartConfig} className="h-80 w-full">
                         <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: -10 }}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis type="number" dataKey="cycleDay" name="Cycle Day" unit="" domain={[1, 45]} tickLine={false} axisLine={false} tickMargin={8} />
                            <YAxis type="number" dataKey="severity" name="Severity" unit="" domain={[0, 6]} tickLine={false} axisLine={false} tickMargin={8} />
                            <ZAxis type="string" dataKey="name" name="Symptom" />
                            <Tooltip content={<ChartTooltipContent cursor={false} />} />
                            <Scatter name="Symptoms" data={chartData as any} fill="hsl(var(--primary))" />
                        </ScatterChart>
                    </ChartContainer>
                ) : (
                     <div className="h-80 flex items-center justify-center text-muted-foreground">
                        <p>Log more symptoms and cycles to see correlations here.</p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

const PcosSubtypeIdentifier = () => {
    const { user } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState<PcosSubtypeOutput | null>(null);

    const symptomsQuery = useMemoFirebase(() => {
        if (!user || !firestore) return null;
        return query(collection(firestore, `users/${user.uid}/symptomLogs`), orderBy('timestamp', 'desc'), limit(50));
    }, [user, firestore]);
    const { data: symptoms, isLoading: symptomsLoading } = useCollection(symptomsQuery);
    
    const cyclesQuery = useMemoFirebase(() => {
        if (!user || !firestore) return null;
        return query(collection(firestore, 'users', user.uid, 'cycles'), orderBy('startDate', 'desc'), limit(6));
    }, [user, firestore]);
    const { data: cycles, isLoading: cyclesLoading } = useCollection(cyclesQuery);

    const labResultsQuery = useMemoFirebase(() => {
        if (!user || !firestore) return null;
        return query(collection(firestore, 'users', user.uid, 'labResults'), orderBy('testDate', 'desc'), limit(1));
    }, [user, firestore]);
    const { data: labResults, isLoading: labResultsLoading } = useCollection(labResultsQuery);

    const handleIdentifySubtype = async () => {
        if ((!symptoms || symptoms.length === 0) && (!cycles || cycles.length === 0)) {
            toast({ variant: 'destructive', title: "Not Enough Data", description: "Please log some symptoms and cycles to use this feature." });
            return;
        }
        setIsLoading(true);
        setResult(null);

        // Create summaries
        const symptomSummary = JSON.stringify(
            [...new Set(symptoms?.map(s => s.symptomType) || [])]
        );
        
        let cycleSummary = "No cycle data logged.";
        if (cycles && cycles.length > 1) {
            const completedCycles = cycles.slice(1).filter(c => c.length && typeof c.length === 'number');
            if (completedCycles.length > 0) {
                const avgLength = Math.round(completedCycles.reduce((sum, c) => sum + c.length, 0) / completedCycles.length);
                cycleSummary = `Cycles average around ${avgLength} days.`;
            }
        } else if (cycles && cycles.length === 1) {
            cycleSummary = "Only one cycle logged, regularity is unknown.";
        }
        
        const labResultSummary = JSON.stringify(labResults?.[0] || {});

        try {
            const analysisResult = await identifyPcosSubtype({ symptomSummary, cycleSummary, labResultSummary });
            setResult(analysisResult);
        } catch (error) {
            toast({ variant: 'destructive', title: "AI Error", description: "Could not identify subtype. Please try again." });
        } finally {
            setIsLoading(false);
        }
    }
    
    const canAnalyze = (symptoms && symptoms.length > 0) || (cycles && cycles.length > 0);

    return (
        <Card className="glass-card lg:col-span-2">
             <CardHeader>
                <CardTitle className="flex items-center gap-2 text-gradient"><Sparkles /> PCOS Subtype Discovery</CardTitle>
                <CardDescription>Understand your potential PCOS subtype based on your logged data. This is not a medical diagnosis.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <Button onClick={handleIdentifySubtype} disabled={isLoading || symptomsLoading || cyclesLoading || labResultsLoading || !canAnalyze}>
                    {isLoading ? <Loader2 className="animate-spin" /> : "Analyze My Data"}
                </Button>
                
                {result && (
                    <m.div initial={{opacity: 0, y: 10}} animate={{opacity: 1, y: 0}} className="space-y-4 pt-4">
                        <div>
                            <p className="text-sm font-bold uppercase text-primary">Potential Subtype</p>
                            <h3 className="text-2xl font-bold font-headline">{result.pcosSubtype}</h3>
                        </div>
                         <div>
                            <p className="text-sm font-bold uppercase text-secondary">What This Means</p>
                            <p className="text-muted-foreground">{result.subtypeDescription}</p>
                        </div>
                        <div>
                            <p className="text-sm font-bold uppercase text-chart-4">Recommendations</p>
                            <p className="text-muted-foreground">{result.recommendations}</p>
                        </div>
                         <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                           <p className="font-bold">Disclaimer</p>
                           <p>{result.disclaimer}</p>
                        </div>
                    </m.div>
                )}
            </CardContent>
        </Card>
    );
};


const AIGeneratedInsights = () => {
    const { user } = useUser();
    const firestore = useFirestore();
    const { userProfile, isLoading: isProfileLoading } = useUserProfile();
    const [aiInsight, setAiInsight] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const { toast } = useToast();

    const symptomsQuery = useMemoFirebase(() => {
        if (!user || !firestore) return null;
        return query(collection(firestore, `users/${user.uid}/symptomLogs`), orderBy('timestamp', 'desc'), limit(15));
    }, [user, firestore]);
    const { data: recentSymptoms, isLoading: areSymptomsLoading } = useCollection(symptomsQuery);

    const nutritionQuery = useMemoFirebase(() => {
        if (!user || !firestore) return null;
        return query(collection(firestore, `users/${user.uid}/nutritionLogs`), orderBy('loggedAt', 'desc'), limit(5));
    }, [user, firestore]);
    const { data: recentMeals, isLoading: areMealsLoading } = useCollection(nutritionQuery);

    const fitnessQuery = useMemoFirebase(() => {
        if (!user || !firestore) return null;
        return query(collection(firestore, `users/${user.uid}/fitnessActivities`), orderBy('completedAt', 'desc'), limit(5));
    }, [user, firestore]);
    const { data: recentWorkouts, isLoading: areWorkoutsLoading } = useCollection(fitnessQuery);

    const cyclesQuery = useMemoFirebase(() => {
        if (!user || !firestore) return null;
        return query(collection(firestore, 'users', user.uid, 'cycles'), orderBy('startDate', 'desc'), limit(1));
      }, [user, firestore]);
    const { data: cyclesData, isLoading: areCyclesLoading } = useCollection(cyclesQuery);

    const labResultsQuery = useMemoFirebase(() => {
        if (!user || !firestore) return null;
        return query(collection(firestore, `users/${user.uid}/labResults`), orderBy('testDate', 'desc'), limit(3));
    }, [user, firestore]);
    const { data: recentLabResults, isLoading: areLabResultsLoading } = useCollection(labResultsQuery);
    
    const latestCycle = useMemo(() => cyclesData?.[0], [cyclesData]);
    const cycleDay = useMemo(() => {
        if (latestCycle?.startDate) {
          const start = (latestCycle.startDate as any).toDate();
          const day = differenceInDays(new Date(), start) + 1;
          return day > 0 ? day : 1;
        }
        return null;
    }, [latestCycle]);

    useEffect(() => {
        const fetchInsight = async () => {
            if (!userProfile) return;
            setIsLoading(true);
            try {
                const cycleContext = cycleDay ? `Currently on day ${cycleDay} of her cycle.` : "No current cycle data available.";
                const context = {
                    pcosJourneyProgress: userProfile?.pcosJourneyProgress || 1,
                    recentSymptoms: JSON.stringify(recentSymptoms || []),
                    cycleData: cycleContext,
                    nutritionData: JSON.stringify(recentMeals || []),
                    fitnessData: JSON.stringify(recentWorkouts || []),
                    labResultData: JSON.stringify(recentLabResults || []),
                    userQuery: "Based on all my recent data (symptoms, cycle, food, workouts, labs), what is one deep insight or pattern you notice? Give me a weekly summary.",
                };
                const result = await generateCoachingTip(context);
                setAiInsight(result.coachingTip);
            } catch (error) {
                setAiInsight("Could not load insights at this time. Please check back later.");
                toast({
                    variant: 'destructive',
                    title: 'AI Error',
                    description: 'Failed to generate weekly insight.'
                })
            } finally {
                setIsLoading(false);
            }
        };

        if(!isProfileLoading && !areSymptomsLoading && !areCyclesLoading && !areMealsLoading && !areWorkoutsLoading && !areLabResultsLoading) {
            fetchInsight();
        }
    }, [userProfile, recentSymptoms, cycleDay, recentMeals, recentWorkouts, recentLabResults, isProfileLoading, areSymptomsLoading, areCyclesLoading, areMealsLoading, areWorkoutsLoading, areLabResultsLoading, toast]);


    return (
        <Card className="glass-card lg:col-span-3">
            <CardHeader>
                <CardTitle>This Week's AI Insight</CardTitle>
                <CardDescription>A personalized summary based on your recent activity.</CardDescription>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <div className="flex items-center gap-2 text-muted-foreground">
                        <Loader2 className="animate-spin size-4" />
                        <span>Generating your weekly insight...</span>
                    </div>
                ) : (
                    <p className="font-accent text-lg italic text-muted-foreground">
                        "{aiInsight}"
                    </p>
                )}
            </CardContent>
        </Card>
    );
};

const ComparativeAnalytics = () => {
    const { user } = useUser();
    const firestore = useFirestore();
    const cyclesQuery = useMemoFirebase(() => {
        if (!user || !firestore) return null;
        return query(collection(firestore, 'users', user.uid, 'cycles'), orderBy('startDate', 'desc'), limit(6));
    }, [user, firestore]);
    const { data: cycles, isLoading } = useCollection(cyclesQuery);

    const avgCycleLength = useMemo(() => {
        if (!cycles || cycles.length < 2) return 0;
        const completedCycles = cycles.slice(1).filter(c => c.length && typeof c.length === 'number');
        if (completedCycles.length === 0) return 0;
        return Math.round(completedCycles.reduce((sum, c) => sum + c.length, 0) / completedCycles.length);
    }, [cycles]);

    const chartData = useMemo(() => [
        { name: 'Your Average', days: avgCycleLength },
        { name: 'PCOS Benchmark', days: 35 },
    ], [avgCycleLength]);
    
    const chartConfig = {
        days: {
          label: "Days",
        },
         "Your Average": {
          label: "Your Average",
          color: "hsl(var(--primary))",
        },
        "PCOS Benchmark": {
            label: "PCOS Benchmark",
            color: "hsl(var(--muted))",
        }
    }

    return (
        <Card className="glass-card">
            <CardHeader>
                <CardTitle>Comparative Analytics</CardTitle>
                <CardDescription>See how your average cycle length compares.</CardDescription>
            </CardHeader>
            <CardContent>
                {isLoading ? <Skeleton className="h-64" /> : avgCycleLength > 0 ? (
                     <ChartContainer config={chartConfig} className="h-64 w-full">
                        <BarChart data={chartData} layout="vertical" margin={{left: 10}}>
                            <CartesianGrid horizontal={false} />
                            <YAxis dataKey="name" type="category" tickLine={false} axisLine={false} />
                            <XAxis type="number" hide />
                            <Tooltip cursor={{fill: 'hsl(var(--muted) / 0.5)'}} content={<ChartTooltipContent />} />
                            <Legend />
                            <Bar dataKey="days" layout="vertical" radius={5} >
                                 {chartData.map((entry, index) => (
                                    <Bar key={`cell-${index}`} fill={entry.name === 'Your Average' ? 'hsl(var(--primary))' : 'hsl(var(--muted))'} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ChartContainer>
                ) : (
                    <div className="h-64 flex items-center justify-center text-muted-foreground text-center">
                        <p>Log at least two full cycles to see comparative analytics.</p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

export default function InsightsPage() {
    const { toast } = useToast();
    return (
        <div className="p-4 md:p-8 space-y-6">
            <header className="flex justify-between items-center">
                <h1 className="text-3xl font-headline font-bold text-gradient flex items-center gap-3">
                    <TrendingUp className="size-8" />
                    Insights & Analytics
                </h1>
                <Button onClick={() => toast({ title: 'Export Requested', description: 'Your data export is being generated and will be emailed to you.' })}>
                    <FileText className="mr-2" />
                    Export Full Report
                </Button>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
               <PcosSubtypeIdentifier />
               <CyclePredictionEngine />
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <HealthScoreDashboard />
                <ComparativeAnalytics />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <SymptomCorrelationMatrix />
            </div>

             <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-4">
                <AIGeneratedInsights />
            </div>

        </div>
    );
}
