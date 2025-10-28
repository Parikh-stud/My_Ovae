
'use server';

/**
 * @fileOverview A flow for generating personalized coaching tips based on user data, with crisis detection.
 *
 * - generateCoachingTip - A function that generates a coaching tip or detects a crisis.
 * - CoachingTipInput - The input type for the generateCoachingTip function.
 * - CoachingTipOutput - The return type for the generateCoachingTip function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const CoachingTipInputSchema = z.object({
  pcosJourneyProgress: z.number().describe("The user's progress (day number) in the 90-day PCOS journey."),
  recentSymptoms: z.string().describe("A JSON string of the user's most recently logged symptoms."),
  cycleData: z.string().describe("Information about the user's current menstrual cycle, including day and phase."),
  nutritionData: z.string().describe("A JSON string of the user's recent meal logs."),
  fitnessData: z.string().describe("A JSON string of the user's recent workout activities."),
  labResultData: z.string().describe("A JSON string of the user's recent lab results."),
  userQuery: z.string().describe('The specific question or topic the user is asking about.')
});
export type CoachingTipInput = z.infer<typeof CoachingTipInputSchema>;

const CoachingTipOutputSchema = z.object({
  isEmergency: z.boolean().describe('Set to true if the user query indicates a mental health crisis OR a physical medical emergency.'),
  coachingTip: z.string().describe('A personalized coaching tip based on the user data. ONLY generate this if isEmergency is false. Your name is Ovie.'),
  emergencyResponse: z.string().describe('If isEmergency is true, provide a supportive message directing the user to professional help. Otherwise, this MUST be an empty string.')
});
export type CoachingTipOutput = z.infer<typeof CoachingTipOutputSchema>;

export async function generateCoachingTip(input: CoachingTipInput): Promise<CoachingTipOutput> {
  return generateCoachingTipFlow(input);
}

const prompt = ai.definePrompt({
  name: 'coachingTipPrompt',
  input: {schema: CoachingTipInputSchema},
  output: {schema: CoachingTipOutputSchema},
  prompt: `You are a helpful AI assistant for a PCOS wellness app. Your absolute first priority is to identify if a user is in crisis. This includes both mental health crises and acute physical medical emergencies.

Analyze the User's Query: "{{{userQuery}}}"

1.  **EMERGENCY CHECK (NON-NEGOTIABLE FIRST STEP)**: First, analyze the query for any language indicating a crisis.
    *   **Mental Health Crisis**: Look for talk of self-harm, suicide, extreme hopelessness, being in danger, or wanting to end things.
    *   **Physical Medical Emergency**: Look for descriptions of severe, acute symptoms like "bleeding vigorously," "unbearable pain," "can't breathe," "chest pain," or anything suggesting a life-threatening situation.
    *   If any emergency is detected: Set 'isEmergency' to true. Set 'emergencyResponse' to "It sounds like you are in a serious situation, and your safety is the top priority. Please use the buttons below to get immediate help. For medical emergencies, call 911. For mental health support, you can call or text 988." Do NOT generate a 'coachingTip'. The 'coachingTip' field must be an empty string.
    *   If no emergency is detected: Set 'isEmergency' to false and 'emergencyResponse' to an empty string. Then, and only then, proceed to step 2.

2.  **COACHING TIP GENERATION (Only if no emergency)**: You are a personalized PCOS wellness coach named Ovie. You are empathetic, knowledgeable, and motivating. Your goal is to provide an actionable, concise wellness tip (2-4 sentences).

Analyze the user's complete health snapshot below to generate a personalized coaching response to their query. Synthesize information from all data sources to find patterns or offer relevant advice.

CONTEXT:
- PCOS Journey: Day {{{pcosJourneyProgress}}}
- Cycle: {{{cycleData}}}
- Recent Symptoms: {{{recentSymptoms}}}
- Recent Meals: {{{nutritionData}}}
- Recent Workouts: {{{fitnessData}}}
- Recent Lab Results: {{{labResultData}}}

Your concise and empathetic response as Ovie for the 'coachingTip' field:`,
});

const generateCoachingTipFlow = ai.defineFlow(
  {
    name: 'generateCoachingTipFlow',
    inputSchema: CoachingTipInputSchema,
    outputSchema: CoachingTipOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
