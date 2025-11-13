
import { z } from 'genkit';

const ExerciseSchema = z.object({
    name: z.string().describe('The name of the exercise.'),
    sets: z.string().describe('The number of sets to perform (e.g., "3 sets").'),
    reps: z.string().describe('The number of repetitions or duration (e.g., "10-12 reps" or "30 seconds").'),
    description: z.string().describe('A brief description of how to perform the exercise.'),
});

export const GenerateWorkoutOutputSchema = z.object({
  difficultyAnalysis: z.string().describe("An explanation of how this workout's difficulty compares to previous ones, explaining the progressive overload."),
  workoutName: z.string().describe('A creative and motivating name for the workout.'),
  warmup: z.string().describe('A description of the warm-up routine.'),
  exercises: z.array(ExerciseSchema).describe('An array of exercises for the main workout.'),
  cooldown: z.string().describe('A description of the cool-down routine.'),
});

export type GenerateWorkoutOutput = z.infer<typeof GenerateWorkoutOutputSchema>;

export const GenerateWorkoutInputSchema = z.object({
    userId: z.string().describe("The user's unique ID, needed to fetch their health summary."),
    workoutGoal: z.enum(['hormone-balance', 'insulin-resistance', 'stress-relief', 'general-wellness']).describe("The user's primary goal for the workout."),
    equipment: z.array(z.string()).optional().describe("A list of fitness equipment the user has available, such as 'dumbbells' or 'yoga mat'."),
    workoutHistory: z.string().optional().describe("A JSON string of the user's last 3-5 workouts of a similar type to inform progressive overload."),
});

export type GenerateWorkoutInput = z.infer<typeof GenerateWorkoutInputSchema>;


export const RecoveryRecommenderInputSchema = z.object({
  healthSnapshot: z.string().describe("A JSON string of the user's recent health data, including fitness activities from the last 7 days, recent symptom logs (especially fatigue), and daily check-ins (mood, energy)."),
  cyclePhase: z.enum(['menstrual', 'follicular', 'ovulation', 'luteal', 'unknown']).describe("The user's current menstrual cycle phase."),
});
export type RecoveryRecommenderInput = z.infer<typeof RecoveryRecommenderInputSchema>;

export const RecoveryRecommenderOutputSchema = z.object({
  recoveryScore: z.number().min(0).max(100).describe('A score (0-100) indicating the user\'s estimated recovery level.'),
  recommendation: z.enum(['Workout', 'Active Recovery', 'Rest']).describe("The recommended action for the day: a full 'Workout', light 'Active Recovery', or a full 'Rest' day."),
  reasoning: z.string().describe('A brief, data-driven explanation for the recommendation, considering workout frequency, intensity, cycle phase, and self-reported feelings like fatigue.'),
  suggestedActivities: z.array(z.string()).optional().describe("A list of 2-3 specific, gentle activities if 'Active Recovery' is recommended (e.g., 'Light Walk', 'Gentle Yoga', 'Stretching')."),
});
export type RecoveryRecommenderOutput = z.infer<typeof RecoveryRecommenderOutputSchema>;


export const WorkoutEffectivenessInputSchema = z.object({
  workout: GenerateWorkoutOutputSchema.describe("The workout plan that the user just completed."),
  workoutGoal: z.string().describe("The primary goal of the workout (e.g., 'insulin-resistance', 'stress-relief')."),
  effortLevel: z.number().min(1).max(10).describe("The user's self-reported Rate of Perceived Exertion (RPE) on a scale of 1-10."),
  cyclePhase: z.enum(['menstrual', 'follicular', 'ovulation', 'luteal', 'unknown']).describe("The user's menstrual cycle phase during the workout."),
});
export type WorkoutEffectivenessInput = z.infer<typeof WorkoutEffectivenessInputSchema>;

export const WorkoutEffectivenessOutputSchema = z.object({
  effectivenessScore: z.number().min(0).max(100).describe('A score from 0-100 indicating how effective the workout was, based on the alignment of effort, goal, and cycle phase.'),
  feedback: z.string().describe('A short, actionable feedback message for the user, explaining the score and suggesting what it means for future workouts.'),
});
export type WorkoutEffectivenessOutput = z.infer<typeof WorkoutEffectivenessOutputSchema>;
