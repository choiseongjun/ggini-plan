import {NextRequest, NextResponse} from 'next/server';
import {sessionUser, sameOrigin, authFailure} from '../../../lib/auth';
import {EAT_OUT_KINDS, compareEatOut, suggestEatOut, type EatOutKind} from '../../../lib/eat-out';

// "지금 뭐 먹지?" — 로그인하지 않아도 일반 성인 기준으로 쓸 수 있다.
export async function POST(request: NextRequest) {
 if (!sameOrigin(request)) return authFailure('요청을 확인해 주세요.', 403);
 let input: {mode?: unknown; kind?: unknown; names?: unknown};
 try { const raw = await request.text(); if (raw.length > 2000) throw new Error(); input = JSON.parse(raw); } catch { return authFailure('입력을 확인해 주세요.', 400); }
 try {
  const user = await sessionUser(request);
  const userId = user ? String(user.id) : null;
  if (input.mode === 'compare') {
   const names = Array.isArray(input.names) ? input.names.filter((n): n is string => typeof n === 'string').map((n) => n.trim().slice(0, 30)).filter(Boolean) : [];
   if (names.length < 2) return authFailure('비교할 메뉴를 두 개 이상 적어 주세요.', 400);
   return NextResponse.json(await compareEatOut(userId, names), {headers: {'Cache-Control': 'no-store'}});
  }
  const kind = typeof input.kind === 'string' && Object.hasOwn(EAT_OUT_KINDS, input.kind) ? input.kind as EatOutKind : null;
  return NextResponse.json(await suggestEatOut(userId, kind), {headers: {'Cache-Control': 'no-store'}});
 } catch {
  return authFailure('메뉴를 고르지 못했어요. 잠시 후 다시 시도해 주세요.', 503);
 }
}
