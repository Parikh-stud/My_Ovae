'use server';
/**
 * @fileOverview A flow for recommending a rest day based on recent fitness activity and cycle phase.
 *
 * - recommendRestDay - A function that analyzes workout data to recommend rest.
 * - RestDayRecommenderInput - The input type for the function.
 * - RestDayRecommenderOutput - The return type for the function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const RestDayRecommenderInputSchema = z.object({
  fitnessData: z.string().describe("A JSON string of the user's fitness activities over the last 7 days."),
  cyclePhase: z.enum(['menstrual', 'follicular', 'ovulation', 'luteal', 'unknown']).describe("The user's current menstrual cycle phase."),
});
export type RestDayRecommenderInput = z.infer<typeof RestDayRecommenderInputSchema>;

const RestDayRecommenderOutputSchema = z.object({
  recommendRest: z.boolean().describe('Set to true if a rest day is recommended.'),
  reason: z.string().describe('A brief explanation for the recommendation, considering workout frequency, intensity, and cycle phase.'),
});
export type RestDayRecommenderOutput = z.infer<typeof RestDayRecommenderOutputSchema>;

export async function recommendRestDay(input: RestDayRecommenderInput): Promise<RestDayRecommenderOutput> {
  return recommendRestDayFlow(input);
}

const prompt = ai.definePrompt({
  name: 'recommendRestDayPrompt',
  input: { schema: RestDayRecommenderInputSchema },
  output: { schema: RestDayRecommenderOutputSchema },
  prompt: `You are a PCOS-aware fitness recovery expert. Your task is to analyze a user's workout data from the last 7 days and their current cycle phase to determine if they should take a rest day.

  Rules for recommending rest:
  - Strongly recommend rest if the user has done 3 or more high-intensity workouts (like HIIT, Running) in the last 5 days.
  - Recommend rest if the user has worked out for 5 or 6 consecutive days.
  - Recommend rest or "active recovery" (like walking, stretching) if it's the menstrual phase and they've done more than 2 moderate workouts. The menstrual phase is a time for lower energy and recovery.
  - If the user is in the luteal phase and has done several high-intensity workouts, suggest that dialing back intensity could be beneficial.
  - If none of the above apply, do not recommend rest and provide an encouraging message that is phase-appropriate (e.g., "Your energy is high in the follicular phase, great day for a workout!").

  Analyze the following data:
  - Recent Workouts: {{{fitnessData}}}
  - Current Cycle Phase: {{{cyclePhase}}}

  Based on your analysis, decide whether to recommend rest. Provide a clear, concise, data-driven, and phase-aware reason for your decision.
  `,
});

const recommendRestDayFlow = ai.defineFlow(
  {
    name: 'recommendRestDayFlow',
    inputSchema: RestDayRecommenderInputSchema,
    outputSchema: RestDayRecommenderOutputSchema,
  },
  async input => {
    const { output } = await prompt(input);
    return output!;
  }
);
