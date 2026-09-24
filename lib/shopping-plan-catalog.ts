import type { PlanProduct } from './shopping-plan';
import {governmentOptimizedRecipeProducts} from './recipe-optimizer-plan';

// Retailer-catalog candidates (Kurly/Oasis/Coupang real products, hand-authored recipes, combo
// meals) are intentionally removed here per explicit instruction: the home recommendation now
// draws only from government-DB-targeted synthesized recipes (lib/recipe-optimizer-plan.ts).

// 레시피 목록은 요청마다 DB에서 1,400여 행을 다시 읽고(0.5초+·Supabase egress) 조립하던 것을 10분간
// 메모리에 둔다. 한 번에 몇 MB라 unstable_cache(2MB 제한) 대신 단순 TTL 캐시를 쓴다.
const TTL = 10 * 60_000;
let cached: {at: number; products: Promise<PlanProduct[]>} | null = null;

export async function planProducts():Promise<PlanProduct[]> {
 if (cached && Date.now() - cached.at < TTL) return cached.products;
 const products = governmentOptimizedRecipeProducts().then((list) => list.map(slimRecipe));
 cached = {at: Date.now(), products};
 products.catch(() => { if (cached?.products === products) cached = null; });
 return products;
}

// 재료마다 붙어 있던, 화면·계산에서 쓰지 않는 필드(AI 메모·검색어·갱신 시각 등)를 뺀다. 같은 재료가
// 수백 개 레시피에 반복돼 응답이 수 MB씩 불어났다. 영양 계산(servingNutrients)·장보기에 쓰는 값은 그대로.
function slimRecipe(p: PlanProduct): PlanProduct {
 if (!p.recipe) return p;
 return {...p, recipe: {...p.recipe, ingredients: p.recipe.ingredients.map((part) => ({...part, product: slimIngredient(part.product)}))}};
}
function slimIngredient(p: PlanProduct): PlanProduct {
 const rest: Record<string, unknown> = {...p, nutritionEstimate: p.nutritionEstimate ? {fields: p.nutritionEstimate.fields} : p.nutritionEstimate};
 for (const key of ['searchQuery', 'updatedAt', 'nutritionSourceName', 'portions', 'protein', 'inWeeklyCart', 'servingNote']) delete rest[key];
 return rest as unknown as PlanProduct;
}
