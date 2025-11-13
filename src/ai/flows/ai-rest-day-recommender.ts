
'use server';
/**
 * @fileOverview A flow for providing a holistic recovery recommendation based on recent fitness, symptoms, and cycle data.
 *
 * - recommendRecoveryAction - A function that analyzes user data to advise on recovery.
 * - RecoveryRecommenderInput - The input type for the function.
 * - RecoveryRecommenderOutput - The return type for the function.
 */

import { ai } from '@/ai/genkit';
import { RecoveryRecommenderInputSchema, RecoveryRecommenderOutputSchema } from './types/workout-types';
import type { RecoveryRecommenderInput, RecoveryRecommenderOutput } from './types/workout-types';


export async function recommendRecoveryAction(input: RecoveryRecommenderInput): Promise<RecoveryRecommenderOutput> {
  return recommendRecoveryActionFlow(input);
}

const prompt = ai.definePrompt({
  name: 'recommendRecoveryActionPrompt',
  input: { schema: RecoveryRecommenderInputSchema },
  output: { schema: RecoveryRecommenderOutputSchema },
  prompt: `You are a PCOS-aware fitness recovery expert. Your task is to analyze a user's recent health snapshot to provide a holistic recovery recommendation.

  **User's Health Snapshot:**
  - Recent Health Data (workouts, symptoms, energy levels): {{{healthSnapshot}}}
  - Current Cycle Phase: {{{cyclePhase}}}

  **Analysis Protocol:**
  1.  **Calculate Recovery Score (0-100)**: Synthesize all available data.
      - **Decrease Score For**: High frequency of intense workouts (3+ HIIT/Running in 5 days), 5+ consecutive workout days, logged symptoms like 'Fatigue' or 'Pain', low self-reported 'energyLevel' from daily check-ins.
      - **Significantly Decrease Score For**: Being in the 'menstrual' phase combined with recent intense activity.
      - **Maintain/Increase Score For**: Well-spaced workouts, recent rest days, high energy levels, and being in the 'follicular' or 'ovulation' phase.
  2.  **Determine Recommendation**:
      - **Recovery Score > 75%**: Recommend 'Workout'. Your reasoning should be encouraging and phase-appropriate.
      - **Recovery Score 40-75%**: Recommend 'Active Recovery'. Your reasoning should explain why full intensity isn't ideal (e.g., "You've had a few intense sessions, so some light movement will help your muscles recover."). Provide 2-3 'suggestedActivities' like "Gentle Yoga", "Light Walk", or "Stretching".
      - **Recovery Score < 40%**: Recommend 'Rest'. Your reasoning must be clear and supportive, emphasizing the importance of recovery (e.g., "You've been training hard and logged some fatigue. A full rest day is crucial for preventing burnout and supporting hormonal balance.").
  3.  **Streak Protection**: If you see 4-5 consecutive days of workouts, include a gentle warning in your reasoning like, "Taking regular rest days is key to long-term progress."

  Now, generate the complete recovery analysis.
  `,
});

const recommendRecoveryActionFlow = ai.defineFlow(
  {
    name: 'recommendRecoveryActionFlow',
    inputSchema: RecoveryRecommenderInputSchema,
    outputSchema: RecoveryRecommenderOutputSchema,
  },
  async input => {
    const { output } = await prompt(input);
    return output!;
  }
);
