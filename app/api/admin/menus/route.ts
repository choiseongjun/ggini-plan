import {NextRequest} from 'next/server';
import {adminUser} from '../../../../lib/admin';
import {listRecipeOptimizerResults} from '../../../../lib/recipe-optimizer-store';
import {governmentOptimizedRecipeProducts} from '../../../../lib/recipe-optimizer-plan';
import {servingNutrients} from '../../../../lib/serving-nutrients';
import dishRoles from '../../../../data/dish-roles.json';
import breakfastDishes from '../../../../data/breakfast-dishes.json';
import noRiceDishes from '../../../../data/no-rice.json';
export const maxDuration = 60;

// 관리자: 추천에 쓰이는 메뉴 전체와, 빠진 메뉴는 왜 빠졌는지. 카탈로그 캐시를 거치지 않고 지금 DB·분류 기준으로 계산한다.
export async function GET(request: NextRequest) {
 if (!await adminUser(request)) return Response.json({error: '관리자 권한이 필요해요.'}, {status: 403});
 try {
  const [results, catalog] = await Promise.all([listRecipeOptimizerResults(), governmentOptimizedRecipeProducts()]);
  const byCode = new Map(catalog.map((p) => [p.id.replace(/^recipe-opt-/, ''), p]));
  const roles = dishRoles as Record<string, string>, breakfast = new Set<string>(breakfastDishes), noRice = new Set<string>(noRiceDishes);
  const menus = results.map((r) => {
   const p = byCode.get(r.foodCode), role = roles[r.foodCode] ?? null;
   const n = p ? servingNutrients(p) : null;
   const kcal = n?.calories ?? null;
   const reason = p
    ? (kcal !== null && kcal < (p.recipe?.slots.every((s) => s === 'breakfast') ? 120 : 250) ? '한 끼 열량 부족' : null)
    : !r.aiIngredients?.ingredients.length ? '재료 생성 전' : !role ? '분류 전' : role === 'side' ? '반찬' : role === 'other' ? '끼니 아님·중복' : ['namul', 'kimchi'].includes(r.templateId) ? '반찬 템플릿' : '단백질 부족(국)';
   return {
    code: r.foodCode, name: p?.name ?? r.targetName, source: r.source, role, template: r.templateId,
    breakfast: breakfast.has(r.foodCode), withRice: p ? p.recipe?.ingredients.some((i) => i.label.startsWith('함께 먹는 밥')) ?? false : !noRice.has(r.foodCode),
    included: Boolean(p) && reason === null, reason,
    kcal: kcal === null ? null : Math.round(kcal), protein: n?.protein == null ? null : Math.round(n.protein), carbs: n?.carbs == null ? null : Math.round(n.carbs), sodium: n?.sodium == null ? null : Math.round(n.sodium),
    price: p ? Math.round(p.price) : null, image: r.imageUrl,
    ingredients: (r.aiIngredients?.ingredients ?? []).map((i) => `${i.name.split(/[(（]/)[0].trim()} ${i.grams}g`),
    createdAt: r.createdAt,
   };
  });
  return Response.json({menus}, {headers: {'Cache-Control': 'no-store'}});
 } catch {
  return Response.json({error: '메뉴 목록을 불러오지 못했어요.'}, {status: 503});
 }
}
