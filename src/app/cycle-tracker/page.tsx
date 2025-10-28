
'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Moon, Droplet, Sun, Zap, Info, CalendarClock, Target, CalendarHeart, BrainCircuit, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUser, useFirestore, useCollection, useMemoFirebase, addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import { collection, query, orderBy, limit, writeBatch, doc, where, getDocs } from 'firebase/firestore';
import { DateRange, DayModifiers } from 'react-day-picker';
import { addDays, differenceInDays, format, startOfDay, isFuture } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

const flowLevels = [
  { level: 'spotting', label: 'Spotting', color: 'bg-rose-200/50 text-rose-200' },
  { level: 'light', label: 'Light', color: 'bg-red-300/50 text-red-300' },
  { level: 'medium', label: 'Medium', color: 'bg-red-400/50 text-red-400' },
  { level: 'heavy', label: 'Heavy', color: 'bg-red-500/50 text-red-500' },
];

const CycleRing = ({ cycleDay, cycleLength, phase }: { cycleDay: number, cycleLength: number, phase: string }) => {
  const [circumference, setCircumference] = useState(0);

  useEffect(() => {
    setCircumference(2 * Math.PI * 140);
  }, []);

  const progress = cycleLength > 0 ? (cycleDay / cycleLength) * circumference : 0;
  const phaseColors: { [key: string]: string } = {
    menstrual: 'hsl(var(--cycle-menstrual))',
    follicular: 'hsl(var(--cycle-follicular))',
    ovulation: 'hsl(var(--cycle-ovulation))',
    luteal: 'hsl(var(--cycle-luteal))',
  };

  return (
    <div className="relative w-80 h-80">
      <svg className="absolute w-full h-full transform -rotate-90" viewBox="0 0 300 300">
        <circle
          cx="150"
          cy="150"
          r="140"
          stroke="hsl(var(--muted))"
          strokeWidth="20"
          fill="transparent"
        />
        <m.circle
          cx="150"
          cy="150"
          r="140"
          stroke={phaseColors[phase] || 'hsl(var(--primary))'}
          strokeWidth="20"
          fill="transparent"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference - progress }}
          transition={{ duration: 1.5, ease: 'easeOut' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <m.div initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.5 }}>
          <span className="text-7xl font-bold font-code">{cycleDay}</span>
          <span className="text-xl font-headline text-muted-foreground">day {cycleDay}</span>
        </m.div>
      </div>
    </div>
  );
};

const PhaseInfo = ({ phase }: { phase: string }) => {
  const phaseDetails: { [key: string]: { icon: React.ElementType, title: string, description: string, color: string } } = {
    menstrual: { icon: Droplet, title: 'Menstrual Phase', description: 'Your body is shedding the uterine lining. Rest and gentle movement are key.', color: 'text-cycle-menstrual' },
    follicular: { icon: Sun, title: 'Follicular Phase', description: 'Energy rises as your body prepares for ovulation. A great time for new beginnings.', color: 'text-cycle-follicular' },
    ovulation: { icon: Zap, title: 'Ovulation Phase', description: 'Peak fertility. You might feel more social and energetic.', color: 'text-cycle-ovulation' },
    luteal: { icon: Moon, title: 'Luteal Phase', description: 'Energy may decrease as your body prepares for your period. Focus on self-care.', color: 'text-cycle-luteal' },
  };
  const details = phaseDetails[phase];
  if (!details) return null;

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className={cn("flex items-center gap-2", details.color)}>
          <details.icon />
          {details.title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">{details.description}</p>
      </CardContent>
    </Card>
  )
};

const PredictionCard = ({ icon, title, date, daysAway, color }: { icon: React.ElementType, title: string, date: Date | null, daysAway: number, color: string }) => {
    if (!date || !isFuture(date)) {
        return (
             <div className="flex items-center gap-4 text-muted-foreground">
                <div className={cn("p-3 rounded-full bg-muted/50", color)}>
                    {React.createElement(icon, {className: "size-6"})}
                </div>
                <div>
                    <h4 className="font-bold">{title}</h4>
                    <p className="text-sm">Not enough data to predict.</p>
                </div>
            </div>
        )
    }

    return (
        <div className="flex items-center gap-4">
            <div className={cn("p-3 rounded-full bg-muted/50", color)}>
                 {React.createElement(icon, {className: "size-6"})}
            </div>
            <div>
                <h4 className="font-bold">{title}</h4>
                <p className="text-sm text-muted-foreground">{format(date, 'MMMM do')} • <span className="font-semibold">{daysAway} days away</span></p>
            </div>
        </div>
    )
}

const Predictions = ({ cycles }: { cycles: any[] }) => {
    const predictions = useMemo(() => {
        if (!cycles || cycles.length < 2) return null;

        const completedCycles = cycles.slice(1).filter(c => c.length && typeof c.length === 'number');
        if (completedCycles.length === 0) return null;

        const avgCycleLength = Math.round(completedCycles.reduce((sum, c) => sum + c.length, 0) / completedCycles.length);
        if (isNaN(avgCycleLength)) return null;
        
        const lastCycle = cycles[0];
        const lastStartDate = (lastCycle.startDate as any)?.toDate();
        if(!lastStartDate) return null;

        const nextPeriodStart = addDays(lastStartDate, avgCycleLength);
        const ovulationDay = Math.round(avgCycleLength - 14);
        const nextOvulationDate = addDays(lastStartDate, ovulationDay);
        const fertileWindowStart = addDays(nextOvulationDate, -5);

        const now = new Date();
        return {
            nextPeriod: {
                date: nextPeriodStart,
                daysAway: differenceInDays(nextPeriodStart, now)
            },
            nextOvulation: {
                date: nextOvulationDate,
                daysAway: differenceInDays(nextOvulationDate, now)
            },
            fertileWindow: {
                date: fertileWindowStart,
                daysAway: differenceInDays(fertileWindowStart, now)
            }
        }
    }, [cycles]);


    return (
        <Card className="glass-card">
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><BrainCircuit className="text-primary"/> Predictions</CardTitle>
                 <CardDescription>Based on your average cycle length.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {!cycles ? (
                    <>
                        <Skeleton className="h-12 w-full" />
                        <Skeleton className="h-12 w-full" />
                        <Skeleton className="h-12 w-full" />
                    </>
                ) : (
                    <>
                        <PredictionCard
                            icon={CalendarClock}
                            title="Next Period"
                            date={predictions?.nextPeriod.date || null}
                            daysAway={predictions?.nextPeriod.daysAway || 0}
                            color="text-cycle-menstrual"
                        />
                        <PredictionCard
                            icon={CalendarHeart}
                            title="Fertile Window"
                            date={predictions?.fertileWindow.date || null}
                            daysAway={predictions?.fertileWindow.daysAway || 0}
                            color="text-cycle-follicular"
                        />
                        <PredictionCard
                            icon={Target}
                            title="Ovulation Day"
                            date={predictions?.nextOvulation.date || null}
                            daysAway={predictions?.nextOvulation.daysAway || 0}
                            color="text-cycle-ovulation"
                        />
                    </>
                )}
            </CardContent>
        </Card>
    );
};

const CycleHistory = ({ cycles }: { cycles: any[] }) => {
    const stats = useMemo(() => {
        if (!cycles) return { avgCycle: 'N/A', avgPeriod: 'N/A' };
        const completedCycles = cycles.filter(c => c.length && typeof c.length === 'number');
        if (completedCycles.length === 0) return { avgCycle: 'N/A', avgPeriod: 'N/A' };
        
        const avgCycle = Math.round(completedCycles.reduce((sum, c) => sum + c.length, 0) / completedCycles.length);
        
        // This is a simplification; would need daily flow data for accurate period length
        const avgPeriod = '5';

        return { avgCycle, avgPeriod };
    }, [cycles]);

    return (
        <Card className="glass-card">
             <CardHeader>
                <CardTitle>Your Averages</CardTitle>
            </CardHeader>
            <CardContent className="flex justify-around text-center">
                 {!cycles ? (
                     <>
                        <div className="flex flex-col items-center gap-2">
                            <Skeleton className="h-10 w-16" />
                            <Skeleton className="h-4 w-24" />
                        </div>
                         <div className="flex flex-col items-center gap-2">
                            <Skeleton className="h-10 w-16" />
                            <Skeleton className="h-4 w-24" />
                        </div>
                     </>
                 ) : (
                     <>
                        <div>
                            <p className="text-4xl font-bold font-code">{stats.avgCycle}</p>
                            <p className="text-sm text-muted-foreground">day cycle</p>
                        </div>
                        <div>
                            <p className="text-4xl font-bold font-code">{stats.avgPeriod}</p>
                            <p className="text-sm text-muted-foreground">day period</p>
                        </div>
                    </>
                 )}
            </CardContent>
        </Card>
    )
}


export default function CycleTrackerPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [period, setPeriod] = useState<DateRange | undefined>();
  const [selectedFlow, setSelectedFlow] = useState<string | null>(null);
  const [isLogging, setIsLogging] = useState(false);

  const cyclesQuery = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return query(collection(firestore, 'users', user.uid, 'cycles'), orderBy('startDate', 'desc'), limit(12));
  }, [user, firestore]);

  const { data: cycles, isLoading: areCyclesLoading } = useCollection(cyclesQuery);
  const latestCycle = useMemo(() => cycles?.[0], [cycles]);

  const [cycleDay, setCycleDay] = useState(1);
  const [cycleLength, setCycleLength] = useState(28);
  const [phase, setPhase] = useState('menstrual');

  useEffect(() => {
    // Only calculate if there is a latest cycle and it hasn't ended yet.
    if (latestCycle?.startDate && !latestCycle.endDate) {
      const start = (latestCycle.startDate as any).toDate();
      const day = differenceInDays(new Date(), start) + 1;
      setCycleDay(day > 0 ? day : 1);
      
      const avgCycleLength = (latestCycle?.length && typeof latestCycle.length === 'number') ? latestCycle.length : 28;
      setCycleLength(avgCycleLength);

      const ovulationDay = avgCycleLength - 14;
      const follicularEnd = ovulationDay - 3;
      const ovulationEnd = ovulationDay + 2;

      if (day <= 5) setPhase('menstrual');
      else if (day <= follicularEnd) setPhase('follicular');
      else if (day <= ovulationEnd) setPhase('ovulation');
      else setPhase('luteal');
    }
  }, [latestCycle]);

  const historicalPeriods: DayModifiers['historicalPeriod'] = useMemo(() => {
      if (!cycles) return [];
      const dates: Date[] = [];
      cycles.forEach(cycle => {
          const start = (cycle.startDate as any)?.toDate();
          if (start) {
              const end = cycle.endDate ? (cycle.endDate as any).toDate() : addDays(start, 5); // Assume 5 day period if no end date for old cycles
              let current = start;
              // Ensure we don't create an infinite loop for ongoing cycles
              const finalEnd = cycle.endDate ? end : new Date() < addDays(start, 45) ? end : addDays(start, 7);
              while (current <= finalEnd) {
                  dates.push(new Date(current));
                  current = addDays(current, 1);
              }
          }
      });
      return dates;
  }, [cycles]);


  const handleLogPeriod = async () => {
    if (!user || !firestore || !period?.from || isLogging) {
      if(!period?.from) toast({ variant: 'destructive', title: 'Error', description: 'Please select a period start date.' });
      return;
    }
    setIsLogging(true);
    const { from, to } = period;
    const startDate = startOfDay(from);

    try {
        const cyclesRef = collection(firestore, 'users', user.uid, 'cycles');

        // Check for overlapping cycles
        const overlappingQuery = query(cyclesRef, where("startDate", "<=", to || startDate), where("endDate", ">=", startDate));
        const overlappingDocs = await getDocs(overlappingQuery);
        if (!overlappingDocs.empty && (!latestCycle || overlappingDocs.docs[0].id !== latestCycle.id)) {
             toast({ variant: 'destructive', title: 'Overlap Error', description: 'The selected date range overlaps with an existing cycle.'});
            setIsLogging(false);
            return;
        }

        const newCycleData = {
            userId: user.uid,
            startDate: startDate,
            endDate: to ? startOfDay(to) : null,
            length: to ? differenceInDays(startOfDay(to), startDate) + 1 : null,
            notes: "",
        };
        
        let writePromise: Promise<any>;
        const isUpdatingCurrentCycle = latestCycle && !latestCycle.endDate && format((latestCycle.startDate as any).toDate(), 'yyyy-MM-dd') === format(startDate, 'yyyy-MM-dd');

        if (isUpdatingCurrentCycle) {
            const cycleRef = doc(firestore, 'users', user.uid, 'cycles', latestCycle.id);
            writePromise = updateDocumentNonBlocking(cycleRef, {
                endDate: to ? startOfDay(to) : null,
                length: to ? differenceInDays(startOfDay(to), startDate) + 1 : null,
            });
        } else {
            writePromise = addDocumentNonBlocking(cyclesRef, newCycleData);
        }
      
        // This part needs adjustment if we are creating a new cycle
        // For simplicity, we'll assume flow is only logged for an existing cycle being updated.
        if(selectedFlow && latestCycle?.id && isUpdatingCurrentCycle) {
            let currentDay = startDate;
            const lastDay = to ? startOfDay(to) : currentDay;
            const batch = writeBatch(firestore);

            while(currentDay <= lastDay) {
              const logId = format(currentDay, 'yyyy-MM-dd');
              const logRef = doc(firestore, 'users', user.uid, 'cycles', latestCycle.id, 'logs', logId);
              batch.set(logRef, {
                  cycleId: latestCycle.id,
                  date: currentDay,
                  flow: selectedFlow
              }, { merge: true });
              currentDay = addDays(currentDay, 1);
            }
            await batch.commit();
        }
      
        await writePromise;

        toast({ title: 'Cycle Logged!', description: 'Your cycle data has been updated.' });
        setPeriod(undefined);
        setSelectedFlow(null);

    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not save your cycle data. Please try again.' });
    } finally {
      setIsLogging(false);
    }
  };

  const modifiers = {
    historicalPeriod: historicalPeriods,
  };

  const modifiersClassNames = {
    selected: 'bg-primary text-primary-foreground hover:bg-primary/90 focus:bg-primary/90',
    historicalPeriod: 'bg-cycle-menstrual/20 text-cycle-menstrual/80 rounded-md'
  };


  return (
    <div className="p-4 md:p-8 space-y-8">
      <header className="flex justify-between items-center">
        <h1 className="text-3xl font-headline font-bold text-gradient flex items-center gap-3">
          <Moon className="size-8" />
          Cycle Tracker
        </h1>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 flex items-center justify-center">
          {areCyclesLoading ? <Skeleton className="w-80 h-80 rounded-full" /> : <CycleRing cycleDay={cycleDay} cycleLength={cycleLength} phase={phase} />}
        </div>
        <div className="space-y-6">
          <PhaseInfo phase={phase} />
          <Predictions cycles={cycles || []} />
          <CycleHistory cycles={cycles || []}/>
        </div>
      </div>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle>Log Your Period</CardTitle>
          <CardDescription>Select the start and end dates of your period. Previously logged periods are highlighted.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
          <Calendar
            mode="range"
            selected={period}
            onSelect={setPeriod}
            className="rounded-md border p-4 bg-background/50 self-center"
            modifiers={modifiers}
            modifiersClassNames={modifiersClassNames}
          />
          <div className="space-y-6">
            <div>
              <h4 className="font-bold mb-4">Select Flow Level</h4>
              <div className="grid grid-cols-2 gap-4">
                {flowLevels.map(({level, label, color}) => (
                  <Button
                    key={level}
                    variant={selectedFlow === level ? 'default' : 'outline'}
                    className={cn("h-16 text-base", selectedFlow === level ? 'ring-2 ring-primary' : '', selectedFlow ? '' : color)}
                    onClick={() => setSelectedFlow(level)}
                  >
                    {label}
                  </Button>
                ))}
              </div>
            </div>

            <Button onClick={handleLogPeriod} disabled={!period?.from || isLogging} className="w-full h-12 text-lg continue-button-pulse">
                {isLogging ? <Loader2 className="animate-spin" /> : (latestCycle?.endDate ? 'Log New Period' : 'Update Current Period')}
            </Button>
            
             <div className="flex items-start gap-2 text-muted-foreground p-3 bg-muted/50 rounded-lg">
                <Info className="size-5 shrink-0 mt-1" />
                <p className="text-xs">
                  If you are starting a new period, select only the start date. If logging a completed one, select start and end. Your cycle length will be calculated automatically.
                </p>
            </div>
          </div>
        </CardContent>
      </Card>

    </div>
  );
}

    