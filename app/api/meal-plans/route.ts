import { catalogItems } from "../../../lib/catalog-db";
import { NextRequest, NextResponse } from "next/server";
import { authFailure, sameOrigin, sessionUser } from "../../../lib/auth";
import { parseBodyProfile } from "../../../lib/body-profile";
import { parseDiet, recommendMeals } from "../../../lib/meal-plan";
import { makeMonth } from "../../../lib/monthly-plan";
import { getPool } from "../../../lib/db";

export const runtime = "nodejs";
const json = (value: unknown, status = 200) => NextResponse.json(value, { status, headers: { "Cache-Control": "no-store" } });

export async function GET(request: NextRequest) {
  try {
    const user = await sessionUser(request);
    if (!user) return authFailure("로그인이 필요합니다.", 401);
    const result = await getPool().query(`SELECT id::text, profile_snapshot AS profile, diet_snapshot AS diet,
      recommendation, variant, created_at AS "createdAt" FROM meal_plans
      WHERE user_id=$1 ORDER BY created_at DESC, id DESC LIMIT 20`, [user.id]);
    return json({ plans: result.rows });
  } catch { return authFailure("저장된 식단을 불러오지 못했어요.", 503); }
}

export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return authFailure("요청을 확인해 주세요.", 403);
  let input;
  try { input = await request.json(); } catch { return authFailure("입력 내용을 확인해 주세요.", 400); }
  const profile = parseBodyProfile(input?.profile);
  const diet = parseDiet(input?.diet);
  const variant = input?.variant ?? 0;
  if (!profile || !diet || !Number.isInteger(variant) || variant < 0 || variant > 1000000)
    return authFailure("신체 정보와 식단 설정을 확인해 주세요.", 400);
  try {
  const catalog = await catalogItems();
  const recommendation = recommendMeals(profile, diet, variant, catalog);
  if (!recommendation) return authFailure("선택한 시간대와 제외 재료 조건에 맞는 식단이 부족해요. 식사 시간·제외 재료 설정을 확인해 주세요. 임신·수유 중에는 자동 추천을 제공하지 않아요.", 422);
    const user = await sessionUser(request);
    const plan = { profile, diet, recommendation, variant };
    if (!user) return json({ plan: { ...plan, id: null, createdAt: null }, saved: false });
    const client = await getPool().connect();
    try {
      await client.query("BEGIN");
      await client.query(`INSERT INTO body_profiles (user_id,height,weight,age,sex,activity,meals,pregnancy,diet_preferences)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT (user_id) DO UPDATE SET
        height=EXCLUDED.height,weight=EXCLUDED.weight,age=EXCLUDED.age,sex=EXCLUDED.sex,
        activity=EXCLUDED.activity,meals=EXCLUDED.meals,pregnancy=EXCLUDED.pregnancy,
        diet_preferences=EXCLUDED.diet_preferences,updated_at=NOW()`,
        [user.id,profile.height,profile.weight,profile.age,profile.sex,profile.activity,profile.meals,profile.pregnancy,JSON.stringify(diet)]);
      const result = await client.query(`INSERT INTO meal_plans (user_id,profile_snapshot,diet_snapshot,recommendation,variant)
        VALUES ($1,$2,$3,$4,$5) RETURNING id::text,created_at AS "createdAt"`,
        [user.id,JSON.stringify(profile),JSON.stringify(diet),JSON.stringify(recommendation),variant]);
      const month=new Date(Date.now()+9*3600000).toISOString().slice(0,7);
      const days=makeMonth(month,profile,diet,catalog);
      if(!days)throw new Error("Monthly recommendation unavailable");
      await client.query(`INSERT INTO monthly_meal_plans(user_id,month,profile,diet,days) VALUES($1,$2,$3,$4,$5)
        ON CONFLICT(user_id,month) DO UPDATE SET profile=EXCLUDED.profile,diet=EXCLUDED.diet,days=EXCLUDED.days,updated_at=NOW()
        WHERE monthly_meal_plans.profile<>EXCLUDED.profile OR monthly_meal_plans.diet<>EXCLUDED.diet`,
        [user.id,month,JSON.stringify(profile),JSON.stringify(diet),JSON.stringify(days)]);
      await client.query("COMMIT");
      return json({ plan: { ...plan, ...result.rows[0] }, saved: true }, 201);
    } catch (error) { await client.query("ROLLBACK"); throw error; }
    finally { client.release(); }
  } catch { return authFailure("식단을 저장하지 못했어요. 잠시 후 다시 시도해 주세요.", 503); }
}
