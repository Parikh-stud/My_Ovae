
'use server';

/**
 * @fileOverview A flow for identifying a user's potential PCOS subtype drivers with percentage-based analysis.
 *
 * - identifyPcosSubtype - A function that analyzes user data to suggest PCOS driver scores.
 * - PcosSubtypeInput - The input type for the function.
 * - PcosSubtypeOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const PcosSubtypeInputSchema = z.object({
  symptomSummary: z.string().describe("A JSON string of the user's key PCOS-related symptoms, such as 'irregular periods', 'acne', 'hirsutism', 'weight gain', 'hair loss', 'fatigue'."),
  cycleSummary: z.string().describe("A summary of the user's menstrual cycle data, including average length and regularity (e.g., 'Cycles are irregular, averaging 45-60 days.')."),
  labResultSummary: z.string().describe("A JSON string of the user's most recent lab results, focusing on key markers like Testosterone, DHEA-S, LH, FSH, and Insulin."),
});
export type PcosSubtypeInput = z.infer<typeof PcosSubtypeInputSchema>;

const PcosSubtypeOutputSchema = z.object({
    confidenceScore: z.number().min(0).max(100).describe("A confidence score (0-100) for the overall analysis, based on the quality of input data."),
    phenotypeScores: z.object({
        insulinResistance: z.number().min(0).max(100).describe('A score (0-100) indicating the likelihood of insulin resistance being a primary driver, based on symptoms like weight gain, sugar cravings, and high insulin/glucose labs.'),
        inflammation: z.number().min(0).max(100).describe('A score (0-100) indicating the likelihood of chronic inflammation being a primary driver, based on symptoms like fatigue, joint pain, skin issues (eczema), and digestive problems.'),
        adrenal: z.number().min(0).max(100).describe('A score (0-100) indicating the likelihood of adrenal dysfunction being a primary driver, based on high DHEA-S labs and stress-related symptoms.'),
        hormonalImbalance: z.number().min(0).max(100).describe('A score (0-100) indicating the likelihood of foundational hormonal imbalance (e.g., LH/FSH ratio) being a primary driver, based on cycle irregularity and specific hormone labs.')
    }).describe('An object containing independent scores for the four main PCOS phenotype drivers.'),
    explanation: z.string().describe('A detailed, user-friendly explanation of the primary driver.'),
    supplementSuggestions: z.array(z.object({
        name: z.string(),
        reason: z.string().describe("Educational reason why this supplement may be discussed with a doctor for the primary driver.")
    })).describe("A list of 2-3 supplement ideas for educational purposes, to be discussed with a healthcare provider."),
    disclaimer: z.string().describe('A non-negotiable disclaimer stating this is not a medical diagnosis and supplements should be discussed with a healthcare professional.')
});

export type PcosSubtypeOutput = z.infer<typeof PcosSubtypeOutputSchema>;

export async function identifyPcosSubtype(input: PcosSubtypeInput): Promise<PcosSubtypeOutput> {
  return pcosSubtypeIdentifierFlow(input);
}

const prompt = ai.definePrompt({
  name: 'pcosSubtypePrompt',
  input: {schema: PcosSubtypeInputSchema},
  output: {schema: PcosSubtypeOutputSchema},
  prompt: `You are an expert PCOS health educator AI. Your task is to analyze user data and provide an analysis of their potential PCOS phenotype drivers.

  **User Data:**
  - Symptoms: {{{symptomSummary}}}
  - Cycle Data: {{{cycleSummary}}}
  - Lab Results: {{{labResultSummary}}}

  **Your Task:**
  1.  **Analyze and Score Independently**: Analyze the user data and assign four independent scores from 0 to 100 for each of the PCOS drivers: \`insulinResistance\`, \`inflammation\`, \`adrenal\`, and \`hormonalImbalance\`. These are NOT a distribution; they are separate scores. For example, a user could score high on both insulin resistance and inflammation.
      - **Insulin-Resistant Driver**: Look for high insulin labs, weight gain, sugar cravings.
      - **Inflammatory Driver**: Look for unexplained fatigue, joint pain, skin issues (eczema), digestive problems (IBS).
      - **Adrenal Driver**: Look for high DHEA-S labs, high stress, anxiety.
      - **Hormonal Imbalance Driver**: Look for irregular cycles, high LH/FSH ratio.
  2.  **Identify Primary Driver**: Determine which of the four scores is highest. This is the primary driver.
  3.  **Generate Explanation**: Based on the primary driver, write a detailed, user-friendly \`explanation\` of what this driver means.
  4.  **Generate Supplement Suggestions**: For the primary driver, suggest 2-3 supplements for **educational purposes only**. For each, provide a brief, evidence-based reason why it might be considered. **CRITICAL**: Frame these as topics for discussion with a doctor, not as prescriptions. Example: "Inositol - May help improve insulin sensitivity."
  5.  **Confidence Score**: Based on the completeness and clarity of the provided data, calculate a \`confidenceScore\` (0-100) for your overall analysis. More data (especially labs) means higher confidence.
  6.  **CRITICAL Disclaimer**: Your response MUST conclude with the following disclaimer, assigned to the 'disclaimer' field, exactly as written: "This is an educational insight, not a medical diagnosis. Please discuss these findings and any potential supplements with a qualified healthcare professional to confirm your PCOS subtype and create a formal treatment plan."
  `,
});

const pcosSubtypeIdentifierFlow = ai.defineFlow(
  {
    name: 'pcosSubtypeIdentifierFlow',
    inputSchema: PcosSubtypeInputSchema,
    outputSchema: PcosSubtypeOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
