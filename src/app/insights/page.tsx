
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, FileText, BrainCircuit, Target, CalendarHeart, CalendarClock, LineChart, Loader2, Sparkles, HelpCircle, BookUser, Pill, Radar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUser, useFirestore, useCollection, useMemoFirebase, addDocumentNonBlocking } from "@/firebase";
import { collection, query, orderBy, where, Timestamp, limit } from 'firebase/firestore';
import { useUserProfile } from "@/hooks/use-user-profile";
import { useMemo, useState, useEffect, useCallback } from "react";
import { addDays, differenceInDays, format, isFuture, subDays, parseISO } from 'date-fns';
import { generateCoachingTip } from "@/ai/flows/ai-generated-coaching";
import { identifyPcosSubtype, PcosSubtypeOutput } from "@/ai/flows/ai-pcos-subtype-identifier";
import { predictCycleEvents, CyclePredictorOutput } from "@/ai/flows/ai-cycle-predictor";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis, ZAxis, Area, AreaChart, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar as RechartsRadar } from 'recharts';
import { ChartContainer, ChartTooltipContent } from "@/components/ui/chart";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { m, AnimatePresence } from "framer-motion";
import { useUserHealthData } from "@/hooks/use-user-health-data";
import { Progress } from "@/components/ui/progress";

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

const PredictionCard = ({ icon: Icon, title, date, endDate, daysAway, color }: { icon: React.ElementType, title: string, date: Date | null, endDate?: Date | null, daysAway: number, color: string }) => {
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

    const dateText = endDate ? `${format(date, 'MMM do')} - ${format(endDate, 'do')}` : format(date, 'MMMM do');

    return (
        <div className="flex items-center gap-4 p-3 rounded-lg bg-muted/50">
            <div className={cn("p-3 rounded-full", color)}>
                 <Icon className="size-6" />
            </div>
            <div>
                <h4 className="font-bold">{title}</h4>
                <p className="text-sm text-muted-foreground">{dateText} • <span className="font-semibold">{daysAway} days away</span></p>
            </div>
        </div>
    )
}

const CyclePredictionEngine = () => {
    const { cycles, areCyclesLoading, recentSymptoms, recentMeals } = useUserHealthData();
    const [isPredicting, setIsPredicting] = useState(false);
    const [prediction, setPrediction] = useState<CyclePredictorOutput | null>(null);
    const { toast } = useToast();
    const { user } = useUser();
    const firestore = useFirestore();

    const handlePredict = useCallback(async () => {
        if (!cycles || cycles.length < 2) {
            toast({
                variant: 'destructive',
                title: 'Not Enough Data',
                description: 'Please log at least two full cycles to generate an AI forecast.',
            });
            return;
        }
        if (!user || !firestore) return;
        
        setIsPredicting(true);
        try {
            const result = await predictCycleEvents({
                historicalCycleData: JSON.stringify(cycles),
                recentSymptomData: JSON.stringify(recentSymptoms || []),
                recentMoodData: JSON.stringify([]), // Placeholder for mood data
                recentNutritionData: JSON.stringify(recentMeals || []),
            });
            setPrediction(result);

            const predictionLogRef = collection(firestore, 'users', user.uid, 'cyclePredictions');
            addDocumentNonBlocking(predictionLogRef, {
                userId: user.uid,
                predictionDate: new Date(),
                confidenceScore: result.confidenceScore,
                reasoning: result.reasoning,
                predictedPeriodStartDate: result.nextPeriodStartDate,
            });

        } catch (error) {
            toast({
                variant: 'destructive',
                title: 'Prediction Failed',
                description: 'The AI could not generate a forecast at this time.',
            });
        } finally {
            setIsPredicting(false);
        }
    }, [cycles, recentSymptoms, recentMeals, toast, user, firestore]);

    const now = new Date();

    return (
        <Card className="glass-card">
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><BrainCircuit className="text-secondary"/> Cycle Prediction Engine</CardTitle>
                <CardDescription>AI-powered cycle forecasting.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                 <Button onClick={handlePredict} disabled={isPredicting || areCyclesLoading}>
                    {isPredicting ? <Loader2 className="animate-spin" /> : <Sparkles />}
                    {prediction ? 'Regenerate AI Forecast' : 'Generate AI Forecast'}
                 </Button>

                 {prediction ? (
                     <m.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-4 pt-4"
                    >
                         <PredictionCard icon={CalendarClock} title="Next Period" date={parseISO(prediction.nextPeriodStartDate)} endDate={parseISO(prediction.nextPeriodEndDate)} daysAway={differenceInDays(parseISO(prediction.nextPeriodStartDate), now)} color="bg-cycle-menstrual/20 text-cycle-menstrual" />
                         <PredictionCard icon={CalendarHeart} title="Fertile Window" date={parseISO(prediction.fertileWindowStartDate)} daysAway={differenceInDays(parseISO(prediction.fertileWindowStartDate), now)} color="bg-cycle-follicular/20 text-cycle-follicular" />
                         <PredictionCard icon={Target} title="Ovulation Day" date={parseISO(prediction.ovulationDate)} daysAway={differenceInDays(parseISO(prediction.ovulationDate), now)} color="bg-cycle-ovulation/20 text-cycle-ovulation" />
                        <div className="p-3 bg-black/20 rounded-lg space-y-2">
                            <div className="flex justify-between items-center">
                                <p className="text-sm font-bold uppercase text-primary">AI Reasoning</p>
                                <Badge variant="outline">Confidence: {prediction.confidenceScore}%</Badge>
                            </div>
                            <p className="text-xs text-muted-foreground">{prediction.reasoning}</p>
                        </div>
                     </m.div>
                 ) : (
                     <div className="h-40 flex items-center justify-center text-center text-muted-foreground">
                        <p>Click the button to get a sophisticated forecast based on your cycle and symptom history.</p>
                    </div>
                 )}

            </CardContent>
        </Card>
    );
};

const SymptomCorrelationMatrix = () => {
    const { recentSymptoms: symptoms, areSymptomsLoading, cycles, areCyclesLoading } = useUserHealthData(365, true);

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
                {(areSymptomsLoading || areCyclesLoading) ? <Skeleton className="h-80 w-full" /> : chartData.length > 0 ? (
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

const PcosPhenotypeMap = ({ scores }: { scores: PcosSubtypeOutput['phenotypeScores'] | null }) => {
    const chartData = useMemo(() => {
        if (!scores) return [];
        return [
            { subject: 'Insulin Resistance', score: scores.insulinResistance, fullMark: 100 },
            { subject: 'Inflammation', score: scores.inflammation, fullMark: 100 },
            { subject: 'Adrenal', score: scores.adrenal, fullMark: 100 },
            { subject: 'Hormonal', score: scores.hormonalImbalance, fullMark: 100 },
        ];
    }, [scores]);

    const chartConfig = {
        score: { label: 'Score', color: 'hsl(var(--primary))' },
    };

    return (
         <Card className="glass-card">
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><Radar /> Phenotype Map</CardTitle>
                <CardDescription>A visual snapshot of your PCOS drivers.</CardDescription>
            </CardHeader>
            <CardContent>
                 {scores ? (
                     <ChartContainer config={chartConfig} className="mx-auto w-full aspect-square h-80">
                         <RadarChart data={chartData}>
                             <defs>
                                 <radialGradient id="radarFill">
                                     <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.5} />
                                     <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.1} />
                                 </radialGradient>
                             </defs>
                             <CartesianGrid gridType="circle" />
                             <PolarGrid />
                             <PolarAngleAxis dataKey="subject" />
                             <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                             <Tooltip content={<ChartTooltipContent />} />
                             <RechartsRadar name="Phenotype" dataKey="score" stroke="hsl(var(--primary))" fill="url(#radarFill)" fillOpacity={0.6} />
                         </RadarChart>
                     </ChartContainer>
                 ) : (
                     <div className="h-80 flex items-center justify-center text-muted-foreground">
                         <p>Analyze your data to generate the map.</p>
                     </div>
                 )}
            </CardContent>
        </Card>
    )
}

const PcosSubtypeIdentifier = () => {
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState<PcosSubtypeOutput | null>(null);
    const CONFIDENCE_THRESHOLD = 50;

    const { user } = useUser();
    const firestore = useFirestore();

    const {
        recentSymptoms: symptoms,
        areSymptomsLoading,
        cycles,
        areCyclesLoading,
        recentLabResults: labResults,
        areLabResultsLoading
    } = useUserHealthData(50);


    const handleIdentifySubtype = async () => {
        if ((!symptoms || symptoms.length === 0) && (!cycles || cycles.length === 0)) {
            toast({ variant: "destructive", title: "Not Enough Data", description: "Please log some symptoms and cycles to use this feature." });
            return;
        }
        if (!user || !firestore) return;

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

            const analysisLogRef = collection(firestore, 'users', user.uid, 'subtypeAnalyses');
            await addDocumentNonBlocking(analysisLogRef, {
                userId: user.uid,
                analysisDate: new Date(),
                confidenceScore: analysisResult.confidenceScore,
                phenotypeScores: analysisResult.phenotypeScores
            });

        } catch (error) {
            toast({ variant: "destructive", title: "AI Error", description: "Could not identify subtype. Please try again." });
        } finally {
            setIsLoading(false);
        }
    }
    
    const canAnalyze = (symptoms && symptoms.length > 0) || (cycles && cycles.length > 0);
    const topSubtype = useMemo(() => {
        if (!result || !result.phenotypeScores) return null;
        // Find the key with the highest score
        const scores = result.phenotypeScores;
        const top = Object.entries(scores).reduce((a, b) => a[1] > b[1] ? a : b);
        return {
            name: top[0].charAt(0).toUpperCase() + top[0].slice(1),
            score: top[1]
        }
    }, [result]);

    return (
         <Card className="glass-card lg:col-span-2">
             <CardHeader>
                <CardTitle className="flex items-center gap-2 text-gradient"><Sparkles /> PCOS Subtype Discovery</CardTitle>
                <CardDescription>Understand your potential PCOS drivers based on your logged data. This is not a medical diagnosis.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <Button onClick={handleIdentifySubtype} disabled={isLoading || areSymptomsLoading || areCyclesLoading || areLabResultsLoading || !canAnalyze}>
                    {isLoading ? <Loader2 className="animate-spin" /> : "Analyze My Data"}
                </Button>
                
                <AnimatePresence>
                {result && (
                    <m.div initial={{opacity: 0, y: 10}} animate={{opacity: 1, y: 0}} className="space-y-6 pt-4">
                        {result.confidenceScore < CONFIDENCE_THRESHOLD ? (
                             <div className="flex items-center gap-4 p-4 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-500">
                                <HelpCircle />
                                <div>
                                    <h4 className="font-bold">Low Confidence Analysis</h4>
                                    <p className="text-sm">The AI has low confidence ({result.confidenceScore}%) in this analysis due to limited data. Log more symptoms, cycles, and lab results for a more accurate assessment.</p>
                                </div>
                            </div>
                        ) : topSubtype ? (
                            <>
                                <div className="space-y-4">
                                    <div>
                                        <div className="flex justify-between items-baseline">
                                            <p className="text-sm font-bold uppercase text-primary">Primary Driver</p>
                                            <Badge variant="outline">Confidence: {result.confidenceScore}%</Badge>
                                        </div>
                                        <h3 className="text-2xl font-bold font-headline">{topSubtype.name.replace(/([A-Z])/g, ' $1').trim()}</h3>
                                    </div>
                                </div>
                                <PcosPhenotypeMap scores={result.phenotypeScores} />

                                <div>
                                    <p className="text-sm font-bold uppercase text-secondary flex items-center gap-2"><BookUser /> What This Means</p>
                                    <p className="text-muted-foreground mt-1">{result.explanation}</p>
                                </div>
                                <div>
                                    <p className="text-sm font-bold uppercase text-chart-4 flex items-center gap-2"><Pill /> Educational Supplement Ideas</p>
                                     <div className="mt-2 space-y-2">
                                        {result.supplementSuggestions.map((sup, i) => (
                                            <div key={i} className="p-3 rounded-md bg-black/20">
                                                <p className="font-semibold">{sup.name}</p>
                                                <p className="text-xs text-muted-foreground">{sup.reason}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                                <p className="font-bold">Disclaimer</p>
                                <p>{result.disclaimer}</p>
                                </div>
                            </>
                        ) : null}
                    </m.div>
                )}
                </AnimatePresence>
            </CardContent>
        </Card>
    );
};


const AIGeneratedInsights = () => {
    const { userProfile, isLoading: isProfileLoading } = useUserProfile();
    const [aiInsight, setAiInsight] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const { toast } = useToast();
    const { user } = useUser();

    const {
        cycleDay,
        areSymptomsLoading,
        areMealsLoading,
        areFitnessActivitiesLoading,
        areLabResultsLoading,
        areCyclesLoading
    } = useUserHealthData();
    

    useEffect(() => {
        const fetchInsight = async () => {
            if (!userProfile || !user) return;
            setIsLoading(true);
            try {
                const context = {
                    userId: user.uid,
                    userQuery: "Based on all my recent data (symptoms, cycle, food, workouts, labs), what is one deep insight or pattern you notice? Give me a weekly summary.",
                    userProfile: {
                        wellnessGoal: userProfile.wellnessGoal || 'General Health',
                        pcosJourneyProgress: userProfile.pcosJourneyProgress || 1,
                    },
                    conversationHistory: userProfile.conversationHistory || [],
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

        if(!isProfileLoading && !areSymptomsLoading && !areCyclesLoading && !areMealsLoading && !areFitnessActivitiesLoading && !areLabResultsLoading) {
            fetchInsight();
        }
    }, [userProfile, isProfileLoading, areSymptomsLoading, areCyclesLoading, areMealsLoading, areFitnessActivitiesLoading, areLabResultsLoading, toast, user]);


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
    const { cycles, areCyclesLoading } = useUserHealthData();

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
                {areCyclesLoading ? <Skeleton className="h-64" /> : avgCycleLength > 0 ? (
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

const SubtypeEvolutionTracker = () => {
    const { user } = useUser();
    const firestore = useFirestore();

    const analysesQuery = useMemoFirebase(() => {
        if (!user || !firestore) return null;
        return query(collection(firestore, 'users', user.uid, 'subtypeAnalyses'), orderBy('analysisDate', 'asc'), limit(12));
    }, [user, firestore]);
    const { data: analyses, isLoading } = useCollection(analysesQuery);

    const chartData = useMemo(() => {
        if (!analyses) return [];
        return analyses.map(analysis => {
            if (!analysis.phenotypeScores) return { date: format((analysis.analysisDate as any).toDate(), 'MMM d'), value: 0 };
            const topScore = Math.max(...Object.values(analysis.phenotypeScores));
            return {
                date: format((analysis.analysisDate as any).toDate(), 'MMM d'),
                value: topScore,
            }
        });
    }, [analyses]);

    const chartConfig = {
        value: {
          label: "Primary Driver Score",
          color: "hsl(var(--chart-2))",
        },
    }

    return (
        <Card className="glass-card lg:col-span-2">
            <CardHeader>
                <CardTitle>Subtype Evolution</CardTitle>
                <CardDescription>How your primary PCOS driver score has changed over time.</CardDescription>
            </CardHeader>
            <CardContent>
                {isLoading ? <Skeleton className="h-64" /> : (analyses && analyses.length > 1) ? (
                    <ChartContainer config={chartConfig} className="h-64 w-full">
                        <AreaChart data={chartData} margin={{ top: 5, right: 20, left: -10, bottom: 0 }}>
                            <defs>
                                <linearGradient id="fillEvolution" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.8}/>
                                    <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0.1}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid vertical={false} strokeDasharray="3 3" />
                            <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} />
                            <YAxis domain={[0, 100]} unit="%" tickLine={false} axisLine={false} tickMargin={8} />
                            <Tooltip content={<ChartTooltipContent indicator="dot" />} />
                            <Area type="monotone" dataKey="value" stroke="hsl(var(--chart-2))" strokeWidth={2} fillOpacity={1} fill="url(#fillEvolution)" />
                        </AreaChart>
                    </ChartContainer>
                ) : (
                    <div className="h-64 flex items-center justify-center text-muted-foreground text-center">
                        <p>Perform at least two subtype analyses to see your evolution over time.</p>
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
                <SubtypeEvolutionTracker />
                <ComparativeAnalytics />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <SymptomCorrelationMatrix />
                 <HealthScoreDashboard />
            </div>

             <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-4">
                <AIGeneratedInsights />
            </div>

        </div>
    );
}
