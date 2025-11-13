
'use server';
import { config } from 'dotenv';
config();

import '@/ai/flows/ai-nutrition-scoring.ts';
import '@/ai/flows/ai-generated-coaching.ts';
import '@/ai/flows/community-content-moderation.ts';
import '@/ai/flows/ai-symptom-predictor.ts';
import '@/ai/flows/ai-pcos-subtype-identifier.ts';
import '@/ai/flows/ai-suggested-symptoms.ts';
import '@/ai/flows/ai-rest-day-recommender.ts';
import '@/ai/flows/ai-generate-workout.ts';
import '@/ai/flows/ai-lab-result-analyzer.ts';
import '@/ai/flows/ai-customize-workout.ts';
import '@/ai/flows/ai-workout-effectiveness-scorer.ts';
import '@/ai/flows/ai-cycle-predictor.ts';
import '@/ai/flows/tools/get-health-summary.ts';
