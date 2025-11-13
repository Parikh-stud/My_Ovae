
'use server';

/**
 * @fileOverview A flow for generating personalized coaching tips. It uses AI Tools to fetch specific user data on-demand.
 *
 * - generateCoachingTip - A function that generates a coaching tip or detects a crisis.
 * - CoachingTipInput - The input type for the generateCoachingTip function.
 * - CoachingTipOutput - The return type for the generateCoachingTip function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { getFirestore, collection, query, orderBy, limit } from 'firebase/firestore';
import { getDocs } from 'firebase/firestore';
import { initializeFirebase } from '@/firebase/config';

// Initialize Firebase Admin SDK
const db = getFirestore(initializeFirebase());

// Helper function to fetch data for a user
async function getUserData(userId: string, collectionName: string, count: number) {
    if (!userId) return [];
    try {
        const q = query(collection(db, 'users', userId, collectionName), orderBy('timestamp', 'desc'), limit(count));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (e) {
        // Return empty array if collection doesn't exist or on error
        return [];
    }
}


// --- AI Tools for Data Fetching ---

const getCycleDataTool = ai.defineTool(
    {
        name: 'getCycleData',
        description: "Get the user's menstrual cycle data, including current day and phase. Use this when the user's query relates to their period, cycle, or ovulation.",
        inputSchema: z.object({ userId: z.string() }),
        outputSchema: z.any(),
    },
    async ({ userId }) => getUserData(userId, 'cycles', 12)
);

const getSymptomDataTool = ai.defineTool(
    {
        name: 'getSymptomData',
        description: "Get the user's most recently logged symptoms. Use this for any query related to physical or mental feelings like fatigue, bloating, mood, or pain.",
        inputSchema: z.object({ userId: z.string() }),
        outputSchema: z.any(),
    },
    async ({ userId }) => getUserData(userId, 'symptomLogs', 20)
);

const getNutritionDataTool = ai.defineTool(
    {
        name: 'getNutritionData',
        description: "Get the user's recently logged meals. Use this for questions about diet, food, recipes, or nutrition scores.",
        inputSchema: z.object({ userId: z.string() }),
        outputSchema: z.any(),
    },
    async ({ userId }) => getUserData(userId, 'nutritionLogs', 20)
);

const getFitnessDataTool = ai.defineTool(
    {
        name: 'getFitnessData',
        description: "Get the user's recent workouts and physical activities. Use this for questions about exercise, rest days, or workout suggestions.",
        inputSchema: z.object({ userId: z.string() }),
        outputSchema: z.any(),
    },
    async ({ userId }) => getUserData(userId, 'fitnessActivities', 20)
);

const getLabResultDataTool = ai.defineTool(
    {
        name: 'getLabResultData',
        description: "Get the user's historical lab test results. Use this for queries specifically mentioning lab work, blood tests, or hormone levels.",
        inputSchema: z.object({ userId: z.string() }),
        outputSchema: z.any(),
    },
    async ({ userId }) => getUserData(userId, 'labResults', 5)
);


// --- Main Flow Types ---
const ConversationHistorySchema = z.array(
    z.object({
        userQuery: z.string(),
        aiResponse: z.string(),
        timestamp: z.string(),
    })
).optional();

const CoachingTipInputSchema = z.object({
  userId: z.string().describe("The user's unique ID."),
  userQuery: z.string().describe('The specific question or topic the user is asking about.'),
  userProfile: z.any().describe("The user's profile data, including wellnessGoal and pcosJourneyProgress."),
  conversationHistory: ConversationHistorySchema.describe("The last 10 turns of conversation history."),
});
export type CoachingTipInput = z.infer<typeof CoachingTipInputSchema>;

const CoachingTipOutputSchema = z.object({
  isEmergency: z.boolean().describe('Set to true if the user query indicates a mental health crisis OR a physical medical emergency.'),
  patternAnalysis: z.string().describe("A proactive insight or data trend Ovie noticed. Example: 'I noticed your energy levels dip on days you log high-sugar meals.' If no strong pattern is found, this can be a general encouragement. Generate this only if isEmergency is false."),
  coachingTip: z.string().describe('A personalized, actionable coaching tip based on the user data and patterns. Your name is Ovie. Generate this only if isEmergency is false.'),
  urgency: z.enum(['Immediate', 'This Week', 'Long-term']).describe("The urgency level of the coaching tip. Generate this only if isEmergency is false."),
  confidence: z.number().min(0).max(100).describe("A confidence score (0-100) for the recommendation. Generate this only if isEmergency is false."),
  emergencyResponse: z.string().describe('If isEmergency is true, provide a supportive message directing the user to professional help. Otherwise, this MUST be an empty string.'),
  suggestedFollowUps: z.array(z.string()).describe("An array of 2-3 short, relevant follow-up questions the user might want to ask. Generate these only if isEmergency is false. Examples: 'Tell me more.', 'Suggest a recipe.', 'How does this affect my cycle?'")
});
export type CoachingTipOutput = z.infer<typeof CoachingTipOutputSchema>;


// --- Flow Definition ---

export async function generateCoachingTip(input: CoachingTipInput): Promise<CoachingTipOutput> {
  return generateCoachingTipFlow(input);
}

const prompt = ai.definePrompt({
  name: 'coachingTipPrompt',
  tools: [getCycleDataTool, getSymptomDataTool, getNutritionDataTool, getFitnessDataTool, getLabResultDataTool],
  output: { schema: CoachingTipOutputSchema },
  prompt: `You are Ovie, a helpful AI assistant for a PCOS wellness app. Your two main jobs are to ensure user safety and provide insightful, data-driven coaching.

  **1. EMERGENCY CHECK (NON-NEGOTIABLE FIRST STEP)**: Analyze the User's Query: "{{{userQuery}}}" for any language indicating a crisis.
      *   **Crisis**: Look for self-harm, suicide, extreme hopelessness, being in danger, severe physical pain ("unbearable pain," "can't breathe").
      *   If a crisis is detected: Set 'isEmergency' to true. Set 'emergencyResponse' to "It sounds like you are in a serious situation, and your safety is the top priority. Please use the buttons below to get immediate help." Do NOT generate any other fields. They must be empty or defaults.
      *   If no crisis is detected: Proceed to step 2.

  **2. CONTEXT & MEMORY (Only if no emergency)**:
      *   Conversation History: {{{json conversationHistory}}}
      *   Review the history. If the current query is a follow-up, acknowledge it naturally (e.g., "Following up on our last chat..."). Avoid repeating advice. If you previously suggested something, you can ask, "I suggested X last time, how did that go for you?"

  **3. DATA-DRIVEN ANALYSIS & COACHING (Only if no emergency)**: You must use the provided tools to fetch relevant health data to answer the user's query and find patterns.
      *   **User Profile**:
          - Primary Wellness Goal: {{ userProfile.wellnessGoal }}
          - PCOS Journey: Day {{ userProfile.pcosJourneyProgress }}
      *   **Find a Pattern**: Based on all available data (from tools and profile), generate a 'patternAnalysis' insight. This is your "Ovie noticed..." moment. Find a correlation. Examples: "I noticed your logged fatigue often follows days with high-sugar meals." or "It seems your mood improves on days you complete a workout." If no strong pattern is obvious, provide a general encouragement related to their goal.
      *   **Generate Coaching Tip**: Create a 'coachingTip' (2-4 sentences) that is actionable and directly linked to the pattern you found and the user's main goal.
      *   **CRITICAL**: Your 'coachingTip' response MUST begin with the phrase "Based on your goal of [User's Goal]...". For example: "Based on your goal of Symptom Management..."
      *   **Set Urgency & Confidence**:
          -   \`urgency\`: Classify your tip as 'Immediate' (e.g., for severe symptoms), 'This Week' (for lifestyle adjustments), or 'Long-term' (for building habits).
          -   \`confidence\`: Provide a confidence score (0-100) for how strongly the data supports your recommendation.
      *   **Suggest Follow-ups**: Create 2-3 short, relevant 'suggestedFollowUps'.
  `,
});

const generateCoachingTipFlow = ai.defineFlow(
  {
    name: 'generateCoachingTipFlow',
    inputSchema: CoachingTipInputSchema,
    outputSchema: CoachingTipOutputSchema,
  },
  async input => {
    // Pass the user ID from the main input to the tool-calling prompt.
    // The prompt will then pass this ID to any tools it decides to call.
    const { output } = await prompt(input, {
        userId: input.userId
    });
    return output!;
  }
);
