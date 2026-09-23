import { calorieEstimate, type BodyProfile } from "./body-profile";
import { dailyNutritionReference } from "./daily-nutrition-reference";
import type { NutritionTarget } from "./nutrition-target";
import { servingNutrients } from "./serving-nutrients";
import { mealSchedule, type MealSlot, type PlanConditions, type PlanProduct } from "./shopping-plan";

// ~7,700 kcal of cumulative surplus/deficit ≈ 1 kg of body weight (the common rule of thumb; real change varies).
export const KCAL_PER_KG = 7700;
const slotOrder: MealSlot[] = ["breakfast", "lunch", "dinner"];

export type NutrientKey = "protein" | "carbs" | "fat" | "sodium";
export type NutrientStatus = "low" | "ok" | "high";

export function analyzeWeek({ ids, products, conditions, profile, target }: { ids: string[]; products: PlanProduct[]; conditions: PlanConditions; profile: BodyProfile; target: NutritionTarget | null }) {
  const energy = calorieEstimate(profile);
  const reference = dailyNutritionReference(profile);
  if (!energy || !reference) return null;
  const dailyGoal = target?.calories ?? energy.daily;
  // What a meal "should" be: the user's own split for 아침·점심·저녁 when they set one, otherwise an even share.
  const slotGoal = (slot: MealSlot) => target?.mealCalories && profile.meals === 3 ? target.mealCalories[slotOrder.indexOf(slot)] : dailyGoal / profile.meals;

  const schedule = mealSchedule(conditions);
  const dayCount = Math.max(0, ...schedule.map(s => s.day));
  const days = Array.from({ length: dayCount }, (_, i) => {
    const meals = ids.flatMap((id, index) => {
      const product = products.find(p => p.id === id);
      return product && schedule[index]?.day === i + 1 ? [{ product, slot: schedule[index].slot, n: servingNutrients(product) }] : [];
    });
    const planned = meals.reduce((sum, m) => sum + (m.n.calories ?? slotGoal(m.slot)), 0);
    const unknown = meals.filter(m => m.n.calories === null).length;
    // Meals the plan doesn't cover (e.g. only 저녁 was recommended) are assumed to be eaten at the goal amount.
    const openSlots = Math.max(0, profile.meals - meals.length);
    const coveredSlots = new Set(meals.map(m => m.slot));
    const openGoal = target?.mealCalories && profile.meals === 3
      ? slotOrder.filter(s => !coveredSlots.has(s)).slice(0, openSlots).reduce((sum, s) => sum + slotGoal(s), 0)
      : openSlots * dailyGoal / profile.meals;
    const intake = Math.round(planned + openGoal);
    return { day: i + 1, meals, planned: Math.round(planned), assumed: Math.round(openGoal), unknown, intake, delta: intake - energy.daily };
  });
  if (!days.length) return null;

  const avgIntake = Math.round(days.reduce((sum, d) => sum + d.intake, 0) / days.length);
  const avgDelta = avgIntake - energy.daily;
  const weekKg = avgDelta * 7 / KCAL_PER_KG;

  // Nutrients: judged only on the recommended meals, each against its share of the daily goal.
  const planned = days.flatMap(d => d.meals);
  const macroGoal = (ratio: number, perGram: number) => dailyGoal * ratio / 100 / perGram;
  const dailyTargets: Record<NutrientKey, number> = {
    protein: target ? macroGoal(target.proteinRatio, 4) : reference.protein,
    carbs: target ? macroGoal(target.carbRatio, 4) : (reference.carbs[0] + reference.carbs[1]) / 2,
    fat: target ? macroGoal(target.fatRatio, 9) : (reference.fat[0] + reference.fat[1]) / 2,
    sodium: reference.sodiumReduction,
  };
  const nutrients = (["protein", "carbs", "fat", "sodium"] as NutrientKey[]).map(key => {
    const known = planned.filter(m => m.n[key] !== null);
    const actual = known.reduce((sum, m) => sum + m.n[key]!, 0);
    const goal = known.reduce((sum, m) => sum + dailyTargets[key] * slotGoal(m.slot) / dailyGoal, 0);
    const percent = goal > 0 && known.length ? Math.round(actual / goal * 100) : null;
    const status: NutrientStatus | null = percent === null ? null : key === "sodium" ? (percent > 100 ? "high" : "ok") : percent < 80 ? "low" : percent > 125 ? "high" : "ok";
    return { key, percent, status, perMeal: known.length ? Math.round(actual / known.length) : null, goalPerMeal: known.length ? Math.round(goal / known.length) : null, known: known.length, missing: planned.length - known.length };
  });

  return { days, maintenance: energy.daily, dailyGoal, avgIntake, avgDelta, weekKg, monthKg: weekKg * 4, nutrients, plannedMeals: planned.length, assumedMeals: days.reduce((n, d) => n + Math.max(0, profile.meals - d.meals.length), 0) };
}
export type WeekAnalysis = NonNullable<ReturnType<typeof analyzeWeek>>;

export type ActualLog = { productId: string; calories: number | null; date: string };

// Per plan day, what was actually logged. Like the plan, meals not logged that day are assumed at the
// goal amount so the two lines stay comparable; quick extras (밥 추가, 음료…) add on top.
export function actualByDay(analysis: WeekAnalysis, logs: ActualLog[], dates: string[], meals: number, extraPrefix: string) {
  return analysis.days.map((d, i) => {
    const dayLogs = logs.filter(l => l.date === dates[i]);
    if (!dayLogs.length) return null;
    const logged = Math.round(dayLogs.reduce((sum, l) => sum + (l.calories ?? 0), 0));
    const mainMeals = dayLogs.filter(l => !l.productId.startsWith(extraPrefix)).length;
    const assumed = Math.round(Math.max(0, meals - mainMeals) * analysis.dailyGoal / meals);
    return { logged, assumed, intake: logged + assumed, vsPlan: logged + assumed - d.intake };
  });
}
