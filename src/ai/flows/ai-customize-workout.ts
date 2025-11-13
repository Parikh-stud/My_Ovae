
'use server';
/**
 * @fileOverview A flow for customizing a previously generated workout, considering available equipment.
 *
 * - customizeWorkout - A function that takes a workout and a user request to modify it.
 * - CustomizeWorkoutInput - The input type for the function.
 * - CustomizeWorkoutOutput - The return type for the function (which is the same as a generated workout).
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { GenerateWorkoutOutputSchema } from './types/workout-types';
import type { GenerateWorkoutOutput } from './types/workout-types';


const CustomizeWorkoutInputSchema = z.object({
  originalWorkout: GenerateWorkoutOutputSchema.describe("The original workout plan that needs to be modified."),
  customizationRequest: z.string().describe("The user's natural language request for how to change the workout. For example: 'make it shorter', 'I don't have dumbbells', or 'replace squats with something easier on the knees'."),
  equipment: z.array(z.string()).optional().describe("A list of fitness equipment the user has available. This is a crucial constraint."),
});

export type CustomizeWorkoutInput = z.infer<typeof CustomizeWorkoutInputSchema>;
export type CustomizeWorkoutOutput = GenerateWorkoutOutput;

export async function customizeWorkout(input: CustomizeWorkoutInput): Promise<CustomizeWorkoutOutput> {
  return customizeWorkoutFlow(input);
}

const prompt = ai.definePrompt({
  name: 'customizeWorkoutPrompt',
  input: { schema: CustomizeWorkoutInputSchema },
  output: { schema: GenerateWorkoutOutputSchema },
  prompt: `You are an expert fitness coach specializing in PCOS. A user has an existing workout plan and has requested a modification.

Analyze the original workout plan, the user's request, and their available equipment. Then, generate a NEW, complete workout plan that incorporates their changes under these constraints.

- **Equipment Constraint**: CRITICAL - The new plan MUST only use exercises possible with the 'Available Equipment'. If the list is empty, only suggest bodyweight exercises.
- The new plan must still be a complete workout (warm-up, exercises, cool-down).
- The new plan should reflect the user's request, such as adjusting duration, swapping exercises, or changing equipment needs.
- Maintain the same structure and data format as the original workout.

Original Workout:
\`\`\`json
{{{json originalWorkout}}}
\`\`\`

User's Customization Request:
"{{{customizationRequest}}}"

Available Equipment:
{{#if equipment}}{{{json equipment}}}{{else}}None (Bodyweight only){{/if}}

Now, generate the new, modified workout plan.
`,
});


const customizeWorkoutFlow = ai.defineFlow(
  {
    name: 'customizeWorkoutFlow',
    inputSchema: CustomizeWorkoutInputSchema,
    outputSchema: GenerateWorkoutOutputSchema,
  },
  async input => {
    const { output } = await prompt(input);
    return output!;
  }
);
