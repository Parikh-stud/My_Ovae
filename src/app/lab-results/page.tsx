
'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { NotebookText, AlertTriangle, CalendarIcon, Plus, Trash2, Loader2, Save, BrainCircuit, Sparkles, LineChart, Target } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUser, useFirestore, addDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { analyzeLabResults, LabResultAnalysisOutput } from '@/ai/flows/ai-lab-result-analyzer';
import { Separator } from '@/components/ui/separator';
import { Area, AreaChart, CartesianGrid, Tooltip, XAxis, YAxis } from 'recharts';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { useUserHealthData } from '@/hooks/use-user-health-data';

const resultMarkerSchema = z.object({
  id: z.string(),
  marker: z.string().min(1, "Marker name is required."),
  value: z.string().min(1, "Value is required."),
  unit: z.string().min(1, "Unit is required."),
  normalRange: z.string().optional(),
});

const labResultSchema = z.object({
  testType: z.string().min(1, "Test type is required."),
  testDate: z.date({ required_error: "A test date is required."}),
  provider: z.string().optional(),
  results: z.array(resultMarkerSchema).min(1, "At least one result marker is required."),
});

type LabResultFormValues = z.infer<typeof labResultSchema>;

const AIAnalysisSection = ({ onAnalyze, analysisResult, isLoading }: { onAnalyze: () => void, analysisResult: LabResultAnalysisOutput | null, isLoading: boolean }) => {
    return (
        <Card className="glass-card lg:col-span-3">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-gradient"><Sparkles /> AI-Powered Analysis</CardTitle>
                <CardDescription>Get a comprehensive analysis of your latest lab results in the context of your entire history.</CardDescription>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <div className="flex items-center gap-3 text-muted-foreground">
                        <Loader2 className="animate-spin" />
                        <span>Generating your comprehensive analysis... This may take a moment.</span>
                    </div>
                ) : analysisResult ? (
                    <div className="space-y-6">
                         {analysisResult.predictiveAlert && (
                            <Alert variant="default" className="border-amber-500/50 bg-amber-500/10 text-amber-500">
                                <AlertTriangle className="h-4 w-4 !text-amber-500" />
                                <AlertTitle className="font-bold">Predictive Alert</AlertTitle>
                                <AlertDescription className="text-amber-400/80">
                                    {analysisResult.predictiveAlert}
                                </AlertDescription>
                            </Alert>
                        )}
                        <div>
                            <p className="text-sm font-bold uppercase text-primary">Key Takeaways</p>
                            <ul className="list-disc pl-5 mt-2 text-muted-foreground">
                                {analysisResult.keyTakeaways.map((item, i) => <li key={i}>{item}</li>)}
                            </ul>
                        </div>
                        <Separator />
                        <div>
                            <p className="text-sm font-bold uppercase text-secondary">Trend Analysis</p>
                            <p className="mt-2 text-muted-foreground">{analysisResult.trendAnalysis}</p>
                        </div>
                         {analysisResult.personalizedGoals && analysisResult.personalizedGoals.length > 0 && (
                            <>
                                <Separator />
                                <div>
                                    <p className="text-sm font-bold uppercase text-chart-4 flex items-center gap-2"><Target /> Goals for Your Next Check-in</p>
                                    <div className="mt-2 space-y-2">
                                        {analysisResult.personalizedGoals.map((goal, i) => (
                                            <div key={i} className="p-3 bg-black/20 rounded-lg text-sm text-muted-foreground">
                                               {goal}
                                            </div>
                                        ))}
                                        <p className="text-xs text-muted-foreground/80">These are educational suggestions to discuss with your healthcare provider.</p>
                                    </div>
                                </div>
                            </>
                        )}
                        <Separator />
                         <div>
                            <p className="text-sm font-bold uppercase text-chart-3">Marker Insights</p>
                            <div className="mt-2 space-y-3">
                             {analysisResult.markerAnalysis.map((item, i) => (
                                <div key={i} className="p-3 bg-black/20 rounded-lg">
                                    <p className="font-semibold">{item.marker}</p>
                                    <p className="text-sm text-muted-foreground">{item.insight}</p>
                                </div>
                             ))}
                             </div>
                        </div>
                         <Alert variant="destructive" className="mt-4">
                            <AlertTriangle className="h-4 w-4" />
                            <AlertTitle>Disclaimer</AlertTitle>
                            <AlertDescription>{analysisResult.disclaimer}</AlertDescription>
                        </Alert>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center text-center gap-4 h-40">
                         <p className="text-muted-foreground">Click the button to generate an AI-powered summary of your health trends.</p>
                         <Button onClick={onAnalyze}>
                            <BrainCircuit className="mr-2" /> Generate Full Analysis
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}

const LabResultForm = ({ onFormSubmit }: { onFormSubmit: () => void }) => {
  const form = useForm<LabResultFormValues>({
    resolver: zodResolver(labResultSchema),
    defaultValues: {
      testType: '',
      provider: '',
      results: [{ id: `marker-${Date.now()}`, marker: '', value: '', unit: '', normalRange: '' }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "results",
  });

  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onSubmit = async (data: LabResultFormValues) => {
    if (!user || !firestore) {
      toast({ variant: 'destructive', title: 'Error', description: 'User not authenticated.' });
      return;
    }
    setIsSubmitting(true);

    try {
        const collectionRef = collection(firestore, 'users', user.uid, 'labResults');
        await addDocumentNonBlocking(collectionRef, {
            ...data,
            userId: user.uid,
            testDate: data.testDate,
        });

        toast({ title: 'Success', description: 'Lab results saved successfully.' });
        form.reset({
            testType: '',
            provider: '',
            testDate: undefined,
            results: [{ id: `marker-${Date.now()}`, marker: '', value: '', unit: '', normalRange: '' }],
        });
        onFormSubmit();
    } catch (error) {
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to save lab results.' });
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleAppendMarker = useCallback(() => {
    append({ id: `marker-${Date.now()}`, marker: '', value: '', unit: '', normalRange: '' });
  }, [append]);

  const handleRemoveMarker = useCallback((index: number) => {
      remove(index);
  }, [remove]);

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle>Log New Lab Results</CardTitle>
        <CardDescription>Enter the details from your lab report.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="testType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Test Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                        <FormControl>
                            <SelectTrigger disabled={isSubmitting}>
                                <SelectValue placeholder="e.g., Hormone Panel, Blood Glucose" />
                            </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                            <SelectItem value="Hormone Panel">Hormone Panel</SelectItem>
                            <SelectItem value="Blood Glucose / Insulin">Blood Glucose / Insulin</SelectItem>
                            <SelectItem value="Thyroid Panel">Thyroid Panel</SelectItem>
                            <SelectItem value="Lipid Panel">Lipid Panel</SelectItem>
                            <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="testDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Test Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            disabled={isSubmitting}
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <div>
              <h3 className="text-lg font-medium mb-2">Result Markers</h3>
              <div className="space-y-4">
                {fields.map((field, index) => (
                    <div key={field.id} className="grid grid-cols-1 md:grid-cols-4 gap-2 p-4 border rounded-lg bg-black/20 relative">
                        <FormField
                            control={form.control}
                            name={`results.${index}.marker`}
                            render={({ field }) => (
                                <FormItem><FormLabel>Marker</FormLabel><FormControl><Input placeholder="e.g., Testosterone" {...field} disabled={isSubmitting} /></FormControl><FormMessage /></FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name={`results.${index}.value`}
                            render={({ field }) => (
                                <FormItem><FormLabel>Value</FormLabel><FormControl><Input placeholder="e.g., 45" {...field} disabled={isSubmitting} /></FormControl><FormMessage /></FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name={`results.${index}.unit`}
                            render={({ field }) => (
                                <FormItem><FormLabel>Unit</FormLabel><FormControl><Input placeholder="e.g., ng/dL" {...field} disabled={isSubmitting} /></FormControl><FormMessage /></FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name={`results.${index}.normalRange`}
                            render={({ field }) => (
                                <FormItem><FormLabel>Normal Range</FormLabel><FormControl><Input placeholder="e.g., 8 - 48" {...field} disabled={isSubmitting} /></FormControl></FormItem>
                            )}
                        />
                        {fields.length > 1 && (
                            <Button type="button" variant="ghost" size="icon" className="absolute -top-3 -right-3 text-muted-foreground hover:text-destructive" onClick={() => handleRemoveMarker(index)} disabled={isSubmitting}>
                                <Trash2 className="size-4" />
                            </Button>
                        )}
                    </div>
                ))}
                 <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAppendMarker}
                  disabled={isSubmitting}
                >
                  <Plus className="mr-2"/> Add Marker
                </Button>
              </div>
            </div>
            
            <Button type="submit" disabled={isSubmitting} className="w-full">
                {isSubmitting ? <Loader2 className="animate-spin" /> : <Save />} Save Lab Result
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};

const PastLabResults = ({ labResults, isLoading, onDelete }: { labResults: any[], isLoading: boolean, onDelete: (id: string) => Promise<void> }) => {
    if (isLoading) {
        return <div className="space-y-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
        </div>
    }
    
    if (labResults.length === 0) {
        return (
            <Card className="glass-card">
                <CardHeader>
                    <CardTitle>No Past Results</CardTitle>
                    <CardDescription>Your saved lab results will appear here.</CardDescription>
                </CardHeader>
                 <CardContent>
                    <div className="h-40 flex items-center justify-center text-muted-foreground">
                        <p>Log your first lab result to get started.</p>
                    </div>
                </CardContent>
            </Card>
        )
    }
    
    return (
        <Card className="glass-card">
            <CardHeader>
                <CardTitle>Your Lab History</CardTitle>
                <CardDescription>A record of all your past lab results.</CardDescription>
            </CardHeader>
            <CardContent>
                <Accordion type="single" collapsible className="w-full">
                    {labResults.map(result => (
                        <AccordionItem value={result.id} key={result.id}>
                            <AccordionTrigger>
                                <div className="flex justify-between items-center w-full pr-4">
                                    <span className="font-bold">{result.testType}</span>
                                    <div className="flex items-center gap-4">
                                        <span className="text-muted-foreground text-sm">{format((result.testDate as any).toDate(), 'PPP')}</span>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="text-muted-foreground hover:text-destructive size-8"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onDelete(result.id);
                                            }}
                                        >
                                            <Trash2 className="size-4" />
                                        </Button>
                                    </div>
                                </div>
                            </AccordionTrigger>
                            <AccordionContent className="space-y-4">
                                <ul className="space-y-2">
                                    {result.results.map((marker: any, index: number) => (
                                        <li key={index} className="flex justify-between p-2 rounded bg-muted/50">
                                            <span className="font-medium">{marker.marker}:</span>
                                            <span className="text-right">{marker.value} {marker.unit} <em className="text-xs text-muted-foreground">({marker.normalRange || 'N/A'})</em></span>
                                        </li>
                                    ))}
                                </ul>
                                {result.provider && <p className="text-xs text-muted-foreground">Provider: {result.provider}</p>}
                            </AccordionContent>
                        </AccordionItem>
                    ))}
                </Accordion>
            </CardContent>
        </Card>
    );
};

const LabResultTrendChart = ({ labResults }: { labResults: any[] }) => {
    const [selectedMarker, setSelectedMarker] = useState<string>('');

    const { markers, chartData } = useMemo(() => {
        const allMarkers = new Set<string>();
        const data: any[] = [];

        labResults.forEach(result => {
            const date = (result.testDate as any).toDate();
            let entry: any = { date: format(date, 'MMM d') };
            let hasData = false;
            
            result.results.forEach((marker: any) => {
                allMarkers.add(marker.marker);
                const value = parseFloat(marker.value);
                if (!isNaN(value)) {
                    entry[marker.marker] = value;
                    hasData = true;
                }
            });
            if (hasData) {
                data.push(entry);
            }
        });
        
        return { markers: Array.from(allMarkers), chartData: data.reverse() };

    }, [labResults]);

    useEffect(() => {
        if (!selectedMarker && markers.length > 0) {
            setSelectedMarker(markers[0]);
        }
    }, [markers, selectedMarker]);
    
    if (labResults.length < 2) {
        return null;
    }
    
    const chartConfig = {
      value: { label: selectedMarker, color: "hsl(var(--primary))" },
    };

    return (
        <Card className="glass-card lg:col-span-3">
            <CardHeader>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <CardTitle className="flex items-center gap-2"><LineChart className="text-primary"/> Lab Marker Trends</CardTitle>
                        <CardDescription>Track a specific lab marker over time.</CardDescription>
                    </div>
                    {markers.length > 0 && (
                        <Select value={selectedMarker} onValueChange={setSelectedMarker}>
                            <SelectTrigger className="w-[200px]"><SelectValue placeholder="Select a marker..." /></SelectTrigger>
                            <SelectContent>
                                {markers.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    )}
                </div>
            </CardHeader>
            <CardContent>
                {selectedMarker && chartData.filter(d => d[selectedMarker] !== undefined).length > 1 ? (
                     <ChartContainer config={chartConfig} className="h-64 w-full">
                        <AreaChart data={chartData} margin={{ top: 5, right: 20, left: -10, bottom: 0 }}>
                             <defs>
                                <linearGradient id="fillValue" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8}/>
                                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.1}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid vertical={false} strokeDasharray="3 3" />
                            <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} />
                            <YAxis domain={['dataMin - 10', 'dataMax + 10']} tickLine={false} axisLine={false} tickMargin={8} />
                            <Tooltip content={<ChartTooltipContent indicator="dot" />} />
                            <Area type="monotone" dataKey={selectedMarker} name={selectedMarker} stroke="hsl(var(--primary))" strokeWidth={2} fillOpacity={1} fill="url(#fillValue)" />
                        </AreaChart>
                    </ChartContainer>
                ) : (
                    <div className="h-64 flex items-center justify-center text-muted-foreground text-center">
                        <p>
                            {markers.length === 0 ? "No numerical data to plot." : `Not enough data points for "${selectedMarker}" to draw a trend line.`}
                        </p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};


export default function LabResultsPage() {
    const { toast } = useToast();
    const { user } = useUser();
    const firestore = useFirestore();
    const [formKey, setFormKey] = useState(0);
    const [analysisResult, setAnalysisResult] = useState<LabResultAnalysisOutput | null>(null);
    const [isAnalysisLoading, setIsAnalysisLoading] = useState(false);

    const { labResults, areLabResultsLoading, symptoms, cycles } = useUserHealthData();

    const handleFormSubmit = useCallback(() => {
        setFormKey(prev => prev + 1)
    }, []);

    const handleDeleteResult = useCallback(async (resultId: string) => {
        if (!user || !firestore) return;
        const docRef = doc(firestore, 'users', user.uid, 'labResults', resultId);
        try {
            await deleteDocumentNonBlocking(docRef);
            toast({
                title: 'Result Deleted',
                description: 'The lab result has been removed.',
            });
        } catch(error) {
            toast({
                variant: 'destructive',
                title: 'Error',
                description: 'Could not remove lab result. Please try again.'
            });
        }
    }, [user, firestore, toast]);

    const handleAnalyzeResults = useCallback(async () => {
        if (!labResults || labResults.length === 0) {
            toast({ variant: 'destructive', title: 'No Data', description: 'Please log at least one lab result to get an analysis.'});
            return;
        }

        setIsAnalysisLoading(true);
        setAnalysisResult(null);
        const symptomSummary = JSON.stringify([...new Set(symptoms?.map(s => s.symptomType) || [])]);
        let cycleSummary = "No cycle data logged.";
        if (cycles && cycles.length > 1) {
            const completedCycles = cycles.slice(1).filter(c => c.length && typeof c.length === 'number');
            if (completedCycles.length > 0) {
                const avgLength = Math.round(completedCycles.reduce((sum, c) => sum + c.length, 0) / completedCycles.length);
                cycleSummary = `Cycles average around ${avgLength} days.`;
            }
        }

        const historicalResults = labResults.map(res => ({
            ...res,
            testDate: format((res.testDate as any).toDate(), 'yyyy-MM-dd')
        }));
        
        try {
            const analysis = await analyzeLabResults({
                labResults: historicalResults,
                symptomSummary,
                cycleSummary,
            });
            setAnalysisResult(analysis);
        } catch (error) {
            toast({ variant: 'destructive', title: 'Analysis Failed', description: 'Could not get AI insights for this lab result.' });
        } finally {
            setIsAnalysisLoading(false);
        }
    }, [symptoms, cycles, labResults, toast]);

    return (
        <div className="p-4 md:p-8 space-y-6">
            <header className="flex justify-between items-center">
                <h1 className="text-3xl font-headline font-bold text-gradient flex items-center gap-3">
                    <NotebookText className="size-8" />
                    Lab Results
                </h1>
            </header>
            
            <Alert variant="destructive" className="glass-card">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>For Educational Purposes Only</AlertTitle>
                <AlertDescription>
                    This feature is for tracking and educational purposes only. It is not a substitute for professional medical advice, diagnosis, or treatment. Always consult with a qualified healthcare provider for any health concerns or before making any decisions related to your health or treatment.
                </AlertDescription>
            </Alert>
            
            <AIAnalysisSection onAnalyze={handleAnalyzeResults} analysisResult={analysisResult} isLoading={isAnalysisLoading} />

            {areLabResultsLoading ? <Skeleton className="h-64 w-full" /> : <LabResultTrendChart labResults={labResults || []} />}
            
             <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                 <LabResultForm key={formKey} onFormSubmit={handleFormSubmit} />
                 <PastLabResults 
                    labResults={labResults || []} 
                    isLoading={areLabResultsLoading} 
                    onDelete={handleDeleteResult}
                 />
             </div>
        </div>
    )
}
