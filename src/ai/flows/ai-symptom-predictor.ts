'use server';

/**
 * @fileOverview A flow for predicting the likelihood of a symptom flare-up.
 *
 * - predictSymptomFlareUp - A function that generates a symptom prediction.
 * - SymptomPredictorInput - The input type for the function.
 * - SymptomPredictorOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SymptomPredictorInputSchema = z.object({
  historicalData: z.string().describe('A de-identified summary of the user\'s recent health data, including aggregated symptom trends over the last 7-14 days.'),
  targetSymptom: z.string().describe('The specific symptom for which a flare-up prediction is requested (e.g., "Fatigue", "Bloating").')
});
export type SymptomPredictorInput = z.infer<typeof SymptomPredictorInputSchema>;

const SymptomPredictorOutputSchema = z.object({
  riskScore: z.number().min(0).max(100).describe('A risk score (0-100) indicating the likelihood of the target symptom flaring up in the next 1-3 days.'),
  predictionReasoning: z.string().describe('A concise, data-driven explanation for the predicted risk score, referencing specific patterns in the historical data.'),
  preventativeAction: z.string().describe('A single, simple, and actionable tip the user can take to potentially mitigate the risk of the symptom flare-up.')
});
export type SymptomPredictorOutput = z.infer<typeof SymptomPredictorOutputSchema>;

export async function predictSymptomFlareUp(input: SymptomPredictorInput): Promise<SymptomPredictorOutput> {
  return symptomPredictorFlow(input);
}

const prompt = ai.definePrompt({
  name: 'symptomPredictorPrompt',
  input: {schema: SymptomPredictorInputSchema},
  output: {schema: SymptomPredictorOutputSchema},
  prompt: `You are a predictive health AI specializing in PCOS. Your task is to analyze a user's recent health data to predict the likelihood of a specific symptom flare-up in the next 1-3 days.

Analyze the provided historical data for patterns. Consider how recent diet, exercise, cycle phase, and other logged symptoms might influence the target symptom.

- Aggregated Historical Data: {{{historicalData}}}
- Symptom to Predict: {{{targetSymptom}}}

Based on your analysis, provide a risk score (0-100), a brief reasoning based on the data, and one simple preventative action. For example, if you see high-sugar meals and the target symptom is 'Fatigue', you might predict a higher risk and suggest balancing blood sugar.`,
});

const symptomPredictorFlow = ai.defineFlow(
  {
    name: 'symptomPredictorFlow',
    inputSchema: SymptomPredictorInputSchema,
    outputSchema: SymptomPredictorOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
