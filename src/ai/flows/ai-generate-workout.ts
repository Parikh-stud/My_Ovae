
'use server';
/**
 * @fileOverview A flow for generating a personalized workout based on cycle phase, goals, and available equipment.
 *
 * - generateWorkout - A function that creates a workout plan.
 * - GenerateWorkoutInput - The input type for the function.
 * - GenerateWorkoutOutput - The return type for the function.
 */

import { ai } from '@/ai/genkit';
import { GenerateWorkoutOutputSchema, GenerateWorkoutInputSchema } from './types/workout-types';
import type { GenerateWorkoutOutput, GenerateWorkoutInput } from './types/workout-types';
import { getHealthSummaryForUser } from './tools/get-health-summary';

export async function generateWorkout(input: GenerateWorkoutInput): Promise<GenerateWorkoutOutput> {
  return generateWorkoutFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateWorkoutPrompt',
  tools: [getHealthSummaryForUser],
  input: { schema: GenerateWorkoutInputSchema },
  output: { schema: GenerateWorkoutOutputSchema },
  prompt: `You are an expert fitness coach specializing in creating workouts for women with PCOS. Your task is to generate a complete workout plan based on the user's context, recent health data, and history.

  **User's Goal:**
  - Workout Goal: {{{workoutGoal}}}

  **User's Health Snapshot (from the last 24-48 hours):**
  - Use the getHealthSummaryForUser tool to get the user's most recent health data, including cycle phase, symptoms, and nutrition. This is CRITICAL context.
  
  **Workout Generation Rules:**
  - **Equipment Constraint**: CRITICAL - Only generate exercises that can be performed with the 'Available Equipment'. If the list is empty or says "None", you MUST only provide bodyweight exercises.
  - **Cycle Phase Adjustments**:
    - **Menstrual**: Focus on low-intensity, restorative activities.
    - **Follicular**: Recommend moderate-intensity cardio and strength.
    - **Ovulation**: Best time for HIIT and challenging workouts.
    - **Luteal**: Focus on strength and moderate cardio, be mindful of PMS symptoms.
  - **Goal-Specific Adjustments**:
    - **Hormone Balance**: Incorporate more mind-body exercises.
    - **Insulin Resistance**: Prioritize strength training and HIIT.
    - **Stress Relief**: Focus on calming activities. If recent symptoms include 'Stress' or 'Anxiety', ensure the workout is not overly strenuous.
    - **General Wellness**: Provide a balanced workout for the current phase.
  - **Nutrition Context**: If the health summary shows recent high-sugar or inflammatory meals, lean towards a gentler or more restorative workout, regardless of the cycle phase, to support blood sugar balance.
  
  **Progressive Overload Protocol:**
  1.  **Analyze History**: Review the user's 'Recent Workout History'.
  2.  **Assess Consistency**: If the user has consistently completed 2-3 workouts of this type recently, it's time to increase the difficulty.
  3.  **Increase Difficulty (~10%)**: If increasing difficulty, apply one or two of these methods:
      - Add 1-2 reps to a key exercise (e.g., 10-12 reps -> 12-14 reps).
      - Add 1 set to a compound movement.
      - Introduce a slightly harder exercise variation (e.g., Glute Bridge -> Single-Leg Glute Bridge), ensuring it still matches available equipment.
  4.  **Baseline for New Users**: If workout history is empty or sparse, create a solid baseline workout.
  5.  **Generate \`difficultyAnalysis\`**: Based on your decision, create a \`difficultyAnalysis\` message.
      - If increased: "This workout is slightly more challenging than your last one to help you keep progressing. I've increased the reps on some exercises."
      - If baseline: "This is a great baseline workout for your goal. As you log more sessions, I'll adapt the difficulty."

  **Output Requirements:**
  1.  **difficultyAnalysis**: The message explaining the change in difficulty.
  2.  **workoutName**: A creative and motivating name for the workout.
  3.  **warmup**: A 5-minute warm-up routine.
  4.  **exercises**: An array of 4-6 exercises with name, sets, reps, and description.
  5.  **cooldown**: A 5-minute cool-down routine.

  Now, generate the complete workout plan.
  `,
});

const generateWorkoutFlow = ai.defineFlow(
  {
    name: 'generateWorkoutFlow',
    inputSchema: GenerateWorkoutInputSchema,
    outputSchema: GenerateWorkoutOutputSchema,
  },
  async (input) => {
    // Make sure to pass the userId to the prompt so it can be used by the tool.
    const { output } = await prompt(input, {
        userId: input.userId,
    });
    return output!;
  }
);
