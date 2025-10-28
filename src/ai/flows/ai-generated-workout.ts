
'use server';
/**
 * @fileOverview A flow for generating personalized workouts based on the user's menstrual cycle phase and fitness goals.
 *
 * - generateWorkout - A function that generates a workout plan.
 * - GenerateWorkoutInput - The input type for the generateWorkout function.
 * - GenerateWorkoutOutput - The return type for the generateWorkout function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const GenerateWorkoutInputSchema = z.object({
  cyclePhase: z.enum(['menstrual', 'follicular', 'ovulation', 'luteal', 'unknown']).describe("The user's current menstrual cycle phase."),
  workoutGoal: z.enum(['hormone-balance', 'insulin-resistance', 'stress-relief', 'general-wellness']).describe("The user's primary fitness goal for this workout."),
});
export type GenerateWorkoutInput = z.infer<typeof GenerateWorkoutInputSchema>;

const ExerciseSchema = z.object({
    name: z.string().describe('The name of the exercise.'),
    sets: z.string().describe('The number of sets to perform (e.g., "3 sets").'),
    reps: z.string().describe('The number of repetitions or duration (e.g., "10-12 reps" or "30 seconds").'),
    description: z.string().describe('A brief description of how to perform the exercise.'),
});

const GenerateWorkoutOutputSchema = z.object({
  workoutName: z.string().describe('A creative and motivating name for the workout.'),
  warmup: z.string().describe('A description of the warm-up routine.'),
  exercises: z.array(ExerciseSchema).describe('An array of exercises for the main workout.'),
  cooldown: z.string().describe('A description of the cool-down routine.'),
});
export type GenerateWorkoutOutput = z.infer<typeof GenerateWorkoutOutputSchema>;

export async function generateWorkout(input: GenerateWorkoutInput): Promise<GenerateWorkoutOutput> {
  return generateWorkoutFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateWorkoutPrompt',
  input: { schema: GenerateWorkoutInputSchema },
  output: { schema: GenerateWorkoutOutputSchema },
  prompt: `You are an expert fitness coach specializing in creating workouts for women with PCOS, synced with their menstrual cycle and specific goals.

Generate a complete workout plan tailored for the user's current cycle phase: {{{cyclePhase}}} AND their primary goal: {{{workoutGoal}}}.

- If the goal is 'hormone-balance', focus on exercises that support hormonal regulation, like moderate-intensity strength training and yoga.
- If the goal is 'insulin-resistance', prioritize resistance training and HIIT to improve insulin sensitivity.
- If the goal is 'stress-relief', create a workout centered around yoga, pilates, or other calming movements to reduce cortisol.
- If the goal is 'general-wellness' or the phase is 'unknown', provide a balanced, beginner-friendly, full-body workout that is safe for anyone with PCOS.

The workout should be something that can be done at home with minimal equipment (bodyweight, dumbbells).

The plan must include:
1. A creative and motivating name for the workout that reflects both the phase and the goal.
2. A warm-up section (5-7 minutes).
3. A main set of 4-5 exercises.
4. A cool-down section (5-7 minutes).

For each exercise in the main set, provide the name, number of sets, reps (or duration), and a brief, clear description of how to perform it.
`,
});


const generateWorkoutFlow = ai.defineFlow(
  {
    name: 'generateWorkoutFlow',
    inputSchema: GenerateWorkoutInputSchema,
    outputSchema: GenerateWorkoutOutputSchema,
  },
  async input => {
    const { output } = await prompt(input);
    return output!;
  }
);
