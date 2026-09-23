export type NutritionTarget = { calories: number; carbRatio: number; proteinRatio: number; fatRatio: number; mealCalories?: number[] };

export function parseNutritionTarget(value: unknown): NutritionTarget | null {
  if (!value || typeof value !== "object") return null;
  const p = value as Record<string, unknown>;
  if (typeof p.calories !== "number" || !Number.isFinite(p.calories) || p.calories < 800 || p.calories > 6000) return null;
  if (typeof p.carbRatio !== "number" || typeof p.proteinRatio !== "number" || typeof p.fatRatio !== "number") return null;
  if (![p.carbRatio, p.proteinRatio, p.fatRatio].every(n => Number.isFinite(n) && n >= 0 && n <= 100)) return null;
  if (Math.abs(p.carbRatio + p.proteinRatio + p.fatRatio - 100) > 1) return null;
  const target: NutritionTarget = { calories: Math.round(p.calories), carbRatio: p.carbRatio, proteinRatio: p.proteinRatio, fatRatio: p.fatRatio };
  // Optional per-meal split (e.g. 아침·점심·저녁); when present it must add up to the daily total.
  if (p.mealCalories !== undefined) {
    const meals = p.mealCalories;
    if (!Array.isArray(meals) || meals.length < 1 || meals.length > 6 || !meals.every(n => typeof n === "number" && Number.isInteger(n) && n >= 0 && n <= 3000)) return null;
    if (Math.abs(meals.reduce((sum, n) => sum + n, 0) - target.calories) > 1) return null;
    target.mealCalories = meals;
  }
  return target;
}
