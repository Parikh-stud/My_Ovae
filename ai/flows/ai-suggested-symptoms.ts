'use server';

/**
 * @fileOverview A flow for suggesting structured symptom data from natural language text.
 *
 * - suggestSymptomsFromText - A function that suggests symptoms.
 * - AISuggestSymptomsInput - The input type for the function.
 * - AISuggestSymptomsOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SymptomSuggestionSchema = z.object({
  symptomType: z.string().describe("The identified symptom name (e.g., 'Headache', 'Bloating', 'Fatigue')."),
  severity: z.number().min(1).max(5).describe('The estimated severity of the symptom on a scale of 1-5, inferred from the text.'),
  bodyZone: z.string().describe("The area of the body where the symptom is felt (e.g., 'Head', 'Abdomen', 'Pelvis')."),
});

const AISuggestSymptomsInputSchema = z.object({
  text: z.string().describe("The user's natural language description of their symptoms."),
});
export type AISuggestSymptomsInput = z.infer<typeof AISuggestSymptomsInputSchema>;

const AISuggestSymptomsOutputSchema = z.object({
  suggestions: z.array(SymptomSuggestionSchema).describe('An array of structured symptom suggestions based on the input text.'),
});
export type AISuggestSymptomsOutput = z.infer<typeof AISuggestSymptomsOutputSchema>;

export async function suggestSymptomsFromText(input: AISuggestSymptomsInput): Promise<AISuggestSymptomsOutput> {
  return suggestSymptomsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestSymptomsPrompt',
  input: {schema: AISuggestSymptomsInputSchema},
  output: {schema: AISuggestSymptomsOutputSchema},
  prompt: `You are a helpful medical assistant for a PCOS tracking app. Your task is to analyze a user's text description of their symptoms and convert it into a structured list of symptom objects.

Analyze the following user input:
"{{{text}}}"

From this text, identify each distinct symptom. For each symptom, determine:
1.  **symptomType**: A clear, concise name for the symptom (e.g., 'Headache', 'Bloating', 'Fatigue', 'Anxiety', 'Acne', 'Cramps').
2.  **severity**: An integer from 1 (very mild) to 5 (very severe). Infer this from adjectives like "terrible", "slight", "unbearable", "a little". If no severity is mentioned, default to 3.
3.  **bodyZone**: The general area of the body affected. Use one of the following: 'Head', 'Face', 'Torso', 'Pelvis', 'General'.

Return an array of suggestion objects. If no symptoms are found, return an empty array.
`,
});

const suggestSymptomsFlow = ai.defineFlow(
  {
    name: 'suggestSymptomsFlow',
    inputSchema: AISuggestSymptomsInputSchema,
    outputSchema: AISuggestSymptomsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
