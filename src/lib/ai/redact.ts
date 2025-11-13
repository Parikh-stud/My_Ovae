export type SymptomLog = {
  symptomType?: string;
  severity?: number;
  bodyZone?: string;
};

export type NutritionLog = {
  mealType?: string;
  type?: string;
  category?: string;
  calories?: number;
  macros?: Record<string, number> | null;
};

export type WorkoutLog = {
  activityType?: string;
  type?: string;
  category?: string;
  durationMinutes?: number;
  duration?: number;
  minutes?: number;
  intensity?: string;
  effortLevel?: string;
};

export type SymptomSummary = {
  symptomType: string;
  occurrences: number;
  averageSeverity?: number;
  commonBodyZone?: string;
};

export type NutritionSummary = {
  mealType: string;
  entries: number;
  averageCalories?: number;
  dominantMacros?: string[];
};

export type WorkoutSummary = {
  activityType: string;
  sessionCount: number;
  totalMinutes?: number;
  commonIntensity?: string;
};

function round(value: number | undefined, precision = 2): number | undefined {
  if (typeof value !== 'number' || Number.isNaN(value)) return undefined;
  const factor = Math.pow(10, precision);
  return Math.round(value * factor) / factor;
}

function getString(value: unknown, fallback: string): string {
  if (typeof value === 'string' && value.trim().length > 0) return value;
  return fallback;
}

function extractNumeric(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  return undefined;
}

function mostCommon(values: (string | undefined | null)[]): string | undefined {
  const counts = new Map<string, number>();
  for (const value of values) {
    if (!value) continue;
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  let mostFrequent: string | undefined;
  let highestCount = 0;
  for (const [value, count] of counts.entries()) {
    if (count > highestCount) {
      mostFrequent = value;
      highestCount = count;
    }
  }
  return mostFrequent;
}

export function sanitizeSymptomLogs<T extends SymptomLog>(logs: T[] | undefined | null): SymptomSummary[] {
  if (!Array.isArray(logs) || logs.length === 0) return [];

  const summaries = new Map<string, { totalSeverity: number; count: number; zones: (string | undefined)[] }>();

  for (const log of logs) {
    const symptomType = getString((log as SymptomLog)?.symptomType, 'unspecified');
    const severity = extractNumeric((log as SymptomLog)?.severity);
    const bodyZone = (log as SymptomLog)?.bodyZone;
    const entry = summaries.get(symptomType) ?? { totalSeverity: 0, count: 0, zones: [] };

    if (typeof severity === 'number') {
      entry.totalSeverity += severity;
    }
    entry.count += 1;
    entry.zones.push(bodyZone);

    summaries.set(symptomType, entry);
  }

  return Array.from(summaries.entries()).map(([symptomType, { totalSeverity, count, zones }]) => ({
    symptomType,
    occurrences: count,
    averageSeverity: round(totalSeverity / count),
    commonBodyZone: mostCommon(zones),
  }));
}

export function sanitizeNutritionLogs<T extends NutritionLog>(logs: T[] | undefined | null): NutritionSummary[] {
  if (!Array.isArray(logs) || logs.length === 0) return [];

  const summaries = new Map<string, { totalCalories: number; entries: number; macroTallies: Map<string, number> }>();

  for (const log of logs) {
    const mealType = getString((log as NutritionLog)?.mealType || (log as NutritionLog)?.type || (log as NutritionLog)?.category, 'meal');
    const calories = extractNumeric((log as NutritionLog)?.calories) ?? 0;
    const macros = (log as NutritionLog)?.macros ?? {};

    const entry = summaries.get(mealType) ?? { totalCalories: 0, entries: 0, macroTallies: new Map<string, number>() };
    entry.totalCalories += calories;
    entry.entries += 1;

    if (macros && typeof macros === 'object') {
      for (const [macro, value] of Object.entries(macros)) {
        if (typeof value !== 'number' || !Number.isFinite(value)) continue;
        entry.macroTallies.set(macro, (entry.macroTallies.get(macro) ?? 0) + value);
      }
    }

    summaries.set(mealType, entry);
  }

  return Array.from(summaries.entries()).map(([mealType, { totalCalories, entries, macroTallies }]) => {
    const dominantMacros = Array.from(macroTallies.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 2)
      .map(([macro]) => macro);

    return {
      mealType,
      entries,
      averageCalories: round(totalCalories / entries),
      dominantMacros: dominantMacros.length > 0 ? dominantMacros : undefined,
    };
  });
}

export function sanitizeWorkoutLogs<T extends WorkoutLog>(logs: T[] | undefined | null): WorkoutSummary[] {
  if (!Array.isArray(logs) || logs.length === 0) return [];

  const summaries = new Map<string, { totalMinutes: number; count: number; intensities: (string | undefined)[] }>();

  for (const log of logs) {
    const activityType = getString((log as WorkoutLog)?.activityType || (log as WorkoutLog)?.type || (log as WorkoutLog)?.category, 'workout');
    const duration = extractNumeric((log as WorkoutLog)?.durationMinutes) ?? extractNumeric((log as WorkoutLog)?.duration) ?? extractNumeric((log as WorkoutLog)?.minutes) ?? 0;
    const intensity = (log as WorkoutLog)?.intensity || (log as WorkoutLog)?.effortLevel;

    const entry = summaries.get(activityType) ?? { totalMinutes: 0, count: 0, intensities: [] };
    entry.totalMinutes += duration;
    entry.count += 1;
    entry.intensities.push(intensity);

    summaries.set(activityType, entry);
  }

  return Array.from(summaries.entries()).map(([activityType, { totalMinutes, count, intensities }]) => ({
    activityType,
    sessionCount: count,
    totalMinutes: round(totalMinutes, 1),
    commonIntensity: mostCommon(intensities),
  }));
}
