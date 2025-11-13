
'use server';

/**
 * @fileOverview A flow for predicting key menstrual cycle events with AI analysis.
 *
 * - predictCycleEvents - A function that generates predictions for the next cycle.
 * - CyclePredictorInput - The input type for the function.
 * - CyclePredictorOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';

const CyclePredictorInputSchema = z.object({
  historicalCycleData: z.string().describe('A JSON string of the user\'s historical cycle data, including start dates and lengths.'),
  recentSymptomData: z.string().describe('A JSON string of symptoms logged in the past 2-3 weeks, which may signal an upcoming phase change (e.g., fatigue, cramps).'),
  recentMoodData: z.string().describe('A JSON string of mood logs from the past 2-3 weeks.'),
  recentNutritionData: z.string().describe('A JSON string of nutrition logs from the past 2-3 weeks, especially noting high-sugar or inflammatory meals.'),
});
export type CyclePredictorInput = z.infer<typeof CyclePredictorInputSchema>;

const CyclePredictorOutputSchema = z.object({
    nextPeriodStartDate: z.string().date().describe("The predicted start date of the next period window in 'YYYY-MM-DD' format."),
    nextPeriodEndDate: z.string().date().describe("The predicted end date of the next period window in 'YYYY-MM-DD' format."),
    fertileWindowStartDate: z.string().date().describe("The predicted start date of the fertile window in 'YYYY-MM-DD' format."),
    ovulationDate: z.string().date().describe("The predicted date of ovulation in 'YYYY-MM-DD' format."),
    reasoning: z.string().describe("A brief, data-driven explanation for the predictions, referencing cycle length averages and any influential symptom, mood, or nutrition data."),
    confidenceScore: z.number().min(0).max(100).describe("A confidence score (0-100) for the prediction, based on cycle regularity and data quality.")
});
export type CyclePredictorOutput = z.infer<typeof CyclePredictorOutputSchema>;

export async function predictCycleEvents(input: CyclePredictorInput): Promise<CyclePredictorOutput> {
  return cyclePredictorFlow(input);
}

const prompt = ai.definePrompt({
  name: 'cyclePredictorPrompt',
  input: {schema: CyclePredictorInputSchema},
  output: {schema: CyclePredictorOutputSchema},
  prompt: `You are a reproductive health expert AI specializing in PCOS. Your task is to predict the user's next menstrual cycle events based on their historical data and recent symptoms, mood, and nutrition. A key feature is predicting a date *range* for the next period, not a single day, to account for PCOS-related irregularity.

  **User's Data:**
  - Historical Cycles: {{{historicalCycleData}}}
  - Recent Symptoms: {{{recentSymptomData}}}
  - Recent Moods: {{{recentMoodData}}}
  - Recent Nutrition: {{{recentNutritionData}}}
  - Today's Date: ${new Date().toISOString().split('T')[0]}

  **Your Task:**
  1.  **Analyze Historical Data**: Analyze the historical cycle data to determine the user's average cycle length and degree of irregularity (standard deviation).
  2.  **Analyze Recent Contextual Data**: Review recent symptoms, moods, and nutrition. Look for patterns. Do PMS symptoms like fatigue or cramps appear? Are there significant mood shifts? Have there been more high-sugar meals logged, which can impact cycle regularity?
  3.  **Predict Next Period Range**:
      - Based on the last period's start date and the average cycle length, establish a baseline prediction.
      - Create a window (start and end date) around this baseline. The size of the window should depend on the cycle's historical irregularity. More irregular = wider window (e.g., 5-7 days). Very regular = narrower window (e.g., 2-3 days).
      - Adjust this window based on the contextual data. For example, if strong PMS symptoms were logged yesterday, the start date of the range might shift earlier.
  4.  **Predict Ovulation & Fertile Window**: Based on your predicted cycle length, calculate the estimated ovulation day (typically 14 days before the *start* of the predicted period range) and the start of the fertile window (typically 5 days before ovulation).
  5.  **Generate Reasoning**: Explain your logic in the 'reasoning' field. Mention the average cycle length, the irregularity, and how recent symptoms/moods/nutrition influenced your prediction range. Example: "Based on your average 35-day cycle, which varies by about 5 days, I'm predicting your next period between [Date] and [Date]. I've leaned towards the earlier side of this range because you've recently logged fatigue and mood swings, which often precede your cycle."
  6.  **Calculate Confidence Score**: Provide a confidence score based on the regularity of their cycles and the quality/quantity of contextual data. Very irregular cycles or sparse data = lower confidence (50-70%).
  `,
});

const cyclePredictorFlow = ai.defineFlow(
  {
    name: 'cyclePredictorFlow',
    inputSchema: CyclePredictorInputSchema,
    outputSchema: CyclePredictorOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);

