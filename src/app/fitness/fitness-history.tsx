
'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Loader2, Flame } from 'lucide-react';
import { m } from 'framer-motion';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, limit } from 'firebase/firestore';
import { formatDistanceToNow } from 'date-fns';

export const FitnessHistory = ({ newActivityTrigger }: { newActivityTrigger: number }) => {
    const { user } = useUser();
    const firestore = useFirestore();
    
    const activitiesQuery = useMemoFirebase(() => {
        if (!user || !firestore) return null;
        return query(collection(firestore, `users/${user.uid}/fitnessActivities`), orderBy('completedAt', 'desc'), limit(10));
    }, [user, firestore, newActivityTrigger]);
    
    const { data: activities, isLoading } = useCollection(activitiesQuery);

    return (
        <Card className="glass-card lg:col-span-3">
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><BarChart /> Recent Activity</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {isLoading ? (
                    <div className="flex items-center justify-center h-40"><Loader2 className="animate-spin text-primary" /></div>
                ) : activities && activities.length > 0 ? (
                    activities.map(activity => (
                        <m.div
                            key={activity.id}
                            layout
                            initial={{ opacity: 0, y: -20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex items-center gap-4 bg-black/20 p-3 rounded-lg"
                        >
                            <div className="p-2 bg-primary/20 rounded-full text-primary"><Flame /></div>
                            <div className="flex-1">
                                <p className="font-bold">{activity.activityType}</p>
                                <p className="text-sm text-muted-foreground">{activity.duration} minutes</p>
                            </div>
                            <p className="text-xs text-muted-foreground">{formatDistanceToNow((activity.completedAt as any).toDate(), { addSuffix: true })}</p>
                        </m.div>
                    ))
                ) : (
                    <div className="flex items-center justify-center h-40 text-muted-foreground">
                        <p>Your logged activities will appear here.</p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};
