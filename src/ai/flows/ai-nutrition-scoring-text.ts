'use server';

/**
 * @fileOverview This file defines a Genkit flow for analyzing meal descriptions (text) and providing a PCOS-friendly score.
 *
 * It includes:
 * - `analyzeMealText`: An exported function to initiate the meal analysis flow.
 * - `AnalyzeMealTextInput`: The input type for the analyzeMealText function, including the meal description.
 * - `AnalyzeMealTextOutput`: The output type, containing the PCOS-friendly score and dietary recommendations.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AnalyzeMealTextInputSchema = z.object({
  mealDescription: z
    .string()
    .describe(
      "A text description of a meal."
    ),
});
export type AnalyzeMealTextInput = z.infer<typeof AnalyzeMealTextInputSchema>;

const AnalyzeMealTextOutputSchema = z.object({
  pcosFriendlyScore: z
    .number()
    .describe(
      'A score (0-100) indicating how PCOS-friendly the meal is, considering insulin resistance.'
    ),
  dietaryRecommendations: z
    .string()
    .describe(
      'Dietary recommendations based on the meal analysis, tailored for PCOS management.'
    ),
});
export type AnalyzeMealTextOutput = z.infer<typeof AnalyzeMealTextOutputSchema>;

export async function analyzeMealText(
  input: AnalyzeMealTextInput
): Promise<AnalyzeMealTextOutput> {
  return analyzeMealTextFlow(input);
}

const analyzeMealTextPrompt = ai.definePrompt({
  name: 'analyzeMealTextPrompt',
  input: {schema: AnalyzeMealTextInputSchema},
  output: {schema: AnalyzeMealTextOutputSchema},
  prompt: `You are a registered dietitian specializing in PCOS (Polycystic Ovary Syndrome) and insulin resistance.

You will analyze a text description of a meal and provide a PCOS-friendly score (0-100) and dietary recommendations.
Consider the meal's impact on insulin resistance, blood sugar levels, and overall hormonal balance.

Meal Description: {{{mealDescription}}}

Based on the text description, determine the PCOS-friendly score and provide specific dietary recommendations.

Output the PCOS-friendly score and dietary recommendations. Be concise and specific with recommendations.
`,
});

const analyzeMealTextFlow = ai.defineFlow(
  {
    name: 'analyzeMealTextFlow',
    inputSchema: AnalyzeMealTextInputSchema,
    outputSchema: AnalyzeMealTextOutputSchema,
  },
  async input => {
    const {output} = await analyzeMealTextPrompt(input);
    return output!;
  }
);
