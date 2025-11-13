
'use server';

/**
 * @fileOverview A flow for suggesting structured symptom data from natural language text, with contextual understanding of user history.
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
  symptomHistory: z.string().optional().describe("A JSON string of the user's recently logged symptoms to provide context for phrases like 'same as yesterday' or to learn personal vocabulary."),
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
  prompt: `You are a helpful medical assistant for a PCOS tracking app. Your task is to analyze a user's text description of their symptoms and convert it into a structured list of symptom objects. You have access to their recent symptom history to understand context and personal vocabulary.

**Analyze the following user input:**
"{{{text}}}"

**Recent Symptom History (for context):**
{{{symptomHistory}}}

**Your Task:**
1.  **Parse the Text**: Identify each distinct symptom mentioned in the user input.
2.  **Contextual Understanding**:
    - If the user says "same as yesterday" or a similar phrase, look at the symptom history for the most recent day and suggest logging those same symptoms.
    - If the user uses personal slang (e.g., "my tummy hurts"), check if they've previously logged a formal symptom (like 'Abdominal Pain') with a similar description. If so, suggest the formal symptom.
3.  **Severity Inference**: Infer severity from adjectives. "Terrible" or "unbearable" is 5. "Bad" or "really sore" is 4. "Moderate" or no adjective is 3. "A little" or "slight" is 2. "Very mild" is 1.
4.  **Body Zone**: Determine the general area of the body affected. Use one of the following: 'Head', 'Face', 'Torso', 'Pelvis', 'General'.
5.  **Output**: Return an array of suggestion objects. If no clear symptoms are found, return an empty array.
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
