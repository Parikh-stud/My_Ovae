
'use server';

/**
 * @fileOverview This file defines a Genkit flow for analyzing meal photos and providing a PCOS-friendly score,
 *               macronutrient estimates, and ingredient-level feedback.
 *
 * It includes:
 * - `analyzeMealPhoto`: An exported function to initiate the meal analysis flow.
 * - `AnalyzeMealPhotoInput`: The input type for the analyzeMealPhoto function, including the photo data URI.
 * - `AnalyzeMealPhotoOutput`: The output type, containing the score, recommendations, macros, and ingredient analysis.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { getHealthSummaryForUser } from './tools/get-health-summary';

const AnalyzeMealPhotoInputSchema = z.object({
  userId: z.string().optional().describe("The user's unique ID, required to fetch health summary."),
  photoDataUri: z
    .string()
    .describe(
      "A photo of a meal, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  prompt: z.string().optional().describe("An optional text prompt to guide the analysis, for when text is provided instead of a meaningful image.")
});
export type AnalyzeMealPhotoInput = z.infer<typeof AnalyzeMealPhotoInputSchema>;


const IngredientAnalysisSchema = z.object({
    name: z.string().describe("The name of the identified ingredient."),
    verdict: z.enum(["Good", "Okay", "Avoid"]).describe("A verdict on how PCOS-friendly the ingredient is."),
    reason: z.string().describe("A brief reason for the verdict, explaining its impact on PCOS."),
    suggestedSwap: z.string().optional().describe("If the verdict is 'Avoid', suggest a simple, healthy swap (e.g., 'Try cauliflower rice').")
});

const AnalyzeMealPhotoOutputSchema = z.object({
  pcosFriendlyScore: z
    .number()
    .describe(
      'A score (0-100) indicating how PCOS-friendly the meal is, considering insulin resistance.'
    ),
  scoreConfidence: z.number().describe("The confidence interval for the main score, e.g., a value of 5 means the score is ±5 points."),
  subScores: z.object({
      glycemicImpact: z.number().describe("A score (0-100) for the meal's likely impact on blood sugar."),
      inflammationScore: z.number().describe("A score (0-100) indicating the meal's inflammatory or anti-inflammatory potential."),
      hormoneBalance: z.number().describe("A score (0-100) for how well the meal supports hormonal balance."),
  }).describe("A breakdown of the score into key PCOS-related categories."),
  dietaryRecommendations: z
    .string()
    .describe(
      'General dietary recommendations based on the meal analysis, tailored for PCOS management.'
    ),
  proteinGrams: z.number().describe("Estimated grams of protein in the meal."),
  carbGrams: z.number().describe("Estimated grams of carbohydrates in the meal."),
  fatGrams: z.number().describe("Estimated grams of fat in the meal."),
  fiberGrams: z.number().describe("Estimated grams of fiber in the meal."),
  sugarGrams: z.number().describe("Estimated grams of sugar in the meal."),
  micronutrientAnalysis: z.string().describe("A brief analysis of key micronutrients (like Zinc, Magnesium, B-vitamins) likely present in the meal and their relevance to PCOS."),
  ingredientAnalysis: z.array(IngredientAnalysisSchema).describe("A breakdown of the key ingredients and their PCOS friendliness."),
});
export type AnalyzeMealPhotoOutput = z.infer<typeof AnalyzeMealPhotoOutputSchema>;

export async function analyzeMealPhoto(
  input: AnalyzeMealPhotoInput
): Promise<AnalyzeMealPhotoOutput> {
  return analyzeMealPhotoFlow(input);
}

const analyzeMealPhotoPrompt = ai.definePrompt({
  name: 'analyzeMealPhotoPrompt',
  tools: [getHealthSummaryForUser],
  input: {schema: AnalyzeMealPhotoInputSchema},
  output: {schema: AnalyzeMealPhotoOutputSchema},
  prompt: `You are a registered dietitian specializing in PCOS (Polycystic Ovary Syndrome) and insulin resistance.

You will analyze a meal and provide a comprehensive breakdown. First, use the 'getHealthSummaryForUser' tool to understand the user's current context (cycle phase, recent symptoms, etc.). This context is critical. Then, analyze the meal itself.

{{#if prompt}}
Meal Description (from text): {{{prompt}}}
{{/if}}

Use the following photo as a visual reference if no text prompt is provided:
{{media url=photoDataUri}}

**Your Task:**
1.  **Contextual Analysis**: Use the health summary. If the user is in their Luteal phase and has logged "cramps", suggest magnesium-rich foods like leafy greens. If their stress symptoms are high, recommend anti-inflammatory ingredients.
2.  **Identify Key Ingredients**: List the main components of the meal.
3.  **Estimate Macronutrients**: Provide an estimate for protein, carbohydrates, fat, fiber, and sugar in grams.
4.  **Calculate PCOS-Friendly Score**: Give a main score from 0-100 based on the meal's overall impact on insulin resistance, blood sugar, and hormonal balance. Also provide a 'scoreConfidence' value (typically between 3 and 8) representing the plus/minus range of your score estimate.
5.  **Calculate Sub-Scores**: Provide three sub-scores (0-100) for:
    - 'glycemicImpact': How much the meal will likely spike blood sugar. Lower is better.
    - 'inflammationScore': The meal's anti-inflammatory potential. Higher is better.
    - 'hormoneBalance': How well the ingredients support hormonal health. Higher is better.
6.  **Perform Ingredient Analysis**: For each key ingredient, provide:
    - A verdict ('Good', 'Okay', 'Avoid').
    - A brief reason.
    - If the verdict is 'Avoid', provide a 'suggestedSwap' with a healthier alternative (e.g., for "White Rice", suggest "Try cauliflower rice").
7.  **Analyze Micronutrients**: Provide a brief 'micronutrientAnalysis' text, highlighting 1-2 key vitamins or minerals likely in the meal (e.g., Zinc, Magnesium, B-vitamins) and their importance for PCOS.
8.  **Provide General Recommendations**: Offer a concise, overall summary and recommendation for this type of meal in the 'dietaryRecommendations' field. This should incorporate the contextual analysis (e.g., "This meal is good for your current follicular phase, but consider adding a source of magnesium like spinach to help with your logged fatigue...").

Now, perform the full analysis.
`,
});

const analyzeMealPhotoFlow = ai.defineFlow(
  {
    name: 'analyzeMealPhotoFlow',
    inputSchema: AnalyzeMealPhotoInputSchema,
    outputSchema: AnalyzeMealPhotoOutputSchema,
  },
  async input => {
    // Make sure to pass the userId to the prompt so it can be used by the tool.
    const {output} = await analyzeMealPhotoPrompt(input, {
      userId: input.userId
    });
    return output!;
  }
);
