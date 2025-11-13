
'use server';
/**
 * @fileOverview A flow for analyzing a user's perceived effort after a workout to score its effectiveness.
 *
 * - scoreWorkoutEffectiveness - A function that scores the workout.
 * - WorkoutEffectivenessInput - The input type for the function.
 * - WorkoutEffectivenessOutput - The return type for the function.
 */

import { ai } from '@/ai/genkit';
import { WorkoutEffectivenessInputSchema, WorkoutEffectivenessOutputSchema } from './types/workout-types';
import type { WorkoutEffectivenessInput, WorkoutEffectivenessOutput } from './types/workout-types';


export async function scoreWorkoutEffectiveness(input: WorkoutEffectivenessInput): Promise<WorkoutEffectivenessOutput> {
  return scoreWorkoutEffectivenessFlow(input);
}

const prompt = ai.definePrompt({
  name: 'scoreWorkoutEffectivenessPrompt',
  input: { schema: WorkoutEffectivenessInputSchema },
  output: { schema: WorkoutEffectivenessOutputSchema },
  prompt: `You are an expert fitness coach specializing in PCOS. Your task is to analyze a user's feedback on a completed workout and provide an 'effectiveness score' and constructive feedback.

  **Workout & User Context:**
  - Workout Goal: {{{workoutGoal}}}
  - Cycle Phase: {{{cyclePhase}}}
  - User's Perceived Effort (RPE 1-10): {{{effortLevel}}}
  - Workout Plan: {{{json workout}}}

  **Analysis Protocol:**
  Your goal is to determine if the user's perceived effort was well-matched to their workout goal and cycle phase.

  1.  **High-Intensity Goals ('insulin-resistance', 'general-wellness' during ovulation):**
      - **Good Match (Score 85-100):** Effort level is 7-9. Feedback should be positive: "Great job! This effort level is perfect for building strength and improving insulin sensitivity."
      - **Too Easy (Score 60-75):** Effort level is 4-6. Feedback should be encouraging: "Good work. Next time, consider slightly increasing the weight or reps to challenge yourself a bit more."
      - **Too Hard (Score 50-70):** Effort level is 10. Feedback should be cautious: "You pushed hard! Remember that consistency is key. Ensure you recover well before your next session."
      - **Way Too Easy (Score <60):** Effort level is 1-3. Feedback: "This may have been too light for your goal. Let's try a more challenging workout next time."

  2.  **Low-Intensity Goals ('stress-relief', 'hormone-balance', or any workout during 'menstrual' phase):**
      - **Good Match (Score 85-100):** Effort level is 3-5. Feedback should be affirming: "Excellent. This gentle effort level is ideal for reducing stress and supporting your hormones."
      - **Too Hard (Score 50-75):** Effort level is 7-9. Feedback should be guiding: "You might have pushed a bit too hard for a recovery-focused session. It's okay to take it easier on these days."
      - **Way Too Hard (Score <50):** Effort level is 10. Feedback: "This intensity might be counterproductive for stress relief. Let's aim for more restorative movement on these days."
      - **Okay (Score 75-85):** Effort level is 6. Feedback: "This was a solid effort. For stress relief, you can also explore slightly lower intensities."

  Generate an 'effectivenessScore' and a 'feedback' message based on this logic.
  `,
});

const scoreWorkoutEffectivenessFlow = ai.defineFlow(
  {
    name: 'scoreWorkoutEffectivenessFlow',
    inputSchema: WorkoutEffectivenessInputSchema,
    outputSchema: WorkoutEffectivenessOutputSchema,
  },
  async input => {
    const { output } = await prompt(input);
    return output!;
  }
);
