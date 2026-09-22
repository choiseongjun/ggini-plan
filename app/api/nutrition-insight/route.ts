import {NextRequest} from 'next/server';
import {searchLocalFoodSafety,findFoodSafetySubstitutes} from '../../../lib/foodsafety-collector';
import {similarCatalogProducts,cleanDishName} from '../../../lib/foodsafety-resolve';

export async function GET(request: NextRequest) {
 const params = request.nextUrl.searchParams;
 const name = (params.get('name') ?? '').trim().slice(0, 120);
 const excludeId = params.get('id')?.trim().slice(0, 100) || null;
 if (!name) return Response.json({error: '상품명이 필요해요.'}, {status: 400});
 try {
  const matches = await searchLocalFoodSafety(cleanDishName(name) || name, 3);
  const reference = matches[0] ?? null;
  if (!reference) return Response.json({reference: null, substitutes: [], products: []}, {headers: {'Cache-Control': 'no-store'}});
  const subResult = await findFoodSafetySubstitutes(reference.foodCode, {limit: 5});
  const substituteNames = subResult?.candidates.map((c) => c.itemName) ?? [];
  const products = await similarCatalogProducts([reference.name, ...substituteNames], excludeId, 6);
  return Response.json({reference, substitutes: subResult?.candidates ?? [], products}, {headers: {'Cache-Control': 'no-store'}});
 } catch (error) {
  console.error('Nutrition insight lookup failed', error);
  return Response.json({error: '비교 정보를 불러오지 못했어요.'}, {status: 503});
 }
}
