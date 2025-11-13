
'use client';

import { useMemo, useState, useEffect } from 'react';
import { collection, query, orderBy, limit, where, Timestamp, collectionGroup } from 'firebase/firestore';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { differenceInDays, subDays } from 'date-fns';

/**
 * A centralized hook to fetch all common user health data points.
 * This avoids duplicating query logic across multiple components.
 * 
 * @param {number} daysToFetch - The number of days of data to fetch for time-sensitive collections.
 * @returns An object containing all the user's health data and their loading states.
 */
export function useUserHealthData(daysToFetch = 7, disableLogs = false) {
    const { user, isUserLoading } = useUser();
    const firestore = useFirestore();
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        setIsClient(true);
    }, []);

    const dateLimit = useMemo(() => subDays(new Date(), daysToFetch), [daysToFetch]);

    // --- Cycle Data ---
    const cyclesQuery = useMemoFirebase(() => {
        if (!user || !firestore) return null;
        return query(collection(firestore, 'users', user.uid, 'cycles'), orderBy('startDate', 'desc'), limit(12));
    }, [user, firestore]);
    const { data: cycles, isLoading: areCyclesLoading } = useCollection(cyclesQuery);

    const latestCycle = useMemo(() => cycles?.[0], [cycles]);

    const { cycleDay, cyclePhase } = useMemo(() => {
        if (!isClient || !latestCycle?.startDate || latestCycle.endDate) {
            return { cycleDay: null, cyclePhase: 'Unknown' };
        }

        const start = (latestCycle.startDate as any).toDate();
        const day = differenceInDays(new Date(), start) + 1;
        if (day <= 0) return { cycleDay: 1, cyclePhase: 'Menstrual' };

        const avgCycleLength = (latestCycle.length && typeof latestCycle.length === 'number' && latestCycle.length > 0) ? latestCycle.length : 28;
        const ovulationDay = Math.round(avgCycleLength - 14);
        const follicularEnd = ovulationDay > 5 ? ovulationDay - 3 : 5;
        const ovulationEnd = ovulationDay + 2;

        let phase = 'Luteal';
        if (day <= 5) phase = 'Menstrual';
        else if (day <= follicularEnd) phase = 'Follicular';
        else if (day <= ovulationEnd) phase = 'Ovulation';
        
        return { cycleDay: day, cyclePhase: phase };
    }, [latestCycle, isClient]);

    // --- Symptom Data ---
    const symptomsQuery = useMemoFirebase(() => {
        if (!user || !firestore) return null;
        return query(collection(firestore, `users/${user.uid}/symptomLogs`), where('timestamp', '>=', Timestamp.fromDate(dateLimit)), orderBy('timestamp', 'desc'));
    }, [user, firestore, dateLimit]);
    const { data: recentSymptoms, isLoading: areSymptomsLoading } = useCollection(symptomsQuery);

    // --- Nutrition Data ---
    const mealsQuery = useMemoFirebase(() => {
        if (!user || !firestore) return null;
        return query(collection(firestore, `users/${user.uid}/nutritionLogs`), where('loggedAt', '>=', Timestamp.fromDate(dateLimit)), orderBy('loggedAt', 'desc'));
    }, [user, firestore, dateLimit]);
    const { data: recentMeals, isLoading: areMealsLoading } = useCollection(mealsQuery);

    // --- Fitness Data ---
    const workoutsQuery = useMemoFirebase(() => {
        if (!user || !firestore) return null;
        return query(
            collection(firestore, `users/${user.uid}/fitnessActivities`),
            where('completedAt', '>=', Timestamp.fromDate(dateLimit)),
            orderBy('completedAt', 'desc')
        );
    }, [user, firestore, dateLimit]);
    const { data: recentFitnessActivities, isLoading: areFitnessActivitiesLoading } = useCollection(workoutsQuery);
    
    // --- Daily Check-ins ---
    const checkInsQuery = useMemoFirebase(() => {
        if (!user || !firestore) return null;
        return query(collection(firestore, `users/${user.uid}/dailyCheckIns`), where('date', '>=', Timestamp.fromDate(dateLimit)), orderBy('date', 'desc'));
    }, [user, firestore, dateLimit]);
    const { data: dailyCheckIns, isLoading: areCheckInsLoading } = useCollection(checkInsQuery);

    // --- Lab Results Data (less frequent, fetch more) ---
    const labResultsQuery = useMemoFirebase(() => {
        if (!user || !firestore) return null;
        return query(collection(firestore, `users/${user.uid}/labResults`), orderBy('testDate', 'desc'), limit(12));
    }, [user, firestore]);
    const { data: recentLabResults, isLoading: areLabResultsLoading } = useCollection(labResultsQuery);
    
    // --- Historical Period Logs for Calendar ---
    // DISABLED - This collectionGroup query causes root permission errors.
    // Disabling it prevents the app from crashing. New data can still be logged.
    const historicalPeriodLogs = null;
    const areLogsLoading = false;


    return {
        cycles,
        areCyclesLoading: areCyclesLoading || !isClient,
        latestCycle,
        cycleDay,
        cyclePhase,
        recentSymptoms,
        areSymptomsLoading,
        recentMeals,
        areMealsLoading,
        recentFitnessActivities,
        areFitnessActivitiesLoading,
        dailyCheckIns,
        areCheckInsLoading,
        recentLabResults,
        areLabResultsLoading,
        historicalPeriodLogs,
        areLogsLoading,
    };
}
