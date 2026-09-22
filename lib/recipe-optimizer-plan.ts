import type {PlanProduct, MealSlot} from './shopping-plan';
import {listRecipeOptimizerResults, type StoredRecipeResult} from './recipe-optimizer-store';
import {ingredientNutritionTable} from './recipe-ingredient-data';
import {inferFoodType} from './catalog-food-types';
import {pickDishVisual} from './recipe-dish-visuals';

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
const STANDALONE_TEMPLATES = new Set(['jjajang', 'stirfry-meat-rice', 'juk', 'myeon', 'bap-etc']);

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
 const price = Math.round((source?.pricePer100gWon ?? 0) * packGrams / 100);
 const scale = (n: number) => Math.round(n * packGrams / 100 * 1000) / 1000;
 return {
  id: `recipe-opt-ingredient-${id}`, emoji: '🧂', name: source?.name ?? id,
  detail: `${packGrams}g(실제 판매 단위 1개) · 표준 소매가 추정치 (실제 구매 링크 없음)`, price, portions: '1포장',
  protein: '', color: 'sand', searchQuery: source?.name ?? id, unit: 'g', quantity: packGrams,
  category: 'ingredient', inWeeklyCart: false, productImageUrl: null, productUrl: null,
  nutritionSourceName: '유사 레시피 원재료 참고값', nutritionSourceUrl: null, nutritionPhotoUrl: null,
  nutritionBasis: `${packGrams}g당`,
  nutritionEstimate: {fields: ['caloriesKcal', 'proteinG', 'carbohydratesG', 'fatG', 'sodiumMg'], note: source?.sourceNote ?? '참고값', model: 'recipe-optimizer', estimatedAt: now},
  caloriesKcal: scale(per100g.kcal), proteinG: scale(per100g.protein), carbohydratesG: scale(per100g.carbohydrate), fatG: scale(per100g.fat), sodiumMg: scale(per100g.sodium),
  updatedAt: now, servings: 1, servingGrams: packGrams, servingNote: '실제 판매 단위(1포장) 기준', avoidanceText: null,
 };
}

function stableIndex(seed: string, mod: number): number {
 let h = 0;
 for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
 return mod > 0 ? h % mod : 0;
}

function pickSide(pool: StoredRecipeResult[], excludeFoodCode: string, seed: string): StoredRecipeResult | null {
 if (!pool.length) return null;
 const candidates = pool.filter((r) => r.foodCode !== excludeFoodCode);
 const usable = candidates.length ? candidates : pool;
 return usable[stableIndex(seed, usable.length)];
}

// Builds one recipe's ingredient-usage entries (grams already scaled to a real portion) into the
// {product, packs, label} shape purchaseBasket()/basket() expect, using the shared global ingredient
// products above so usage pools correctly across every recipe in a plan.
function usageEntries(entries: {ingredientId: string; grams: number}[], scale: number, now: string, labelPrefix?: string) {
 return entries.flatMap((entry) => {
  const grams = Math.round(entry.grams * scale);
  if (grams <= 0) return [];
  const source = ingredientById.get(entry.ingredientId);
  const packGrams = source?.packGrams ?? 100;
  const product = ingredientProduct(entry.ingredientId, now);
  const label = `${labelPrefix ? `${labelPrefix}: ` : ''}${product.name} ${grams}g`;
  return [{product, packs: grams / packGrams, label, ingredientId: entry.ingredientId}];
 });
}

// Converts a saved govDB-target recipe (lib/recipe-optimizer.ts) into a real PlanProduct so it can
// flow through the existing beam search unchanged. There is no real catalog product or seller
// behind any of this — price/nutrition are the optimizer's own estimates, explicitly labelled as
// such everywhere the value could reach a person, and productUrl is always null (nothing to link to).
export async function governmentOptimizedRecipeProducts(): Promise<PlanProduct[]> {
 const results = await listRecipeOptimizerResults();
 const now = new Date().toISOString();
 const kimchiPool = results.filter((r) => r.templateId === 'kimchi');
 const namulPool = results.filter((r) => r.templateId === 'namul');
 // 김치/나물 자체는 반찬이지 "한 끼"가 아니다 — 위 두 풀로 다른 요리의 밑반찬 재료로는 계속 쓰지만,
 // 단독으로는 추천 후보(끼니)에 올리지 않는다. 그렇지 않으면 예산이 넉넉할 때 다양성 점수를 노리고
 // "물김치"나 "배추김치" 한 그릇이 그 자체로 저녁 메뉴로 뽑히는 일이 생긴다.
 return results.filter((result) => !SIDE_DISH_TEMPLATES.has(result.templateId)).map((result) => {
  const baseIngredients = usageEntries(result.ingredients, SERVING_SCALE, now);

  const needsPairing = !STANDALONE_TEMPLATES.has(result.templateId);
  const ricePairing = needsPairing ? usageEntries([{ingredientId: 'rice-raw', grams: RICE_PAIRING_RAW_GRAMS}], 1, now, '함께 먹는 밥') : [];

  const kimchiSide = needsPairing && result.templateId !== 'kimchi' ? pickSide(kimchiPool, result.foodCode, `${result.foodCode}-kimchi`) : null;
  const namulSide = needsPairing && result.templateId !== 'namul' ? pickSide(namulPool, result.foodCode, `${result.foodCode}-namul`) : null;
  const sides = [kimchiSide, namulSide].filter((s): s is StoredRecipeResult => s !== null);
  const sideIngredients = sides.flatMap((side) => usageEntries(side.ingredients, SIDE_SERVING_SCALE, now, `${side.targetName} 밑반찬`));
  const sideGrams = sides.reduce((sum, side) => sum + Math.round(side.totalGrams * SIDE_SERVING_SCALE), 0);
  const sideCalories = sides.reduce((sum, side) => sum + (side.predicted.kcal ?? 0) * SIDE_SERVING_SCALE, 0);
  const sideProtein = sides.reduce((sum, side) => sum + (side.predicted.protein ?? 0) * SIDE_SERVING_SCALE, 0);
  const riceCalories = needsPairing ? (ingredientById.get('rice-raw')?.per100g.kcal ?? 0) * RICE_PAIRING_RAW_GRAMS / 100 : 0;
  const riceProtein = needsPairing ? (ingredientById.get('rice-raw')?.per100g.protein ?? 0) * RICE_PAIRING_RAW_GRAMS / 100 : 0;

  const ingredients = [...baseIngredients, ...ricePairing, ...sideIngredients];
  // Each ingredient is a whole-pack product now — a recipe's own share of that pack's cost is
  // price × packs (the fraction of the pack this recipe uses), not the full pack price.
  const totalPrice = Math.round(ingredients.reduce((sum, i) => sum + i.product.price * i.packs, 0));
  const totalGrams = result.totalGrams * SERVING_SCALE + (needsPairing ? RICE_PAIRING_COOKED_GRAMS : 0) + sideGrams;
  const slots: MealSlot[] = ['lunch', 'dinner'];
  const visual = pickDishVisual(result.targetName);
  const avoidanceText = ingredients.map((i) => i.label).join(' ') || null;
  const allergens = [...new Set([
   ...result.ingredients.flatMap((i) => ingredientAllergenTags[i.ingredientId] ?? []),
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
   detail: `정부DB 목표 영양(${result.targetBasisAmount} 기준)을 ${pairingNote} 유사 레시피 · 실제 이 음식의 정식 레시피가 아니며 표준 소매가로 추정한 가격이에요`,
   price: totalPrice, portions: '1인분', protein: '재료 합산 추정', color: visual.color, searchQuery: result.targetName, unit: '개', quantity: 1,
   category: 'other', inWeeklyCart: true, productImageUrl: result.imageUrl, productImageUrls: result.imageUrls, productUrl: null,
   nutritionSourceName: null, nutritionSourceUrl: null, nutritionPhotoUrl: null, nutritionBasis: null,
   caloriesKcal: null, proteinG: null, carbohydratesG: null, fatG: null, sodiumMg: null,
   allergens, allergyInfo: null, updatedAt: now,
   servings: 1, servingGrams: totalGrams, servingNote: `유사 레시피 1인분(${totalGrams}g 환산) · 재료 표준가·표준 영양 합산 추정`, avoidanceText,
   foodType: inferFoodType(result.targetName) ?? null,
   recipe: {
    minutes: 15, slots, family: `govdb-${result.templateId}`,
    steps: ['정부 식품영양성분DB의 목표 영양값에 맞춰 자동으로 근사한 재료 조합을 실제 1인분 분량으로 환산했어요.', '실제 이 음식의 정식 레시피가 아니라 영양 구성만 비슷한 참고용 조합입니다. 조리법은 재료별로 통상적인 방식을 따르세요.'],
    ingredients,
    nutrition: {
     calories: result.predicted.kcal === null ? null : Math.round((result.predicted.kcal * SERVING_SCALE + riceCalories + sideCalories) * 10) / 10,
     protein: result.predicted.protein === null ? null : Math.round((result.predicted.protein * SERVING_SCALE + riceProtein + sideProtein) * 10) / 10,
    },
   },
  } as PlanProduct;
 });
}
