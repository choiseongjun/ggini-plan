import type {PlanProduct, MealSlot} from './shopping-plan';
import {listRecipeOptimizerResults, type StoredRecipeResult} from './recipe-optimizer-store';
import {ingredientNutritionTable} from './recipe-ingredient-data';
import type {AiIngredient} from './recipe-ai-ingredients';
import {excludedFoodAliases, type ExcludedFood} from './excluded-foods';
import {inferFoodType} from './catalog-food-types';
import {pickDishVisual} from './recipe-dish-visuals';
import {canonicalIngredient,isWater,PANTRY} from './ingredient-canonical';
import dishRoles from '../data/dish-roles.json';
import breakfastDishes from '../data/breakfast-dishes.json';
import noRiceDishes from '../data/no-rice.json';
// 아침으로 흔히 먹는 메뉴(죽·국+밥·계란 요리·김밥…, scripts/classify-breakfast.mjs로 1회 분류).
const breakfast = new Set<string>(breakfastDishes);
// 따로 밥 한 공기를 곁들이지 않는 메뉴(파스타·스테이크·샐러드 등, scripts/expand-menu.ts가 GPT로 판정).
const noRice = new Set<string>(noRiceDishes);

// 메뉴가 한국 가정식에서 메인·밑반찬·국찌개·한 그릇 중 무엇인지(scripts/classify-dish-roles.mjs, GPT 1회 분류).
// 콩자반·멸치볶음처럼 단백질이 높아도 밑반찬인 음식은 규칙으로 가려내기 어려워 분류 결과를 쓴다.
type DishRole = 'main' | 'side' | 'soup' | 'one-bowl' | 'other';
const roles = dishRoles as Record<string, DishRole>;
// 분류가 반찬·기타로 잡았지만 보통 메인으로 먹는 요리 (직접 확인해 바로잡은 것).
const MAIN_OVERRIDE = /^(갈비찜|주꾸미볶음|낙지볶음|오징어볶음|순대볶음|해물볶음|소고기볶음|닭튀김|닭볶음탕)/;

// 같은 재료(정규화된 이름)는 식단 전체에서 한 상품·한 포장 규격으로 계산한다. 포장 규격과 g당 가격은
// 레시피마다 AI가 추정한 값의 중앙값. 기본 양념은 집에 있다고 보고 구매 금액에서 뺀다.
type CanonicalPack={packGrams:number;price:number;pantry:boolean};
const median=(values:number[])=>{const v=[...values].sort((a,b)=>a-b);return v[Math.floor(v.length/2)];};
function canonicalPacks(results:StoredRecipeResult[]){
 const groups=new Map<string,{grams:number[];perGram:number[]}>();
 for(const r of results)for(const i of r.aiIngredients?.ingredients??[]){
  const key=canonicalIngredient(i.name);if(isWater(key))continue;
  const g=groups.get(key)??{grams:[],perGram:[]};g.grams.push(i.packGrams);g.perGram.push(i.packPriceWon/i.packGrams);groups.set(key,g);
 }
 return new Map([...groups].map(([key,g])=>{const packGrams=Math.round(median(g.grams));const pantry=PANTRY.has(key);return [key,{packGrams,price:pantry?0:Math.round(median(g.perGram)*packGrams),pantry}];}));
}

function allergensFromName(name: string): ExcludedFood[] {
 return (Object.keys(excludedFoodAliases) as ExcludedFood[]).filter((key) => excludedFoodAliases[key].some((alias) => name.includes(alias)));
}

const ingredientById = new Map(ingredientNutritionTable.map((i) => [i.id, i]));

// Maps each hand-seeded ingredient to the app's structured allergen/exclusion keys (lib/excluded-foods.ts),
// so a saved "제외 재료" preference or free-text avoid-word can actually filter these recipes instead of
// silently treating them as "unknown → excluded" (candidates()/allowsExcludedFoods both require a non-null
// avoidanceText once any exclusion is active — leaving this empty was hiding every recipe from anyone
// with any exclusion set at all, regardless of whether the recipe actually contained that food).
const ingredientAllergenTags: Record<string, string[]> = {
 'rice-raw': ['rice'], 'noodle-wheat': ['wheat'], onion: ['onion'], mushroom: ['mushroom'],
 chunjang: ['soy'], 'soy-sauce': ['soy', 'wheat'], squid: ['squid'], shrimp: ['shrimp'],
 pork: ['pork'], beef: ['beef'], 'chicken-breast': ['chicken'], egg: ['egg'], tofu: ['soy'],
 garlic: ['garlic'], doenjang: ['soy'], gochujang: ['soy'], 'sesame-oil': ['sesame'],
 'bean-sprout': ['soy'], flour: ['wheat'],
};

// The optimizer targets govDB's 100g/100ml basis, which is far smaller than an actual single
// serving of a rice/noodle one-bowl dish (commonly ~300g). Scaling every ingredient's grams by
// this factor preserves the optimized ratio exactly (all math here is linear in grams) while
// turning the result into a realistic portion size for a real meal/budget.
const SERVING_SCALE = 3;

// Templates whose target dish is already a complete one-bowl meal the way Koreans actually eat it
// (rice/noodles already part of the dish itself) — these get no extra rice or side dishes.
const STANDALONE_TEMPLATES = new Set(['jjajang', 'stirfry-meat-rice', 'juk', 'myeon', 'bap-etc', 'western-breakfast']);
// 'stirfry-meat-rice'·'jjajang' also match plain 반찬 볶음(호박볶음·제육볶음·짜장소스…). Only when the name itself
// carries the staple (볶음밥·덮밥·우동…) is it a one-bowl meal; otherwise it gets rice + 밑반찬 like any other dish —
// serving a bare 116kcal 호박볶음 as "한 끼" is what made plans feel thin.
const STAPLE_IN_NAME = /밥|죽|면|국수|라면|라멘|우동|수제비|떡볶이|리조또|리소토|파스타|스파게티|누룽지/;
const isOneBowl = (templateId: string, name: string) =>
  STANDALONE_TEMPLATES.has(templateId) && (!['stirfry-meat-rice', 'jjajang'].includes(templateId) || STAPLE_IN_NAME.test(name.split('_')[0]));

// Everything else (찌개/국/구이/나물/조림/튀김/전/찜/김치) is a single dish, not a full meal on its own —
// a real Korean 한 끼 pairs it with rice and a couple of small side dishes (밑반찬). Presenting the bare
// dish alone as "one meal" is what produced both the absurd 8.3kcal 무국물 case and — even once nutrition
// is scaled sensibly, as with 미트볼조림 at ~660kcal — an unrealistic "no one eats just this" plate.
// The pairing draws from the same 'rice-raw' ingredient as every other recipe (see ingredientProduct
// below), converting a real cooked-rice serving back to its raw-rice-equivalent weight, so a week's
// worth of rice pairings pools into the same purchase instead of inventing a separate 즉석밥 SKU.
const RICE_PAIRING_COOKED_GRAMS = 210;
const RAW_TO_COOKED_RICE_RATIO = 2.5;
const RICE_PAIRING_RAW_GRAMS = Math.round(RICE_PAIRING_COOKED_GRAMS / RAW_TO_COOKED_RICE_RATIO);

// The 나물/김치 recipes this same optimizer already generates ARE ordinary Korean side dishes — reusing
// them as 밑반찬 (rather than inventing a separate side-dish system) keeps every number sourced the same
// way as the main dish. A real banchan portion is much smaller than a main dish serving, hence the
// separate, smaller scale (roughly 50g from each side's own 100g-basis recipe).
const SIDE_DISH_TEMPLATES = new Set(['namul', 'kimchi']);
const SIDE_SERVING_SCALE = 0.5;

// A recipe using 11g of scallion still means buying a whole ~500g bundle at the store — pricing per
// gram-used (the previous approach) made every recipe look implausibly cheap and let a 50,000원 budget
// go almost entirely unspent. Each ingredient is instead a single global PlanProduct priced at its
// realistic whole-pack cost (lib/recipe-ingredient-data.ts packGrams), reused by every recipe that
// needs it; `packs` on each usage is the fraction of one pack that use consumes. purchaseBasket() (the
// same shared logic real-catalog recipes use) already pools fractional pack usage of the same product
// id across an entire week's plan and rounds up to whole packages bought — no changes needed there.
function ingredientProduct(id: string, now: string): PlanProduct {
 const source = ingredientById.get(id);
 const packGrams = source?.packGrams ?? 100;
 const per100g = source?.per100g ?? {kcal: 0, carbohydrate: 0, protein: 0, fat: 0, sugar: 0, sodium: 0};
 const pantry = PANTRY.has(canonicalIngredient(source?.name ?? id));
 const price = pantry ? 0 : Math.round((source?.pricePer100gWon ?? 0) * packGrams / 100);
 const scale = (n: number) => Math.round(n * packGrams / 100 * 1000) / 1000;
 return {
  id: `recipe-opt-ingredient-${id}`, emoji: '🧂', name: source?.name ?? id,
  detail: pantry ? '기본 양념 · 집에 있다고 보고 장보기 금액에서 뺐어요' : `${packGrams}g(실제 판매 단위 1개) · 표준 소매가 추정치 (실제 구매 링크 없음)`, price, portions: '1포장',
  protein: '', color: 'sand', searchQuery: source?.name ?? id, unit: 'g', quantity: packGrams,
  category: 'ingredient', inWeeklyCart: false, productImageUrl: null, productUrl: null,
  nutritionSourceName: '유사 레시피 원재료 참고값', nutritionSourceUrl: null, nutritionPhotoUrl: null,
  nutritionBasis: `${packGrams}g당`,
  nutritionEstimate: {fields: ['caloriesKcal', 'proteinG', 'carbohydratesG', 'fatG', 'sodiumMg'], note: source?.sourceNote ?? '참고값', model: 'recipe-optimizer', estimatedAt: now},
  caloriesKcal: scale(per100g.kcal), proteinG: scale(per100g.protein), carbohydratesG: scale(per100g.carbohydrate), fatG: scale(per100g.fat), sodiumMg: scale(per100g.sodium),
  updatedAt: now, servings: 1, servingGrams: packGrams, servingNote: '실제 판매 단위(1포장) 기준', avoidanceText: null,
 };
}

// GPT-composed ingredients (lib/recipe-ai-ingredients.ts) aren't drawn from the fixed 26-item table —
// each one carries its own self-estimated nutrition/pack size/price, so its product is built directly
// from that instead of an ingredientNutritionTable lookup. Still a single global product per distinct
// name so purchaseBasket() pools it the same way across a plan (e.g. two different dishes both calling
// for "양파" this week share one purchase) — 정규화 the name for a stable, collision-resistant id.
function aiIngredientProduct(ingredient: AiIngredient, now: string, key: string, pack: CanonicalPack): PlanProduct {
 const slug = key.toLowerCase().replace(/[^a-z0-9가-힣]+/g, '-').replace(/^-+|-+$/g, '') || 'ingredient';
 const price = pack.price;
 const scale = (n: number) => Math.round(n * pack.packGrams / 100 * 1000) / 1000;
 return {
  id: `recipe-opt-ingredient-ai-${slug}`, emoji: '🧂', name: key,
  detail: pack.pantry ? '기본 양념 · 집에 있다고 보고 장보기 금액에서 뺐어요' : `${pack.packGrams}g(판매 단위 1개) · AI 추정 소매가 (실제 구매 링크 없음)`, price, portions: '1포장',
  protein: '', color: 'sand', searchQuery: key, unit: 'g', quantity: pack.packGrams,
  category: 'ingredient', inWeeklyCart: false, productImageUrl: null, productUrl: null,
  nutritionSourceName: 'AI 추정 재료 참고값', nutritionSourceUrl: null, nutritionPhotoUrl: null,
  nutritionBasis: `${pack.packGrams}g당`,
  nutritionEstimate: {fields: ['caloriesKcal', 'proteinG', 'carbohydratesG', 'fatG', 'sodiumMg'], note: 'GPT가 요리명에 맞춰 구성·추정한 재료', model: 'gpt-recipe-ingredients', estimatedAt: now},
  caloriesKcal: scale(ingredient.caloriesKcal), proteinG: scale(ingredient.proteinG), carbohydratesG: scale(ingredient.carbohydratesG), fatG: scale(ingredient.fatG), sodiumMg: scale(ingredient.sodiumMg),
  updatedAt: now, servings: 1, servingGrams: pack.packGrams, servingNote: '실제 판매 단위(1포장) 기준', avoidanceText: null,
  allergens: allergensFromName(ingredient.name),
 };
}

function aiUsageEntries(ingredients: AiIngredient[], now: string, packs: Map<string, CanonicalPack>) {
 return ingredients.flatMap((ingredient) => {
  const key = canonicalIngredient(ingredient.name);
  const pack = packs.get(key);
  if (!pack) return [];
  const product = aiIngredientProduct(ingredient, now, key, pack);
  return [{product, packs: ingredient.grams / pack.packGrams, label: `${ingredient.name.split(/[(（]/)[0].trim()} ${ingredient.grams}g${pack.pantry ? ' (기본 양념)' : ''}`, ingredientId: undefined}];
 });
}



// Builds one recipe's ingredient-usage entries (grams already scaled to a real portion) into the
// {product, packs, label} shape purchaseBasket()/basket() expect, using the shared global ingredient
// products above so usage pools correctly across every recipe in a plan.
function usageEntries(entries: {ingredientId: string; grams: number}[], scale: number, now: string, labelPrefix?: string, group?: string) {
 return entries.flatMap((entry) => {
  const grams = Math.round(entry.grams * scale);
  if (grams <= 0) return [];
  const source = ingredientById.get(entry.ingredientId);
  const packGrams = source?.packGrams ?? 100;
  const product = ingredientProduct(entry.ingredientId, now);
  const label = `${labelPrefix ? `${labelPrefix}: ` : ''}${product.name} ${grams}g`;
  return [{product, packs: grams / packGrams, label, group, ingredientId: entry.ingredientId}];
 });
}

// Converts a saved govDB-target recipe (lib/recipe-optimizer.ts) into a real PlanProduct so it can
// flow through the existing beam search unchanged. There is no real catalog product or seller
// behind any of this — price/nutrition are the optimizer's own estimates, explicitly labelled as
// such everywhere the value could reach a person, and productUrl is always null (nothing to link to).
export async function governmentOptimizedRecipeProducts(): Promise<PlanProduct[]> {
 const results = await listRecipeOptimizerResults();
 const packs = canonicalPacks(results);
 const now = new Date().toISOString();
 // 김치/나물 자체는 반찬이지 "한 끼"가 아니다 — 위 두 풀로 다른 요리의 밑반찬 재료로는 계속 쓰지만,
 // 단독으로는 추천 후보(끼니)에 올리지 않는다. 그렇지 않으면 예산이 넉넉할 때 다양성 점수를 노리고
 // "물김치"나 "배추김치" 한 그릇이 그 자체로 저녁 메뉴로 뽑히는 일이 생긴다.
 // Recipes still on the deterministic generic-ingredient mix (no GPT-composed list yet) stay out of
 // recommendations until scripts/synthesize-ai-ingredients.mjs has run for them.
 // 한 끼 = 메인 요리 + 밥 한 공기. 밥만 곁들여 먹기엔 허전한 반찬·맑은 국(요리 자체 단백질 10g 미만:
 // 호박볶음·고구마조림·콩나물국…)은 메인으로 추천하지 않는다. 밥·면이 이미 든 한 그릇 요리는 예외.
 const mainProteinOf = (r: StoredRecipeResult) => (r.aiIngredients?.ingredients ?? []).reduce((sum, i) => sum + i.proteinG * i.grams / 100, 0);
 const isMeal = (r: StoredRecipeResult) => {
  if (MAIN_OVERRIDE.test(r.targetName) || r.templateId === 'western-breakfast') return true;
  const role = roles[r.foodCode];
  // 아직 분류되지 않은 새 메뉴는 이전 규칙(한 그릇이거나 요리 자체 단백질 10g 이상)으로.
  // 확장으로 추가한 메뉴는 분류가 끝난 뒤에만 추천한다.
  if (!role) return r.source === 'optimizer' && (isOneBowl(r.templateId, r.targetName) || mainProteinOf(r) >= 10);
  return role === 'main' || role === 'one-bowl' || (role === 'soup' && mainProteinOf(r) >= 10);
 };
 return results.filter((result) => !SIDE_DISH_TEMPLATES.has(result.templateId) && result.aiIngredients?.ingredients.length && isMeal(result)).map((result) => {
  // A GPT-composed realistic ingredient list (scripts/synthesize-ai-ingredients.mjs), when present,
  // replaces the deterministic 26-generic-ingredient mix for the main dish — it isn't a closer numeric
  // fit to the target, but it's an ingredient list that actually resembles the named dish. Rice/side
  // pairing below stays the same either way.
  const ai = result.aiIngredients?.ingredients.length ? result.aiIngredients.ingredients : null;
  const baseIngredients = ai ? aiUsageEntries(ai, now, packs) : usageEntries(result.ingredients, SERVING_SCALE, now);
  const mainGrams = ai ? ai.reduce((sum, i) => sum + i.grams, 0) : Math.round(result.totalGrams * SERVING_SCALE);
  const mainCalories = ai ? ai.reduce((sum, i) => sum + i.caloriesKcal * i.grams / 100, 0) : (result.predicted.kcal ?? 0) * SERVING_SCALE;
  const mainProtein = ai ? ai.reduce((sum, i) => sum + i.proteinG * i.grams / 100, 0) : (result.predicted.protein ?? 0) * SERVING_SCALE;

  const needsPairing = !isOneBowl(result.templateId, result.targetName) && !noRice.has(result.foodCode) && !(result.source !== 'optimizer' && roles[result.foodCode] === 'one-bowl');
  const ricePairing = needsPairing ? usageEntries([{ingredientId: 'rice-raw', grams: RICE_PAIRING_RAW_GRAMS}], 1, now, '함께 먹는 밥') : [];

  // 밑반찬(김치·나물)은 자동으로 붙이지 않는다 — 한 끼는 메인 요리와 밥 한 공기.
  const sides: StoredRecipeResult[] = [];
  const sideIngredients = sides.flatMap((side) => usageEntries(side.ingredients, SIDE_SERVING_SCALE, now, `${side.targetName} 밑반찬`, side.targetName));
  const sideGrams = sides.reduce((sum, side) => sum + Math.round(side.totalGrams * SIDE_SERVING_SCALE), 0);
  const sideCalories = sides.reduce((sum, side) => sum + (side.predicted.kcal ?? 0) * SIDE_SERVING_SCALE, 0);
  const sideProtein = sides.reduce((sum, side) => sum + (side.predicted.protein ?? 0) * SIDE_SERVING_SCALE, 0);
  const riceCalories = needsPairing ? (ingredientById.get('rice-raw')?.per100g.kcal ?? 0) * RICE_PAIRING_RAW_GRAMS / 100 : 0;
  const riceProtein = needsPairing ? (ingredientById.get('rice-raw')?.per100g.protein ?? 0) * RICE_PAIRING_RAW_GRAMS / 100 : 0;

  const ingredients = [...baseIngredients, ...ricePairing, ...sideIngredients];
  // Each ingredient is a whole-pack product now — a recipe's own share of that pack's cost is
  // price × packs (the fraction of the pack this recipe uses), not the full pack price.
  const totalPrice = Math.round(ingredients.reduce((sum, i) => sum + i.product.price * i.packs, 0));
  const totalGrams = mainGrams + (needsPairing ? RICE_PAIRING_COOKED_GRAMS : 0) + sideGrams;
  const slots: MealSlot[] = result.templateId === 'western-breakfast' ? ['breakfast'] : breakfast.has(result.foodCode) ? ['breakfast', 'lunch', 'dinner'] : ['lunch', 'dinner'];
  const visual = pickDishVisual(result.targetName);
  const avoidanceText = ingredients.map((i) => i.label).join(' ') || null;
  const allergens = [...new Set([
   ...(ai ? ai.flatMap((i) => allergensFromName(i.name)) : result.ingredients.flatMap((i) => ingredientAllergenTags[i.ingredientId] ?? [])),
   ...sides.flatMap((side) => side.ingredients.flatMap((i) => ingredientAllergenTags[i.ingredientId] ?? [])),
   ...(needsPairing ? ['rice'] : []),
  ])];
  const pairingNote = needsPairing
   ? sides.length
     ? `밥 ${RICE_PAIRING_COOKED_GRAMS}g과 밑반찬(${sides.map((s) => s.targetName).join(', ')})을 더해 실제 1인분(${totalGrams}g)으로 구성한`
     : `밥 ${RICE_PAIRING_COOKED_GRAMS}g을 더해 실제 1인분(${totalGrams}g)으로 구성한`
   : `실제 1인분(${totalGrams}g)으로 환산한`;
  return {
   id: `recipe-opt-${result.foodCode}`, emoji: visual.emoji, name: result.targetName,
   detail: result.source === 'ai-expansion' ? `AI가 추정한 영양·재료로 ${pairingNote} 레시피 · 정식 레시피가 아니며 표준 소매가로 추정한 가격이에요` : `정부DB 목표 영양(${result.targetBasisAmount === '100mL' ? '100mL 기준 · 100g으로 환산' : `${result.targetBasisAmount} 기준`})을 ${pairingNote} 유사 레시피 · 실제 이 음식의 정식 레시피가 아니며 표준 소매가로 추정한 가격이에요`,
   price: totalPrice, portions: '1인분', protein: '재료 합산 추정', color: visual.color, searchQuery: result.targetName, unit: '개', quantity: 1,
   category: 'other', inWeeklyCart: true, productImageUrl: result.imageUrl, productImageUrls: result.imageUrls, productUrl: null,
   nutritionSourceName: null, nutritionSourceUrl: null, nutritionPhotoUrl: null, nutritionBasis: null,
   caloriesKcal: null, proteinG: null, carbohydratesG: null, fatG: null, sodiumMg: null,
   allergens, allergyInfo: null, updatedAt: now,
   servings: 1, servingGrams: totalGrams, servingNote: `유사 레시피 1인분(${totalGrams}g 환산) · 재료 표준가·표준 영양 합산 추정`, avoidanceText,
   foodType: inferFoodType(result.targetName) ?? null,
   recipe: {
    minutes: 15, slots, family: `govdb-${result.templateId}`,
    steps: ai
     ? [result.aiIngredients!.note, 'GPT가 이 요리에 실제로 쓰일 만한 재료로 구성한 참고용 조합입니다. 정식 레시피가 아니며, 조리법은 재료별로 통상적인 방식을 따르세요.']
     : ['정부 식품영양성분DB의 목표 영양값에 맞춰 자동으로 근사한 재료 조합을 실제 1인분 분량으로 환산했어요.', '실제 이 음식의 정식 레시피가 아니라 영양 구성만 비슷한 참고용 조합입니다. 조리법은 재료별로 통상적인 방식을 따르세요.'],
    ingredients,
    nutrition: {
     calories: Math.round((mainCalories + riceCalories + sideCalories) * 10) / 10,
     protein: Math.round((mainProtein + riceProtein + sideProtein) * 10) / 10,
    },
   },
  } as PlanProduct;
 });
}
