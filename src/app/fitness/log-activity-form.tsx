
'use client';

import { useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useUser, useFirestore, addDocumentNonBlocking } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { collection } from 'firebase/firestore';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Loader2, Plus } from 'lucide-react';

const activityTypes = [
    "Yoga", "Strength Training", "Running", "Walking", "Cycling", "HIIT", "Pilates", "Dancing"
];

export const LogActivityForm = ({ onActivityLogged }: { onActivityLogged: () => void }) => {
    const { user } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    const [activityType, setActivityType] = useState('');
    const [duration, setDuration] = useState(30);
    const [isLoading, setIsLoading] = useState(false);

    const handleLogActivity = useCallback(async () => {
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
    }, [activityType, duration, user, firestore, onActivityLogged, toast]);

    const handleDurationChange = useCallback((value: number[]) => {
        setDuration(value[0]);
    }, []);

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
                    <Slider value={[duration]} onValueChange={handleDurationChange} min={5} max={120} step={5} />
                </div>
                <Button onClick={handleLogActivity} disabled={!activityType || isLoading} className="w-full">
                    {isLoading ? <Loader2 className="animate-spin" /> : "Log Activity"}
                </Button>
            </CardContent>
        </Card>
    );
};
