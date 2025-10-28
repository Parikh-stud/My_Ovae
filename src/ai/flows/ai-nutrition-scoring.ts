'use server';

/**
 * @fileOverview This file defines a Genkit flow for analyzing meal photos and providing a PCOS-friendly score.
 *
 * It includes:
 * - `analyzeMealPhoto`: An exported function to initiate the meal analysis flow.
 * - `AnalyzeMealPhotoInput`: The input type for the analyzeMealPhoto function, including the photo data URI.
 * - `AnalyzeMealPhotoOutput`: The output type, containing the PCOS-friendly score and dietary recommendations.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AnalyzeMealPhotoInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "A photo of a meal, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type AnalyzeMealPhotoInput = z.infer<typeof AnalyzeMealPhotoInputSchema>;

const AnalyzeMealPhotoOutputSchema = z.object({
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
export type AnalyzeMealPhotoOutput = z.infer<typeof AnalyzeMealPhotoOutputSchema>;

export async function analyzeMealPhoto(
  input: AnalyzeMealPhotoInput
): Promise<AnalyzeMealPhotoOutput> {
  return analyzeMealPhotoFlow(input);
}

const analyzeMealPhotoPrompt = ai.definePrompt({
  name: 'analyzeMealPhotoPrompt',
  input: {schema: AnalyzeMealPhotoInputSchema},
  output: {schema: AnalyzeMealPhotoOutputSchema},
  prompt: `You are a registered dietitian specializing in PCOS (Polycystic Ovary Syndrome) and insulin resistance.

You will analyze a photo of a meal and provide a PCOS-friendly score (0-100) and dietary recommendations.
Consider the meal's impact on insulin resistance, blood sugar levels, and overall hormonal balance.

Use the following photo as the primary source of information about the meal:

{{media url=photoDataUri}}

Based on the photo, determine the PCOS-friendly score and provide specific dietary recommendations.

Output the PCOS-friendly score and dietary recommendations. Be concise and specific with recommendations.
`,
});

const analyzeMealPhotoFlow = ai.defineFlow(
  {
    name: 'analyzeMealPhotoFlow',
    inputSchema: AnalyzeMealPhotoInputSchema,
    outputSchema: AnalyzeMealPhotoOutputSchema,
  },
  async input => {
    const {output} = await analyzeMealPhotoPrompt(input);
    return output!;
  }
);

    