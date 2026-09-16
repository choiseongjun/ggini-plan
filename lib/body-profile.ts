export const activities = {
  sedentary: { label: "주로 앉아서 생활해요", factor: 1.2 },
  light: { label: "가벼운 활동 · 운동 주 1~3회", factor: 1.375 },
  moderate: { label: "보통 활동 · 운동 주 3~5회", factor: 1.55 },
  active: { label: "활동이 많아요 · 운동 주 6~7회", factor: 1.725 },
} as const;

export type BodyProfile = { height: number; weight: number; age: number; sex: "female" | "male"; activity: keyof typeof activities; meals: number; pregnancy: boolean };

export function parseBodyProfile(value: unknown): BodyProfile | null {
  if (!value || typeof value !== "object") return null;
  const p = value as Record<string, unknown>;
  if (typeof p.height !== "number" || !Number.isFinite(p.height) || p.height < 100 || p.height > 250 ||
      typeof p.weight !== "number" || !Number.isFinite(p.weight) || p.weight < 30 || p.weight > 350 ||
      typeof p.age !== "number" || !Number.isInteger(p.age) || p.age < 19 || p.age > 78 ||
      (p.sex !== "female" && p.sex !== "male") || typeof p.activity !== "string" || !Object.hasOwn(activities, p.activity) ||
      typeof p.meals !== "number" || !Number.isInteger(p.meals) || p.meals < 1 || p.meals > 6 || typeof p.pregnancy !== "boolean") return null;
  return { height: p.height, weight: p.weight, age: p.age, sex: p.sex, activity: p.activity as BodyProfile["activity"], meals: p.meals, pregnancy: p.pregnancy };
}

export function calorieEstimate(profile: BodyProfile) {
  if (profile.pregnancy) return null;
  // Mifflin–St Jeor estimates resting energy expenditure, not a safe minimum intake.
  const resting = 10 * profile.weight + 6.25 * profile.height - 5 * profile.age + (profile.sex === "male" ? 5 : -161);
  const daily = resting * activities[profile.activity].factor;
  return { resting: Math.round(resting), daily: Math.round(daily), perMeal: Math.round(daily / profile.meals) };
}
