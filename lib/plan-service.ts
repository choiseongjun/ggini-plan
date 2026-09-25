import {getPool} from './db';
import {planProducts} from './shopping-plan-catalog';
import {personalizeProducts} from './shopping-personalization';
import {defaultDiet, parseDiet} from './meal-plan';
import type {PlanProduct} from './shopping-plan';

// 사용자 신체 정보·목표로 점수를 매긴 메뉴 전체. 추천 계산은 서버에서만 이 목록으로 한다 — 휴대폰에는 필요한 메뉴만 보낸다.
export async function loadPlanCatalog(userId?: string, selectedIds?: string[]) {
 const [profileResult, catalog] = await Promise.all([userId ? getPool().query('SELECT height::float8,weight::float8,age,sex,activity,meals,pregnancy,diet_preferences,nutrition_target FROM body_profiles WHERE user_id=$1', [userId]) : Promise.resolve(null), planProducts()]);
 const row = profileResult?.rows[0];
 const diet = parseDiet(row?.diet_preferences) ?? defaultDiet;
 const selected = selectedIds === undefined ? catalog : pickProducts(catalog, selectedIds);
 const filtered = personalizeProducts(selected, row, row?.diet_preferences, row?.nutrition_target);
 // 제외 재료는 추천 조건(conditions.excluded)에서 다시 적용되므로, 계산에는 제외 전 목록을 쓴다.
 const base = diet.excluded.length ? personalizeProducts(selected, row, {...diet, excluded: []}, row?.nutrition_target).products : filtered.products;
 return {personalization: filtered.personalization, products: base, excluded: diet.excluded, health: diet.health ?? []};
}

export function pickProducts(products: PlanProduct[], ids: string[]) {
 const byId = new Map(products.map((p) => [p.id, p]));
 return [...new Set(ids)].flatMap((id) => { const p = byId.get(id); return p ? [p] : []; });
}
