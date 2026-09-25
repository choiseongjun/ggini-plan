import {NextRequest, NextResponse} from 'next/server';
import {sessionUser, sameOrigin, authFailure} from '../../../../lib/auth';
import {loadPlanCatalog, pickProducts} from '../../../../lib/plan-service';
import {todayContext} from '../../../../lib/today-context-server';
import {shoppingBudgetGuide} from '../../../../lib/shopping-budget';
import {shoppingAvailabilityMessage} from '../../../../lib/shopping-availability';
import {pickerItems} from '../../../../lib/plan-picker';
import {logRecommendations} from '../../../../lib/recommendation-log';
import {sideProducts} from '../../../../lib/shopping-plan-catalog';
import {pickSides, sideFit, type DishTraits, type SideExtra, type WesternPick} from '../../../../lib/side-pairing';
import {foodReferencesByCodes} from '../../../../lib/food-reference';
import westernPairings from '../../../../data/western-pairings.json';
import {allowsExcludedFoods} from '../../../../lib/shopping-exclusions';
import dishTraits from '../../../../data/dish-traits.json';
import {alternativesFor, basketTotal, mealSchedule, parseConditions, recommendShopping, slotCandidates, slotLabels, swapMeal, swapReasons, validMealIds, type PlanConditions, type SwapReason} from '../../../../lib/shopping-plan';

// 추천 계산은 서버에서 한다. 휴대폰은 전체 메뉴(수 MB)를 받지 않고, 결과 식단과 지금 보는 후보만 받는다.
export const runtime = 'nodejs';
export const maxDuration = 60;
const json = (data: unknown, status = 200) => NextResponse.json(data, {status, headers: {'Cache-Control': 'no-store'}});
const won = (n: number) => `${Math.round(n).toLocaleString('ko-KR')}원`;
const MAX_IDS = 70;
const validIds = (value: unknown, allowEmpty = false): value is string[] =>
 Array.isArray(value) && value.length <= MAX_IDS && value.every((id) => typeof id === 'string' && id.length <= 200 && (allowEmpty || id.length > 0));

export async function POST(request: NextRequest) {
 if (!sameOrigin(request)) return authFailure('요청을 확인해 주세요.', 403);
 const raw = await request.text();
 if (raw.length > 200_000) return authFailure('요청이 너무 커요.', 413);
 let input: Record<string, unknown>;
 try { input = JSON.parse(raw); } catch { return authFailure('입력을 확인해 주세요.', 400); }
 if (!input || typeof input !== 'object') return authFailure('입력을 확인해 주세요.', 400);
 try {
  const user = await sessionUser(request);
  const catalog = await loadPlanCatalog(user?.id);
  const {products} = catalog;
  const conditions = input.conditions === undefined ? null : parseConditions(input.conditions);
  if (input.conditions !== undefined && !conditions) return authFailure('챙길 끼니와 조건을 확인해 주세요.', 400);
  const today = async () => user ? await todayContext(user.id, products, catalog.personalization, catalog.health).catch(() => null) : null;
  const slotIndex = (c: PlanConditions) => typeof input.index === 'number' && Number.isInteger(input.index) && input.index >= 0 && input.index < c.meals ? input.index : null;

  switch (input.action) {
   case 'recommend': {
    const c = conditions;
    if (!c) return authFailure('챙길 끼니와 조건을 확인해 주세요.', 400);
    if (catalog.personalization.blocked) return authFailure('현재 신체 정보에서는 자동 맞춤 추천을 제공하지 않아요. 마이페이지 안내를 확인해 주세요.', 422);
    const availability = shoppingAvailabilityMessage(products, c);
    if (availability) return authFailure(availability, 422);
    const missing = mealSchedule(c).find((_, i) => !slotCandidates(products, c, i).length);
    if (missing) return authFailure(`${slotLabels[missing.slot]}에 맞는 메뉴가 부족해요. 해당 끼니를 빼거나 요리 수준·식단 목표·제외 재료를 조정해 주세요.`, 422);
    // 예산 안내(최저 구성 탐색)는 예산 상한이 있을 때만 필요하다.
    const guide = c.budget < 1000000 ? shoppingBudgetGuide(products, c) : null;
    if (guide && !guide.approximate && guide.minimum !== null && c.budget < guide.minimum) return authFailure(`선택한 ${c.meals}끼를 준비하려면 최소 ${won(guide.minimum)}이 필요해요.`, 422);
    const previous = validIds(input.previous) ? input.previous : [];
    const seed = typeof input.seed === 'number' && Number.isFinite(input.seed) ? input.seed : undefined;
    const context = await today();
    const ids = recommendShopping(products, c, false, previous, seed, context);
    if (!ids) return authFailure('현재 조건으로는 중복 없는 식단을 채울 수 없어요. 끼니 수를 줄이거나 요리 수준·식단 목표·제외 재료·재료비 상한을 조정해 주세요.', 422);
    if (user) await logRecommendations(user.id, c, ids, 'recommend');
    return json({ids, products: pickProducts(products, ids), today: context, personalization: catalog.personalization});
   }
   case 'swap': {
    const c = conditions, ids = input.ids;
    if (!c || !validIds(ids) || ids.length !== c.meals) return authFailure('식단을 확인해 주세요.', 400);
    const index = slotIndex(c);
    if (index === null) return authFailure('바꿀 끼니를 확인해 주세요.', 400);
    const reason = typeof input.reason === 'string' && Object.hasOwn(swapReasons, input.reason) ? input.reason as SwapReason : undefined;
    const next = swapMeal(ids, index, products, c, reason, await today());
    if (user && next) await logRecommendations(user.id, c, next, 'swap', index);
    return json({ids: next, products: pickProducts(products, next ?? ids)});
   }
   case 'alternatives': {
    const c = conditions, ids = input.ids;
    if (!c || !validIds(ids, true) || ids.length !== c.meals) return authFailure('식단을 확인해 주세요.', 400);
    const index = slotIndex(c);
    if (index === null) return authFailure('끼니를 확인해 주세요.', 400);
    const limit = typeof input.limit === 'number' && Number.isInteger(input.limit) ? Math.min(12, Math.max(1, input.limit)) : 6;
    const alternatives = alternativesFor(products, ids, c, index, limit);
    return json({products: [...alternatives, ...pickProducts(products, ids.filter(Boolean))]});
   }
   case 'picker': {
    const c = conditions, ids = input.ids;
    if (!c || !validIds(ids, true) || ids.length !== c.meals) return authFailure('식단을 확인해 주세요.', 400);
    const index = slotIndex(c);
    if (index === null) return authFailure('끼니를 확인해 주세요.', 400);
    return json({items: pickerItems(products, ids, index, c), current: basketTotal(ids.filter(Boolean), products, c.owned, c.supply, c.people)});
   }
   case 'sides': {
    // 메인 하나에 어울리는 밑반찬 3개(AI로 판정해 둔 특징으로 규칙 짝짓기). 제외 재료는 빼고 고른다.
    const id = typeof input.id === 'string' ? input.id : '';
    const main = pickProducts(products, [id])[0];
    if (!main) return authFailure('메뉴를 확인해 주세요.', 400);
    // 양식·빵·샐러드: 밑반찬 대신 AI로 골라 둔 곁들임(음료·수프·샐러드·빵·소스·피클).
    if (sideFit(main) === 'none') {
     const picks = (westernPairings as Record<string, WesternPick[]>)[main.id] ?? [];
     const refs = new Map((await foodReferencesByCodes(picks.map((p) => p.code).filter(Boolean))).map((r) => [r.code, r]));
     const extras: SideExtra[] = picks.map((p) => { const r = p.code ? refs.get(p.code) : undefined; return {name: r?.name ?? p.name, kind: p.kind, reason: p.reason, kcal: r?.kcal ?? null, serving: r ? `${Math.round(r.servingAmount)}${r.servingUnit}` : null}; });
     return json({sides: [], extras});
    }
    const excluded = conditions?.excluded ?? catalog.excluded;
    const sides = pickSides(main, await sideProducts(), dishTraits as Record<string, DishTraits>, 3, (s) => !allowsExcludedFoods(s, excluded));
    return json({sides: sides.map((s) => ({reason: s.reason, product: s.product})), extras: []});
   }
   case 'products': {
    const ids = input.ids;
    if (!validIds(ids, true)) return authFailure('메뉴를 확인해 주세요.', 400);
    const found = pickProducts(products, ids.filter(Boolean));
    // 저장해 둔 식단을 다시 열 때: 지금 메뉴·가격 기준으로도 그대로 쓸 수 있는지 함께 알려 준다.
    const valid = conditions ? validMealIds(ids, products, conditions) && basketTotal(ids, products, conditions.owned, conditions.supply, conditions.people) <= conditions.budget : undefined;
    return json({products: found, valid});
   }
   default:
    return authFailure('요청을 확인해 주세요.', 400);
  }
 } catch {
  return authFailure('추천을 계산하지 못했어요. 잠시 후 다시 시도해 주세요.', 503);
 }
}
