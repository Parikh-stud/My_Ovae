
'use server';

/**
 * @fileOverview A flow for predicting the likelihood of a symptom flare-up with correlation analysis.
 *
 * - predictSymptomFlareUp - A function that generates a symptom prediction.
 * - SymptomPredictorInput - The input type for the function.
 * - SymptomPredictorOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SymptomPredictorInputSchema = z.object({
  historicalData: z.string().describe('A JSON string of the user\'s recent health data, including symptoms logs, cycle phase, meals, and workouts.'),
  targetSymptom: z.string().describe('The specific symptom for which a flare-up prediction is requested (e.g., "Fatigue", "Bloating").')
});
export type SymptomPredictorInput = z.infer<typeof SymptomPredictorInputSchema>;

const DailyForecastSchema = z.object({
    day: z.string().describe("The day of the week (e.g., 'Mon', 'Tue')."),
    riskScore: z.number().min(0).max(100).describe('A risk score (0-100) for this specific day.'),
    confidenceBand: z.number().describe('The plus-or-minus value for the risk score, e.g., a value of 5 means the score is score ±5.'),
});

const SymptomPredictorOutputSchema = z.object({
  dailyForecast: z.array(DailyForecastSchema).length(7).describe("A 7-day forecast, with each day having its own risk score and confidence band."),
  correlatedSymptoms: z.array(z.string()).describe('A list of other symptoms that appear to be correlated with the target symptom based on historical data.'),
  predictionReasoning: z.string().describe('A concise, data-driven explanation for the overall weekly forecast, referencing specific patterns and the top 3 contributing factors in the historical data.'),
  preventativeAction: z.string().describe('A single, simple, and actionable tip the user can take to potentially mitigate the risk of the symptom flare-up.'),
  confidenceScore: z.number().min(0).max(100).describe("A confidence score (0-100) for how strongly the data supports the overall prediction for the week.")
});
export type SymptomPredictorOutput = z.infer<typeof SymptomPredictorOutputSchema>;

export async function predictSymptomFlareUp(input: SymptomPredictorInput): Promise<SymptomPredictorOutput> {
  return symptomPredictorFlow(input);
}

const prompt = ai.definePrompt({
  name: 'symptomPredictorPrompt',
  input: {schema: SymptomPredictorInputSchema},
  output: {schema: SymptomPredictorOutputSchema},
  prompt: `You are a predictive health AI specializing in PCOS. Your task is to analyze a user's recent health data to create a 7-day forecast for a specific symptom flare-up.

Analyze the provided historical data for patterns. Consider how recent diet, exercise, cycle phase, and other logged symptoms might influence the target symptom over the next week.

- Historical Data: {{{historicalData}}}
- Symptom to Predict: {{{targetSymptom}}}

Based on your analysis, you must generate a complete 7-day forecast:
1.  **dailyForecast**: Create an array of 7 objects. For each day (e.g., 'Mon', 'Tue', 'Wed', ...):
    -   Provide a 'riskScore' (0-100) for the flare-up on that specific day.
    -   Provide a 'confidenceBand' (a plus-or-minus value like 5, 8, 10) representing the confidence interval for that day's score. Higher confidence means a smaller band.
2.  **correlatedSymptoms**: Identify 1-3 other symptoms from the data that frequently appear alongside the target symptom. If none, return an empty array.
3.  **predictionReasoning**: Explain your reasoning for the overall weekly trend by explicitly listing the top 1-3 contributing factors from the data. Examples: "The high risk early in the week is mainly due to: 1) a high-sugar meal logged yesterday, 2) being in the late luteal phase..."
4.  **preventativeAction**: Suggest one simple, actionable preventative tip directly related to the top contributing factors you identified for the week.
5.  **confidenceScore**: Provide an overall confidence score (0-100) for the entire weekly prediction based on the quality and quantity of the data provided.
`,
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
