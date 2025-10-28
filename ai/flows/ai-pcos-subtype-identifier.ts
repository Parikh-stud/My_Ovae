
'use server';

/**
 * @fileOverview A flow for identifying a user's potential PCOS subtype.
 *
 * - identifyPcosSubtype - A function that analyzes user data to suggest a PCOS subtype.
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
  pcosSubtype: z.enum(['Insulin-Resistant', 'Inflammatory', 'Post-Pill', 'Adrenal', 'Uncertain']).describe('The identified PCOS subtype.'),
  subtypeDescription: z.string().describe('A detailed, user-friendly explanation of the identified subtype and its primary drivers.'),
  recommendations: z.string().describe('3-4 actionable, high-level recommendations for managing this specific PCOS subtype (e.g., dietary focus, exercise type, stress management).'),
  disclaimer: z.string().describe('A non-negotiable disclaimer stating this is not a medical diagnosis and should be discussed with a healthcare professional.')
});
export type PcosSubtypeOutput = z.infer<typeof PcosSubtypeOutputSchema>;

export async function identifyPcosSubtype(input: PcosSubtypeInput): Promise<PcosSubtypeOutput> {
  return pcosSubtypeIdentifierFlow(input);
}

const prompt = ai.definePrompt({
  name: 'pcosSubtypePrompt',
  input: {schema: PcosSubtypeInputSchema},
  output: {schema: PcosSubtypeOutputSchema},
  prompt: `You are a helpful PCOS health educator AI. Your task is to analyze user-provided data and suggest a potential PCOS subtype.

  Here are the primary PCOS subtypes:
  1.  **Insulin-Resistant PCOS**: The most common type. Characterized by high insulin levels. Key symptoms often include weight gain (especially around the midsection), intense sugar cravings, fatigue after meals, and skin darkening (acanthosis nigricans). Lab results might show elevated insulin or glucose.
  2.  **Inflammatory PCOS**: Driven by chronic inflammation. Besides classic PCOS symptoms, it can involve issues like unexplained fatigue, joint pain, skin conditions (eczema, psoriasis), headaches, and digestive problems (like IBS).
  3.  **Post-Pill PCOS**: A temporary form that arises after discontinuing hormonal birth control, which was suppressing ovulation. There's often a surge in androgen symptoms like acne as the body recalibrates. It typically resolves within 6-12 months.
  4.  **Adrenal PCOS**: A less common type related to an abnormal stress response, not high insulin or inflammation. Often triggered by chronic stress. Key indicators are high levels of DHEA-S (an adrenal androgen) but normal testosterone and insulin. Often presents with fatigue and anxiety.

  Analyze the following user data. Use the lab results as a strong signal if available.
  - Symptoms: {{{symptomSummary}}}
  - Cycle Data: {{{cycleSummary}}}
  - Lab Results: {{{labResultSummary}}}

  Based on the data, determine the most likely PCOS subtype.
  - If lab results show high androgens (Testosterone, DHEA-S), lean towards Adrenal or Insulin-Resistant.
  - If lab results show high insulin, lean towards Insulin-Resistant.
  - If data is insufficient or points to multiple types, classify as 'Uncertain' and explain why.
  - Provide a clear, empathetic description of the subtype.
  - Offer 3-4 high-level, actionable recommendations for management.
  - **CRITICAL**: Always include the following disclaimer verbatim in the 'disclaimer' field: "This is an educational insight, not a medical diagnosis. Please discuss these findings with a qualified healthcare professional to confirm your PCOS subtype and create a formal treatment plan."
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
