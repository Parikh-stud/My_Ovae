'use server';
/**
 * @fileOverview A community content moderation AI agent.
 *
 * - moderateContent - A function that handles the content moderation process.
 * - ModerateContentInput - The input type for the moderateContent function.
 * - ModerateContentOutput - The return type for the moderateContent function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ModerateContentInputSchema = z.object({
  text: z.string().describe('The content to be moderated.'),
});
export type ModerateContentInput = z.infer<typeof ModerateContentInputSchema>;

const ModerateContentOutputSchema = z.object({
  isSafe: z.boolean().describe('Whether the content is safe or not.'),
  reason: z.string().describe('The reason why the content is unsafe, if applicable. Be brief and clear.'),
});
export type ModerateContentOutput = z.infer<typeof ModerateContentOutputSchema>;

export async function moderateContent(input: ModerateContentInput): Promise<ModerateContentOutput> {
  return moderateContentFlow(input);
}

const prompt = ai.definePrompt({
  name: 'moderateContentPrompt',
  input: {schema: ModerateContentInputSchema},
  output: {schema: ModerateContentOutputSchema},
  prompt: `You are an AI content moderator for a PCOS (Polycystic Ovary Syndrome) support community. Your primary goal is to maintain a safe, supportive, and respectful environment.

You must differentiate between clinical/medical discussion and genuinely harmful content.

**Analyze the following text:**
"{{{text}}}"

**Moderation Rules:**
1.  **SAFE Content**:
    -   Discussion of symptoms, medical treatments, fertility, body image in a supportive context.
    -   Sharing personal experiences, successes, or frustrations about PCOS.
    -   Asking for advice or support from the community.
    -   Using correct medical terms, even if they seem sensitive (e.g., "hirsutism", "acne", "menstruation").

2.  **UNSAFE Content (Set isSafe: false and provide a brief reason):**
    -   **Hate Speech/Harassment**: Personal attacks, bullying, or discrimination against any user or group. Reason: "Harassment"
    -   **Dangerous Medical Misinformation**: Promoting unverified or dangerous "cures" or discouraging proven medical treatments. Reason: "Medical Misinformation"
    -   **Explicit Content**: Sexually explicit or graphically violent content. Reason: "Explicit Content"
    -   **Spam/Scams**: Selling products, promoting external services, or posting spam links. Reason: "Spam/Commercial Content"

**Your Task:**
Based on the rules, determine if the text is safe. If it is unsafe, provide the corresponding brief reason.
`,
});

const moderateContentFlow = ai.defineFlow(
  {
    name: 'moderateContentFlow',
    inputSchema: ModerateContentInputSchema,
    outputSchema: ModerateContentOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
