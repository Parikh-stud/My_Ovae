
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Loader2, Save } from 'lucide-react';
import { useUser, useFirestore, setDocumentNonBlocking, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { format, startOfDay } from 'date-fns';
import { m } from 'framer-motion';
import { Skeleton } from '@/components/ui/skeleton';

const moodEmojis = ['😔', '😕', '😐', '🙂', '😊'];
const energyEmojis = ['⚡️', '⚡️⚡️', '⚡️⚡️⚡️', '⚡️⚡️⚡️⚡️', '⚡️⚡️⚡️⚡️⚡️'];

export function DailyCheckIn() {
  const [mood, setMood] = useState(3);
  const [energy, setEnergy] = useState(3);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();
  const { user } = useUser();
  const firestore = useFirestore();

  // This state is crucial to prevent hydration errors with `new Date()`
  const [todayId, setTodayId] = useState<string | null>(null);

  useEffect(() => {
    // Set the date only on the client side
    setTodayId(format(new Date(), 'yyyy-MM-dd'));
  }, []);

  const checkInRef = useMemoFirebase(() => {
    if (!user || !firestore || !todayId) return null;
    return doc(firestore, 'users', user.uid, 'dailyCheckIns', todayId);
  }, [user, firestore, todayId]);

  const { data: todaysCheckIn, isLoading } = useDoc(checkInRef);

  const handleSave = useCallback(async () => {
    if (!user || !firestore || !checkInRef) {
      toast({ variant: 'destructive', title: 'Error', description: 'You must be logged in to save your check-in.' });
      return;
    }
    setIsSaving(true);
    
    const checkInData = {
      userId: user.uid,
      date: startOfDay(new Date()),
      mood,
      energyLevel: energy
    };

    try {
      await setDocumentNonBlocking(checkInRef, checkInData);
      toast({ title: "Check-in Saved!", description: "Your mood and energy for today have been logged." });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not save your check-in. Please try again.' });
    } finally {
      setIsSaving(false);
    }
  }, [user, firestore, checkInRef, mood, energy, toast]);

  const handleMoodChange = useCallback((value: number[]) => {
    setMood(value[0]);
  }, []);

  const handleEnergyChange = useCallback((value: number[]) => {
    setEnergy(value[0]);
  }, []);

  if (isLoading || !todayId) {
      return (
        <Card className="glass-card">
            <CardHeader>
                <Skeleton className="h-6 w-1/2" />
                <Skeleton className="h-4 w-3/4" />
            </CardHeader>
            <CardContent>
                 <Skeleton className="h-24 w-full" />
                 <Skeleton className="h-10 w-full mt-4" />
            </CardContent>
        </Card>
      )
  }

  if (todaysCheckIn) {
    return (
       <Card className="glass-card">
          <CardHeader>
            <CardTitle>Today's Check-in</CardTitle>
            <CardDescription>You've already logged your mood and energy for today.</CardDescription>
          </CardHeader>
          <CardContent>
             <m.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center justify-around gap-4 text-center text-muted-foreground p-4 bg-black/20 rounded-lg"
            >
                <div className="flex flex-col items-center">
                    <span className="text-4xl">{moodEmojis[todaysCheckIn.mood - 1]}</span>
                    <p className="font-bold text-sm mt-2">Mood</p>
                </div>
                 <div className="flex flex-col items-center">
                    <span className="text-3xl text-yellow-400">{energyEmojis[todaysCheckIn.energyLevel - 1]}</span>
                    <p className="font-bold text-sm mt-2">Energy</p>
                </div>
            </m.div>
          </CardContent>
        </Card>
    )
  }

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle>Daily Check-in</CardTitle>
        <CardDescription>How are you feeling today?</CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        <div className="space-y-4">
          <Label>Your Mood: <span className="text-2xl ml-2">{moodEmojis[mood - 1]}</span></Label>
          <Slider value={[mood]} onValueChange={handleMoodChange} min={1} max={5} step={1} />
        </div>
        <div className="space-y-4">
          <Label>Your Energy: <span className="text-lg ml-2 text-yellow-400">{energyEmojis[energy - 1]}</span></Label>
          <Slider value={[energy]} onValueChange={handleEnergyChange} min={1} max={5} step={1} />
        </div>
        <Button onClick={handleSave} disabled={isSaving} className="w-full">
          {isSaving ? <Loader2 className="animate-spin" /> : <Save />}
          Save Check-in
        </Button>
      </CardContent>
    </Card>
  );
}
