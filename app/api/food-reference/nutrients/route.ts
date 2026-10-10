import {detailedFoodCode} from '../../../../lib/detailed-nutrition';
import {getDetailedNutrition} from '../../../../lib/kfind-nutrition';

export async function GET(request: Request) {
 const code = detailedFoodCode(new URL(request.url).searchParams.get('code') ?? '');
 if (!code) return Response.json({error: '올바른 음식 코드가 필요해요.'}, {status: 400});
 try {
  const item = await getDetailedNutrition(code);
  return Response.json({item}, {headers: {'Cache-Control': 'public, max-age=300'}});
 } catch {
  return Response.json({error: '상세 영양성분을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.'}, {status: 503});
 }
}
