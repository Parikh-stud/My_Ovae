
'use server';
/**
 * @fileOverview A flow for analyzing user lab results in the context of their other health data, including historical trends.
 *
 * - analyzeLabResults - A function that provides educational insights on lab results.
 * - LabResultAnalysisInput - The input type for the function.
 * - LabResultAnalysisOutput - The return type for the function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const LabResultSchema = z.object({
  id: z.string().optional(), // Keep optional for data that might not have it
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
  labResults: z.array(LabResultSchema).describe("An array of the user's lab results, sorted from most recent to oldest. The first item is the primary one to analyze."),
  symptomSummary: z.string().describe("A JSON string of the user's recently logged symptoms to provide context."),
  cycleSummary: z.string().describe("A summary of the user's menstrual cycle data, including average length and regularity."),
});
export type LabResultAnalysisInput = z.infer<typeof LabResultAnalysisInputSchema>;

const LabResultAnalysisOutputSchema = z.object({
  keyTakeaways: z.array(z.string()).describe('A bulleted list of 2-3 key, high-level takeaways from the most recent lab result.'),
  markerAnalysis: z.array(z.object({
    marker: z.string().describe('The name of the lab marker being analyzed.'),
    insight: z.string().describe('An educational insight explaining what this marker relates to in the context of PCOS and the user\'s other data.'),
  })).describe('A detailed breakdown for each significant marker in the most recent result.'),
  trendAnalysis: z.string().describe("An analysis of how the latest lab results compare to previous ones. Note any significant changes or trends. If only one result is provided, state that historical analysis isn't possible yet."),
  predictiveAlert: z.string().optional().describe('If a significant negative trend is detected (e.g., markers consistently worsening towards a clinical threshold like pre-diabetes), generate a single, non-diagnostic, educational alert. Example: "Your glucose levels are trending higher..." Otherwise, this should be null.'),
  personalizedGoals: z.array(z.string()).optional().describe('A list of 1-2 personalized, educational goals for the user to discuss with their doctor before their next test, based on the analysis. Example: "Discuss aiming for a fasting insulin level below 10..."'),
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
  - Lab Results (most recent is first): {{{json labResults}}}
  - Recent Symptoms: {{{symptomSummary}}}
  - Cycle Information: {{{cycleSummary}}}

  **Your Task:**
  1.  **Analyze Most Recent Result**: Your primary analysis (Key Takeaways, Marker Analysis) should be on the FIRST lab result in the array. Focus on markers common in PCOS (Testosterone, DHEA-S, Insulin, Glucose, LH/FSH). Explain what each marker is and its role.
  2.  **Correlate with Symptoms**: Gently point out potential connections between lab markers and the user's logged symptoms (e.g., "Elevated androgens in your latest test may be related to the acne...").
  3.  **Perform Trend Analysis**: If there's more than one lab result, compare the most recent to previous ones. Note significant trends (e.g., "Your Testosterone has decreased by 10%..."). If only one result is provided, your trend analysis should be: "This is your first lab result, so historical trend analysis is not yet available."
  4.  **Generate Predictive Alert**: Based on the trend analysis, if you spot a clear negative trend for a key metabolic or hormonal marker (like fasting glucose consistently rising towards 100 mg/dL), create a single, educational 'predictiveAlert'. It MUST be non-diagnostic. Good Example: "Your fasting glucose readings have been trending upward. This is an important pattern to discuss with your healthcare provider to proactively manage your metabolic health." Bad Example: "You are becoming pre-diabetic." If no clear negative trend exists, this field must be null.
  5.  **Generate Personalized Goals**: Based on the analysis, create 1-2 'personalizedGoals'. These should be framed as questions or topics for the user to discuss with their doctor. Good Example: "Discuss with your doctor if aiming for a fasting insulin level below 10 µIU/mL is an appropriate target for you." Bad Example: "You need to lower your insulin."
  6.  **CRITICAL - Disclaimer**: Your response MUST conclude with the following disclaimer, assigned to the 'disclaimer' field, exactly as written: "This is an educational insight, not a medical diagnosis. The analysis is based on general knowledge and may not be accurate for your specific health profile. Please discuss these results and any concerns with your qualified healthcare provider to get a formal interpretation and treatment plan."
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
