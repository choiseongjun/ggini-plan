import {NextRequest} from 'next/server';
import {adminUser} from '../../../../lib/admin';
import {listLocalFoodSafety,findFoodSafetySubstitutes,type SubstituteSort} from '../../../../lib/foodsafety-collector';

const sortOptions: SubstituteSort[] = ['similar', 'sodium', 'calories', 'protein', 'fat', 'carbohydrates'];

export async function GET(request: NextRequest) {
 if (!await adminUser(request)) return Response.json({error: '관리자 권한이 필요해요.'}, {status: 403});
 const params = request.nextUrl.searchParams;
 try {
  const similarTo = params.get('similarTo');
  if (similarTo) {
   const sortByParam = params.get('sortBy') ?? 'similar';
   const sortBy = (sortOptions as string[]).includes(sortByParam) ? sortByParam as SubstituteSort : 'similar';
   const result = await findFoodSafetySubstitutes(similarTo, {sortBy, limit: 8});
   if (!result) return Response.json({error: '기준 식품을 찾을 수 없어요.'}, {status: 404});
   return Response.json(result, {headers: {'Cache-Control': 'no-store'}});
  }
  const query = (params.get('q') ?? '').trim().slice(0, 60);
  const label = (params.get('label') ?? 'all').trim();
  const limit = Math.min(200, Math.max(1, Number(params.get('limit')) || 50));
  const offset = Math.max(0, Number(params.get('offset')) || 0);
  const result = await listLocalFoodSafety({query, label, limit, offset});
  return Response.json(result, {headers: {'Cache-Control': 'no-store'}});
 } catch (error) {
  console.error('Foodsafety reference lookup failed', error);
  return Response.json({error: '데이터를 불러오지 못했어요.'}, {status: 503});
 }
}
