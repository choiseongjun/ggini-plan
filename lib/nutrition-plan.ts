import { calorieEstimate, type BodyProfile } from "./body-profile";
import type { NutritionTarget } from "./nutrition-target";

export const bodyGoals = {
  lose: { label: "체중 감량", description: "유지 칼로리보다 조금 적게, 단백질은 넉넉히", proteinPerKg: 1.6, fatRatio: 30 },
  maintain: { label: "지금 체중 유지", description: "필요한 만큼 골고루 균형 있게", proteinPerKg: 1.2, fatRatio: 25 },
  muscle: { label: "근육 늘리기", description: "유지 칼로리보다 조금 많이, 단백질 위주로", proteinPerKg: 1.8, fatRatio: 25 },
} as const;
export type BodyGoal = keyof typeof bodyGoals;

export function bmi(profile: Pick<BodyProfile, "height" | "weight">) {
  const value = profile.weight / (profile.height / 100) ** 2;
  // Korean Society for the Study of Obesity cut-offs (2022).
  const label = value < 18.5 ? "저체중" : value < 23 ? "정상" : value < 25 ? "비만 전단계" : "비만";
  return { value: Math.round(value * 10) / 10, label };
}

const round10 = (n: number) => Math.round(n / 10) * 10;

// Target = maintenance ± a modest adjustment. The deficit is capped at 500 kcal and never drops
// below the resting estimate, so the result stays a gentle reference rather than a diet prescription.
export function nutritionPlan(profile: BodyProfile, goal: BodyGoal) {
  const estimate = calorieEstimate(profile);
  if (!estimate) return null;
  const { resting, daily } = estimate;
  const rule = bodyGoals[goal];
  const calories = Math.min(6000, Math.max(800, round10(
    goal === "lose" ? Math.max(daily - Math.min(500, daily * 0.15), resting) :
    goal === "muscle" ? daily + Math.min(300, daily * 0.1) : daily,
  )));
  const proteinRatio = Math.min(35, Math.max(15, Math.round(rule.proteinPerKg * profile.weight * 4 / calories * 100)));
  const fatRatio = rule.fatRatio;
  const carbRatio = 100 - proteinRatio - fatRatio;
  const target: NutritionTarget = { calories, carbRatio, proteinRatio, fatRatio };
  return {
    resting, maintenance: daily, target,
    perMeal: Math.round(calories / profile.meals),
    grams: { carbs: Math.round(calories * carbRatio / 100 / 4), protein: Math.round(calories * proteinRatio / 100 / 4), fat: Math.round(calories * fatRatio / 100 / 9) },
  };
}
