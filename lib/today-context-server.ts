import {getPool} from './db';
import {EXTRA_PREFIX} from './intake-extras';
import {servingNutrients} from './serving-nutrients';
import type {PlanProduct} from './shopping-plan';
import type {HealthFlag, TodayContext} from './today-context';

const kstDay = (date: Date) => new Date(date.getTime() + 9 * 3600000).toISOString().slice(0, 10);

// 먹은 기록에서 오늘 섭취량과 최근 메뉴를 계산한다. 기록에 남긴 영양값을 우선 쓰고, 예전 기록은 메뉴 영양값 × 먹은 양으로 추정한다.
export async function todayContext(userId: string, products: PlanProduct[], personalization: {dailyCalories: number | null; perMealCalories: number | null; meals: number | null}, health: HealthFlag[]): Promise<TodayContext> {
  const rows = (await getPool().query<{product_id: string; portions: number; calories: number | null; carbs: number | null; sugar: number | null; sodium: number | null; created_at: Date}>(
    `SELECT product_id, portions::float8, calories::float8, carbs::float8, sugar::float8, sodium::float8, created_at FROM food_intake_logs
     WHERE user_id = $1 AND undone_at IS NULL AND created_at > NOW() - INTERVAL '3 days' ORDER BY created_at`, [userId])).rows;
  const today = kstDay(new Date()), byId = new Map(products.map((p) => [p.id, p]));
  const eaten = {kcal: 0, sodium: 0, carbs: 0, sugar: 0, meals: 0};
  for (const row of rows) {
    if (kstDay(row.created_at) !== today) continue;
    eaten.kcal += row.calories ?? 0;
    eaten.sugar += row.sugar ?? 0;
    if (row.product_id.startsWith(EXTRA_PREFIX)) continue;
    // 끼니 수는 추천 메뉴 기록만 센다(간식·음료는 끼니가 아니다). 영양은 기록에 남긴 값을 우선 쓴다.
    const product = byId.get(row.product_id);
    if (product) eaten.meals++;
    const n = product ? servingNutrients(product) : null;
    eaten.sodium += row.sodium ?? (n?.sodium ?? 0) * row.portions;
    eaten.carbs += row.carbs ?? (n?.carbs ?? 0) * row.portions;
  }
  const recent = [...new Set(rows.filter((r) => byId.has(r.product_id)).map((r) => r.product_id))];
  return {
    day: today,
    eaten: {kcal: Math.round(eaten.kcal), sodium: Math.round(eaten.sodium), carbs: Math.round(eaten.carbs), sugar: Math.round(eaten.sugar), meals: eaten.meals},
    dailyKcal: personalization.dailyCalories, perMealKcal: personalization.perMealCalories, mealsPerDay: personalization.meals ?? 3,
    health, recent,
  };
}
