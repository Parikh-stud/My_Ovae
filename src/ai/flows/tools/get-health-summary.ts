
'use server';

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { getFirestore, collection, query, orderBy, limit, getDocs, where, Timestamp } from 'firebase/firestore';
import { initializeFirebase } from '@/firebase/config';
import { differenceInDays, subDays } from 'date-fns';

const db = getFirestore(initializeFirebase());

async function getUserData(userId: string, collectionName: string, days: number = 7, count: number = 20) {
  if (!userId) return [];
  try {
    const dateField = collectionName === 'fitnessActivities' ? 'completedAt' : 
                      collectionName === 'nutritionLogs' ? 'loggedAt' : 
                      'timestamp';

    const timeLimit = subDays(new Date(), days);

    const q = query(
      collection(db, 'users', userId, collectionName),
      where(dateField, '>=', Timestamp.fromDate(timeLimit)),
      orderBy(dateField, 'desc'),
      limit(count)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (e) {
    return [];
  }
}

export const getHealthSummaryForUser = ai.defineTool(
  {
    name: 'getHealthSummaryForUser',
    description: "Get a user's recent health data from the last 7 days, including cycle phase, symptoms, nutrition, and workouts. Use this to provide contextually aware recommendations.",
    inputSchema: z.object({ userId: z.string().describe("The user's unique ID.") }),
    outputSchema: z.any(),
  },
  async ({ userId }) => {
    if (!userId) {
      return { error: 'User ID is required.' };
    }

    try {
      // Fetch all data in parallel
      const [
        cycles,
        symptoms,
        nutrition,
        fitness,
      ] = await Promise.all([
        getDocs(query(collection(db, 'users', userId, 'cycles'), orderBy('startDate', 'desc'), limit(1))),
        getUserData(userId, 'symptomLogs', 7, 20),
        getUserData(userId, 'nutritionLogs', 2, 10), // Nutrition from last 2 days
        getUserData(userId, 'fitnessActivities', 7, 10),
      ]);

      // Process cycle data
      let cycleDay = null;
      let cyclePhase = 'Unknown';
      const latestCycle = cycles.docs[0]?.data();

      if (latestCycle?.startDate && !latestCycle.endDate) {
        const start = latestCycle.startDate.toDate();
        const day = differenceInDays(new Date(), start) + 1;
        cycleDay = day > 0 ? day : 1;
        
        const avgCycleLength = latestCycle.length || 28;
        const ovulationDay = Math.round(avgCycleLength - 14);
        const follicularEnd = ovulationDay - 3;
        const ovulationEnd = ovulationDay + 2;

        if (day <= 5) cyclePhase = 'Menstrual';
        else if (day <= follicularEnd) cyclePhase = 'Follicular';
        else if (day <= ovulationEnd) cyclePhase = 'Ovulation';
        else cyclePhase = 'Luteal';
      }

      return {
        cycle: {
          day: cycleDay,
          phase: cyclePhase,
        },
        symptoms: symptoms.map((s: any) => s.symptomType),
        nutrition: nutrition.map((n: any) => ({ 
            mealName: n.mealName, 
            pcosScore: n.pcosScore,
            foodItems: n.foodItems
        })),
        fitness: fitness.map((f: any) => ({
            activityType: f.activityType,
            duration: f.duration
        })),
      };
    } catch (error: any) {
      return { error: `Failed to fetch health summary: ${error.message}` };
    }
  }
);
