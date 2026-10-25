import { NextRequest, NextResponse } from 'next/server';
import { authFailure, sameOrigin, sessionUser } from '../../../lib/auth';
import { getPool } from '../../../lib/db';
import { isHealthGoal } from '../../../lib/health-goal';

export const runtime = 'nodejs';
export async function GET(request: NextRequest) {
  try {
    const user = await sessionUser(request);
    if (!user) return authFailure('로그인이 필요해요.', 401);
    const result = await getPool().query('SELECT goal FROM health_goals WHERE user_id=$1', [user.id]);
    return NextResponse.json({ goal: result.rows[0]?.goal ?? null }, { headers: { 'Cache-Control': 'no-store' } });
  } catch { return authFailure('모드를 불러오지 못했어요.', 503); }
}
export async function PUT(request: NextRequest) {
  if (!sameOrigin(request)) return authFailure('요청을 확인해 주세요.', 403);
  try {
    const user = await sessionUser(request);
    if (!user) return authFailure('로그인이 필요해요.', 401);
    const input = await request.json().catch(() => null);
    if (!isHealthGoal(input?.goal)) return authFailure('모드를 선택해 주세요.', 400);
    await getPool().query(`INSERT INTO health_goals(user_id,goal) VALUES($1,$2)
      ON CONFLICT(user_id) DO UPDATE SET goal=EXCLUDED.goal,updated_at=NOW()`, [user.id,input.goal]);
    return NextResponse.json({ goal: input.goal }, { headers: { 'Cache-Control': 'no-store' } });
  } catch { return authFailure('모드를 저장하지 못했어요. 다시 시도해 주세요.', 503); }
}
