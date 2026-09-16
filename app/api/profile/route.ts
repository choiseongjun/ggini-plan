import { NextRequest, NextResponse } from "next/server";
import { authFailure, sameOrigin, sessionUser } from "../../../lib/auth";
import { getPool } from "../../../lib/db";
import { parseBodyProfile } from "../../../lib/body-profile";

import { defaultDiet, parseDiet } from "../../../lib/meal-plan";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const user = await sessionUser(request);
    if (!user) return authFailure("로그인이 필요합니다.", 401);
    const result = await getPool().query("SELECT height::float8, weight::float8, age, sex, activity, meals, pregnancy, diet_preferences FROM body_profiles WHERE user_id = $1", [user.id]);
    const row = result.rows[0];
    const diet = row ? parseDiet(row.diet_preferences) ?? defaultDiet : defaultDiet;
    if (row) delete row.diet_preferences;
    return NextResponse.json({ profile: row ?? null, diet }, { headers: { "Cache-Control": "no-store" } });
  } catch { return authFailure("신체 정보를 불러오지 못했어요.", 503); }
}

export async function PUT(request: NextRequest) {
  if (!sameOrigin(request)) return authFailure("요청을 확인해 주세요.", 403);
  try {
    const user = await sessionUser(request);
    if (!user) return authFailure("로그인이 필요합니다.", 401);
    let input: unknown;
    try { input = await request.json(); } catch { return authFailure("입력 내용을 확인해 주세요.", 400); }
    const p = parseBodyProfile(input);
    if (!p) return authFailure("키·체중·나이와 선택 항목을 확인해 주세요. 계산은 만 19~78세를 대상으로 합니다.", 400);
    const rawDiet = (input as Record<string, unknown>).diet;
    const diet = rawDiet === undefined ? null : parseDiet(rawDiet);
    if (rawDiet !== undefined && !diet) return authFailure("식단 선호 설정을 확인해 주세요.", 400);
    await getPool().query(`INSERT INTO body_profiles (user_id,height,weight,age,sex,activity,meals,pregnancy,diet_preferences)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,COALESCE($9::jsonb,'{}'::jsonb)) ON CONFLICT (user_id) DO UPDATE SET
      height=EXCLUDED.height,weight=EXCLUDED.weight,age=EXCLUDED.age,sex=EXCLUDED.sex,
      activity=EXCLUDED.activity,meals=EXCLUDED.meals,pregnancy=EXCLUDED.pregnancy,diet_preferences=COALESCE($9::jsonb,body_profiles.diet_preferences),updated_at=NOW()`,
    [user.id,p.height,p.weight,p.age,p.sex,p.activity,p.meals,p.pregnancy,diet ? JSON.stringify(diet) : null]);
    return NextResponse.json({ profile: p }, { headers: { "Cache-Control": "no-store" } });
  } catch { return authFailure("저장하지 못했어요. 잠시 후 다시 시도해 주세요.", 503); }
}
