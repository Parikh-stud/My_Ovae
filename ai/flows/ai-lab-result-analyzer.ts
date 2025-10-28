
'use server';
/**
 * @fileOverview A flow for analyzing user lab results in the context of their other health data.
 *
 * - analyzeLabResults - A function that provides educational insights on lab results.
 * - LabResultAnalysisInput - The input type for the function.
 * - LabResultAnalysisOutput - The return type for the function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const LabResultSchema = z.object({
  testType: z.string(),
  testDate: z.string(),
  results: z.array(z.object({
    marker: z.string(),
    value: z.string(),
    unit: z.string(),
    normalRange: z.string().optional(),
  })),
});

const LabResultAnalysisInputSchema = z.object({
  labResult: LabResultSchema.describe("The specific lab result to be analyzed."),
  symptomSummary: z.string().describe("A JSON string of the user's recently logged symptoms to provide context."),
  cycleSummary: z.string().describe("A summary of the user's menstrual cycle data, including average length and regularity."),
});
export type LabResultAnalysisInput = z.infer<typeof LabResultAnalysisInputSchema>;

const LabResultAnalysisOutputSchema = z.object({
  keyTakeaways: z.array(z.string()).describe('A bulleted list of 2-3 key, high-level takeaways from the lab results.'),
  markerAnalysis: z.array(z.object({
    marker: z.string().describe('The name of the lab marker being analyzed.'),
    insight: z.string().describe('An educational insight explaining what this marker relates to in the context of PCOS and the user\'s other data.'),
  })).describe('A detailed breakdown for each significant marker.'),
  disclaimer: z.string().describe('A non-negotiable disclaimer stating this is not a medical diagnosis and should be discussed with a healthcare professional.')
});
export type LabResultAnalysisOutput = z.infer<typeof LabResultAnalysisOutputSchema>;

export async function analyzeLabResults(input: LabResultAnalysisInput): Promise<LabResultAnalysisOutput> {
  return labResultAnalyzerFlow(input);
}

const prompt = ai.definePrompt({
  name: 'labResultAnalyzerPrompt',
  input: { schema: LabResultAnalysisInputSchema },
  output: { schema: LabResultAnalysisOutputSchema },
  prompt: `You are a helpful PCOS health educator AI. Your task is to analyze a user's lab results in the context of their symptoms and cycle data to provide educational insights. You are NOT a doctor and must not provide a diagnosis.

  **User's Health Snapshot:**
  - Lab Results: {{{json labResult}}}
  - Recent Symptoms: {{{symptomSummary}}}
  - Cycle Information: {{{cycleSummary}}}

  **Your Task:**
  1.  **Analyze Key Markers**: Focus on markers commonly associated with PCOS (e.g., Testosterone, DHEA-S, Androstenedione, LH, FSH, Insulin, Glucose).
  2.  **Provide Educational Context**: For each key marker, explain what it is and its general role in the body, especially concerning PCOS. For example, if Testosterone is present, explain it's an androgen and how it can relate to symptoms like hirsutism or acne.
  3.  **Identify Patterns (If Any)**: Gently point out potential connections. For example: "The lab results show elevated androgens, which may be related to the acne and irregular cycles you've logged."
  4.  **Generate Key Takeaways**: Summarize the most important educational points in a simple, easy-to-understand list.
  5.  **CRITICAL - Disclaimer**: Your response MUST conclude with the following disclaimer, assigned to the 'disclaimer' field, exactly as written: "This is an educational insight, not a medical diagnosis. The analysis is based on general knowledge and may not be accurate for your specific health profile. Please discuss these results and any concerns with your qualified healthcare provider to get a formal interpretation and treatment plan."
  `,
});

const labResultAnalyzerFlow = ai.defineFlow(
  {
    name: 'labResultAnalyzerFlow',
    inputSchema: LabResultAnalysisInputSchema,
    outputSchema: LabResultAnalysisOutputSchema,
  },
  async input => {
    const { output } = await prompt(input);
    return output!;
  }
);
