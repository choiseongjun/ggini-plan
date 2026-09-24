import {servingNutrients} from './serving-nutrients';
import {alternativesFor,basketTotal,cookingDishId,dishBase,dishWords,productById,repeatsDailyMain,slotCandidates,type PlanConditions,type PlanProduct} from './shopping-plan';
import {categoryOf,type Category} from './menu-category';

// 메뉴 고르기 창의 한 줄. 서버가 영양·금액·고를 수 없는 이유까지 계산해 보내서, 화면은 전체 메뉴 목록 없이 그린다.
export type PickerItem = {
 p: PlanProduct; calories: number | null; protein: number | null; perMeal: number;
 category: Exclude<Category, 'all'>; search: string; total: number; blocked: string | null; recommended: boolean;
};

export const normalizeSearch = (text: string) => text.toLowerCase().replace(/[\s\[\]()·,._-]/g, '');

// 목록 표시용으로 재료·조리 단계를 뺀 메뉴. 고르면 전체 정보를 따로 받아 온다.
// 목록 한 줄에 그리는 것(사진·이름·출처 배지·가격)만 남긴다 — 수백 개를 보내므로 설명·영양 원본은 뺀다.
export function slimProduct(p: PlanProduct): PlanProduct {
 return {
  id: p.id, name: p.name, emoji: p.emoji, color: p.color, productImageUrl: p.productImageUrl,
  price: p.price, servings: p.servings, category: p.category, personalizationScore: p.personalizationScore,
  recipe: p.recipe ? {assembly: p.recipe.assembly, family: p.recipe.family, slots: p.recipe.slots, minutes: p.recipe.minutes, steps: [], ingredients: [], nutrition: p.recipe.nutrition} : undefined,
 } as PlanProduct;
}

export function pickerItems(products: PlanProduct[], ids: string[], index: number, conditions: PlanConditions, slim = true): PickerItem[] {
 // 끼니를 고를 때 플래너가 쓰는 규칙과 같게 — 목록에 보이는 건 실제로 고를 수 있어야 한다.
 const c = {...conditions, mealMode: 'mixed' as const, cooking: 'all' as const};
 const best = new Map<string, PlanProduct>();
 for (const p of slotCandidates(products, c, index)) {
  if (p.recipe && p.id.includes('--with--')) continue;
  const key = cookingDishId(p.id), prev = best.get(key);
  if (!prev || (p.personalizationScore ?? 0) > (prev.personalizationScore ?? 0)) best.set(key, p);
 }
 const recommended = new Set(alternativesFor(products, ids, conditions, index, 3).map((p) => cookingDishId(p.id)));
 const others = ids.flatMap((id, i) => { const q = i === index ? null : productById(products, id); return q ? [q] : []; });
 const currentId = ids[index];
 const blockReason = (p: PlanProduct) =>
  cookingDishId(p.id) === cookingDishId(currentId ?? '') ? '지금 메뉴'
  : ids.some((id, i) => i !== index && cookingDishId(id) === cookingDishId(p.id)) ? '다른 끼니에 있어요'
  : others.some((q) => dishBase(q) === dishBase(p) || dishWords(q) === dishWords(p)) ? '같은 음식이 이미 있어요'
  : repeatsDailyMain(ids, products, c, index, p) ? '같은 날 주재료 겹침' : null;
 return [...best.values()].map((p) => {
  const n = servingNutrients(p), category = categoryOf(p) as Exclude<Category, 'all'>;
  return {
   p: slim ? slimProduct(p) : p, calories: n.calories, protein: n.protein, perMeal: p.price / p.servings, category,
   search: normalizeSearch(`${p.name} ${p.recipe?.ingredients.map((i) => i.product.name).join(' ') ?? ''}`),
   total: basketTotal(ids.map((id, i) => i === index ? p.id : id), products, conditions.owned, conditions.supply, conditions.people),
   blocked: blockReason(p), recommended: recommended.has(cookingDishId(p.id)),
  };
 });
}
