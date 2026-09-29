import {applyPairings} from './meal-pairings';
import {listPairings} from './meal-pairing-store';
import type { PlanProduct } from './shopping-plan';
import {recipeProductsFromResults} from './recipe-optimizer-plan';
import {listRecipeOptimizerResults,type StoredRecipeResult} from './recipe-optimizer-store';

// Retailer-catalog candidates (Kurly/Oasis/Coupang real products, hand-authored recipes, combo
// meals) are intentionally removed here per explicit instruction: the home recommendation now
// draws only from government-DB-targeted synthesized recipes (lib/recipe-optimizer-plan.ts).

// 레시피 목록은 요청마다 DB에서 1,400여 행을 다시 읽고(0.5초+·Supabase egress) 조립하던 것을 10분간
// 메모리에 둔다. 한 번에 몇 MB라 unstable_cache(2MB 제한) 대신 단순 TTL 캐시를 쓴다.
const TTL = 10 * 60_000;
let cached: {at: number; products: Promise<PlanProduct[]>} | null = null;
let recipeSnapshot:{at:number;results:Promise<StoredRecipeResult[]>}|null=null;
function recipeResults(){
 if(recipeSnapshot&&Date.now()-recipeSnapshot.at<TTL)return recipeSnapshot.results;
 const results=listRecipeOptimizerResults();
 recipeSnapshot={at:Date.now(),results};
 results.catch(()=>{if(recipeSnapshot?.results===results)recipeSnapshot=null;});
 return results;
}

// 밑반찬(메인 옆 곁들임) 목록: "밑반찬 추천"에서만 쓴다. 메인 목록과 따로 같은 방식으로 캐시한다.
let cachedSides: {at: number; products: Promise<PlanProduct[]>} | null = null;
export async function sideProducts(): Promise<PlanProduct[]> {
 if (cachedSides && Date.now() - cachedSides.at < TTL) return cachedSides.products;
 const products = recipeResults().then(results=>recipeProductsFromResults(results,'side').map(slimRecipe));
 cachedSides = {at: Date.now(), products};
 products.catch(() => { if (cachedSides?.products === products) cachedSides = null; });
 return products;
}

export async function planProducts():Promise<PlanProduct[]> {
 if (cached && Date.now() - cached.at < TTL) return cached.products;
 const products = Promise.all([recipeResults(),listPairings()]).then(([results,relations]) => applyPairings(recipeProductsFromResults(results),recipeProductsFromResults(results,'side'),relations).map(slimRecipe));
 cached = {at: Date.now(), products};
 products.catch(() => { if (cached?.products === products) cached = null; });
 return products;
}

// 재료마다 붙어 있던, 화면·계산에서 쓰지 않는 필드(AI 메모·검색어·갱신 시각 등)를 뺀다. 같은 재료가
// 수백 개 레시피에 반복돼 응답이 수 MB씩 불어났다. 영양 계산(servingNutrients)·장보기에 쓰는 값은 그대로.
export function slimRecipe(p: PlanProduct): PlanProduct {
 if (!p.recipe) return p;
 return {...p, recipe: {...p.recipe, ingredients: p.recipe.ingredients.map((part) => ({...part, product: slimIngredient(part.product)}))}};
}
function slimIngredient(p: PlanProduct): PlanProduct {
 const rest: Record<string, unknown> = {...p, nutritionEstimate: p.nutritionEstimate ? {fields: p.nutritionEstimate.fields} : p.nutritionEstimate};
 for (const key of ['searchQuery', 'updatedAt', 'nutritionSourceName', 'portions', 'protein', 'inWeeklyCart', 'servingNote']) delete rest[key];
 return rest as unknown as PlanProduct;
}

export function clearPlanCatalog(){cached=null;cachedSides=null;recipeSnapshot=null;}
