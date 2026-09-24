import {NextRequest, NextResponse} from 'next/server';
import {sessionUser, authFailure} from '../../../lib/auth';
import {getPool} from '../../../lib/db';
import {REFERENCE_PREFIX, foodReferencesByCodes, searchFoodReference} from '../../../lib/food-reference';

const json = (data: unknown) => NextResponse.json(data, {headers: {'Cache-Control': 'no-store'}});

// GET ?q=라떼 → 이름 검색 / ?recent=1 → 내가 최근에 기록한 간식·음료(다시 한 번에 기록하기용)
export async function GET(request: NextRequest) {
 try {
  const params = request.nextUrl.searchParams;
  if (params.get('recent') === '1') {
   const user = await sessionUser(request);
   if (!user) return json({items: []});
   const {rows} = await getPool().query<{product_id: string}>(
    `SELECT product_id FROM food_intake_logs WHERE user_id=$1 AND undone_at IS NULL AND product_id LIKE $2
     GROUP BY product_id ORDER BY max(created_at) DESC LIMIT 8`, [user.id, `${REFERENCE_PREFIX}%`]);
   return json({items: await foodReferencesByCodes(rows.map((r) => r.product_id.slice(REFERENCE_PREFIX.length)))});
  }
  const q = (params.get('q') ?? '').slice(0, 40);
  return json({items: await searchFoodReference(q)});
 } catch {
  return authFailure('음식을 찾지 못했어요. 잠시 후 다시 시도해 주세요.', 503);
 }
}
