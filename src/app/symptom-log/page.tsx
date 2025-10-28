
'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar as CalendarIcon, Lightbulb, Loader2, Star, Trash2, Mic, Sparkles } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { format, startOfDay, endOfDay } from "date-fns";
import { useFirestore, useUser, useCollection, useMemoFirebase, addDocumentNonBlocking, deleteDocumentNonBlocking } from "@/firebase";
import { collection, query, where, Timestamp, doc, orderBy, limit } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { AnimatePresence, m } from "framer-motion";
import { Textarea } from "@/components/ui/textarea";
import { suggestSymptomsFromText, AISuggestSymptomsOutput } from "@/ai/flows/ai-suggested-symptoms";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";


const SymptomConstellation = ({ symptoms }: { symptoms: any[] }) => {
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        setIsClient(true);
    }, []);

    const symptomPositions = useMemo(() => {
        if (!isClient || symptoms.length === 0) return [];
        return symptoms.map((symptom, index) => {
            const angle = (index / symptoms.length) * 2 * Math.PI + (symptom.severity * 0.1);
            const radius = 50 + Math.random() * 100;
            return {
                ...symptom,
                x: Math.cos(angle) * radius,
                y: Math.sin(angle) * radius,
            };
        });
    }, [symptoms, isClient]);

    return (
        <Card className="glass-card h-[600px] w-full flex items-center justify-center overflow-hidden">
            <CardContent className="w-full h-full p-0">
                <div className="relative w-full h-full flex items-center justify-center">
                    <div className="absolute inset-0 bg-grid-slate-700/[0.05] bg-[bottom_1px_center] dark:bg-grid-slate-400/[0.05]" style={{ maskImage: 'linear-gradient(to bottom, transparent, black, black, transparent)'}}></div>
                    <AnimatePresence>
                        {symptoms.length > 0 ? (
                            symptomPositions.map((symptom, i) => (
                                <m.div
                                    key={symptom.id}
                                    initial={{ opacity: 0, scale: 0 }}
                                    animate={{ 
                                        opacity: [0.5, 1, 0.5],
                                        scale: 1, 
                                        translateX: symptom.x, 
                                        translateY: symptom.y 
                                    }}
                                    exit={{ opacity: 0, scale: 0 }}
                                    transition={{ 
                                        duration: 2, 
                                        delay: i * 0.1,
                                        repeat: Infinity,
                                        repeatType: 'mirror',
                                        ease: 'easeInOut'
                                    }}
                                    className="absolute group cursor-pointer"
                                >
                                    <Star 
                                        className="text-primary transition-all duration-300" 
                                        fill="currentColor" 
                                        size={(symptom.severity || 1) * 8}
                                        style={{ filter: `brightness(${(symptom.severity / 5) * 1.5})`}}
                                    />
                                    <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 p-2 bg-popover text-popover-foreground rounded-md text-xs shadow-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                                        {symptom.symptomType} (Severity: {symptom.severity})
                                    </div>
                                </m.div>
                            ))
                        ) : (
                             <div className="text-center text-muted-foreground">
                                <h3 className="text-2xl font-headline text-gradient">Symptom Constellation™</h3>
                                <p>Log a symptom to see your universe.</p>
                            </div>
                        )}
                    </AnimatePresence>
                </div>
            </CardContent>
        </Card>
    );
};

const SymptomTimeline = ({ symptoms, isLoading, onDelete }: { symptoms: any[], isLoading: boolean, onDelete: (id: string) => void }) => (
    <Card className="glass-card">
        <CardHeader>
            <CardTitle>Today's Timeline</CardTitle>
        </CardHeader>
        <CardContent>
            <AnimatePresence>
            {isLoading ? (
                <div className="space-y-2">
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-16 w-full" />
                </div>
            ) : symptoms && symptoms.length > 0 ? (
                 <div className="space-y-4">
                    {symptoms.map((symptom) => (
                        <m.div 
                            key={symptom.id}
                            layout
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, x: -50, transition: { duration: 0.2 } }}
                            className="flex items-center gap-4 bg-black/20 p-3 rounded-lg"
                        >
                            <div className="text-lg">{symptom.symptomType === 'Cramps' ? '💢' : symptom.symptomType === 'Mood Swings' ? '🎭' : symptom.symptomType === 'Fatigue' ? '😴' : symptom.symptomType === 'Acne' ? '✨' : symptom.symptomType === 'Bloating' ? '🎈' : '🤕'}</div>
                            <div className="flex-1">
                                <p className="font-bold">{symptom.symptomType}</p>
                                <p className="text-xs text-muted-foreground">Severity: {symptom.severity}/5</p>
                            </div>
                            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive" onClick={() => onDelete(symptom.id)}>
                                <Trash2 className="size-4" />
                            </Button>
                        </m.div>
                    ))}
                </div>
            ) : (
                <div className="h-40 flex items-center justify-center text-muted-foreground">
                    <p>No symptoms logged for this date yet.</p>
                </div>
            )}
            </AnimatePresence>
        </CardContent>
    </Card>
);

const symptomsList = [
  { name: 'Fatigue', severity: 3, bodyZone: 'General' },
  { name: 'Bloating', severity: 4, bodyZone: 'Torso' },
  { name: 'Cramps', severity: 2, bodyZone: 'Pelvis' },
  { name: 'Acne', severity: 3, bodyZone: 'Face' },
  { name: 'Mood Swings', severity: 5, bodyZone: 'Head' },
  { name: 'Headache', severity: 2, bodyZone: 'Head' },
];

const SymptomQuickLog = ({ onLog }: { onLog: (symptom: any) => void }) => (
    <Card className="glass-card">
        <CardHeader>
            <CardTitle>Quick Log</CardTitle>
            <CardDescription>Tap to log a common symptom.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
            {symptomsList.map((symptom) => (
                <Button 
                    key={symptom.name}
                    variant="outline"
                    onClick={() => onLog(symptom)}
                >
                    {symptom.name}
                </Button>
            ))}
        </CardContent>
    </Card>
);

const DateSelector = ({ date, setDate }: { date: Date | undefined, setDate: (date: Date | undefined) => void }) => {
    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button
                    variant={"outline"}
                    className="w-[280px] justify-start text-left font-normal glass-card-auth"
                >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, "PPP") : <span>Pick a date</span>}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 glass-card-auth">
                <Calendar
                    mode="single"
                    selected={date}
                    onSelect={setDate}
                    initialFocus
                    disabled={(d) => d > new Date()}
                />
            </PopoverContent>
        </Popover>
    )
}

const AISymptomLogger = ({ onLog }: { onLog: (symptom: any) => void }) => {
    const [text, setText] = useState('');
    const [transcript, setTranscript] = useState('');
    const [suggestions, setSuggestions] = useState<AISuggestSymptomsOutput['suggestions']>([]);
    const [isSuggesting, setIsSuggesting] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const recognitionRef = useRef<any>(null);
    const { toast } = useToast();

    useEffect(() => {
        if (typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            recognitionRef.current = new SpeechRecognition();
            recognitionRef.current.continuous = false;
            recognitionRef.current.interimResults = false;
            recognitionRef.current.lang = 'en-US';

            recognitionRef.current.onresult = (event: any) => {
                const currentTranscript = event.results[0][0].transcript;
                setTranscript(currentTranscript);
            };
            recognitionRef.current.onerror = (event: any) => {
                toast({ variant: 'destructive', title: 'Voice Error', description: `Error occurred in recognition: ${event.error}` });
                setIsListening(false);
            };
             recognitionRef.current.onend = () => {
                setIsListening(false);
            };
        }
    }, [toast]);
    
    useEffect(() => {
        if (transcript) {
            setText(transcript);
            handleSuggest(transcript);
        }
    }, [transcript]);


    const handleSuggest = async (inputText = text) => {
        if (!inputText.trim()) return;
        setIsSuggesting(true);
        setSuggestions([]);
        try {
            const result = await suggestSymptomsFromText({ text: inputText });
            setSuggestions(result.suggestions);
        } catch (error) {
            toast({ variant: 'destructive', title: 'AI Error', description: 'Could not get suggestions.' });
        } finally {
            setIsSuggesting(false);
        }
    };
    
    const handleVoiceInput = () => {
        if (!recognitionRef.current) {
            toast({ variant: 'destructive', title: 'Unsupported', description: 'Voice input is not supported in your browser.' });
            return;
        }
        if (isListening) {
            recognitionRef.current.stop();
        } else {
            setText('');
            setTranscript('');
            setSuggestions([]);
            recognitionRef.current.start();
            setIsListening(true);
        }
    };

    const handleLogSuggestion = (suggestion: any) => {
        onLog({
            name: suggestion.symptomType,
            severity: suggestion.severity,
            bodyZone: suggestion.bodyZone,
        });
        // Remove the logged suggestion from the list
        setSuggestions(prev => prev.filter(s => s.symptomType !== suggestion.symptomType));
    };

    return (
        <Card className="glass-card">
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><Lightbulb className="text-primary"/> AI Symptom Helper</CardTitle>
                <CardDescription>Describe how you feel, and let AI suggest symptoms to log. You can also use the microphone.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="relative">
                    <Textarea 
                        placeholder="e.g., 'I have a terrible headache and feel really bloated...'"
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        className="bg-background/50 pr-20"
                        disabled={isSuggesting || isListening}
                    />
                     <Button 
                        size="icon" 
                        variant="ghost" 
                        className={cn("absolute top-2 right-10", isListening && "text-primary animate-pulse")} 
                        onClick={handleVoiceInput}
                        disabled={isSuggesting}
                    >
                        <Mic />
                    </Button>
                    <Button 
                        size="icon" 
                        className="absolute top-2 right-2" 
                        onClick={() => handleSuggest()}
                        disabled={isSuggesting || isListening || !text.trim()}
                    >
                       {isSuggesting ? <Loader2 className="animate-spin" /> : <Sparkles />}
                    </Button>
                </div>
                 {suggestions.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                        <p className="text-sm w-full text-muted-foreground">Tap to log:</p>
                        {suggestions.map((s, i) => (
                             <m.div key={i} initial={{opacity: 0, y: 10}} animate={{opacity: 1, y: 0}} transition={{delay: i * 0.1}}>
                                <Badge 
                                    className="cursor-pointer text-base py-1 px-3"
                                    onClick={() => handleLogSuggestion(s)}
                                >
                                    {s.symptomType}
                                </Badge>
                             </m.div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

export default function SymptomLogPage() {
    const [date, setDate] = useState<Date | undefined>(undefined);
    const { user } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();

    useEffect(() => {
        // Set date on client-side to avoid hydration mismatch
        setDate(new Date());
    }, []);

    const symptomsQuery = useMemoFirebase(() => {
        if (!user || !date || !firestore) return null;
        const start = startOfDay(date);
        const end = endOfDay(date);
        return query(
            collection(firestore, 'users', user.uid, 'symptomLogs'),
            where('timestamp', '>=', Timestamp.fromDate(start)),
            where('timestamp', '<=', Timestamp.fromDate(end))
        );
    }, [user, date, firestore]);
    
    const { data: symptoms, isLoading } = useCollection(symptomsQuery);
    
    const handleLogSymptom = useCallback(async (symptomData: any) => {
        if (!user || !firestore) {
            toast({
                variant: 'destructive',
                title: 'Not logged in',
                description: 'You must be logged in to log symptoms.',
            });
            return;
        }

        const collectionRef = collection(firestore, 'users', user.uid, 'symptomLogs');
        try {
            await addDocumentNonBlocking(collectionRef, {
                symptomType: symptomData.name,
                severity: symptomData.severity,
                bodyZone: symptomData.bodyZone,
                userId: user.uid,
                timestamp: date || new Date(),
            });
            toast({
                title: 'Symptom Logged!',
                description: `${symptomData.name} has been added to your log.`,
            });
        } catch (error) {
             toast({
                variant: 'destructive',
                title: 'Error',
                description: `Could not log symptom. Please try again.`
            });
        }
    }, [user, firestore, toast, date]);
    
    const handleDeleteSymptom = useCallback(async (symptomId: string) => {
        if (!user || !firestore) return;
        const docRef = doc(firestore, 'users', user.uid, 'symptomLogs', symptomId);
        try {
            await deleteDocumentNonBlocking(docRef);
            toast({
                title: 'Symptom Removed',
                description: 'The symptom has been removed from your log.',
            });
        } catch(error) {
            toast({
                variant: 'destructive',
                title: 'Error',
                description: `Could not remove symptom. Please try again.`
            });
        }
    }, [user, firestore, toast]);

    return (
        <div className="p-4 md:p-8 space-y-4">
            <header className="flex justify-between items-center">
                <h1 className="text-3xl font-headline font-bold text-gradient">Symptom Tracking</h1>
                <DateSelector date={date} setDate={setDate} />
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <main className="lg:col-span-2">
                    <SymptomConstellation symptoms={symptoms || []} />
                </main>

                <aside className="space-y-6">
                    <AISymptomLogger onLog={handleLogSymptom} />
                    <SymptomQuickLog onLog={handleLogSymptom} />
                    <SymptomTimeline symptoms={symptoms || []} isLoading={isLoading} onDelete={handleDeleteSymptom} />
                </aside>
            </div>
        </div>
    );
}
