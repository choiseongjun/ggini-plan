import {readShoppingDraft} from './shopping-draft';
import type {PlanProduct} from './shopping-plan';

const MAX_AGE = 24 * 60 * 60 * 1000;
const signature = (draft: NonNullable<ReturnType<typeof readShoppingDraft>>) => JSON.stringify([draft.conditions, draft.mealIds]);

// Display-only snapshot, scoped by the caller's account/market draft key.
// Server validation remains mandatory before saving or changing a restored plan.
export function encodePlanPreview(draftRaw: string | null, products: PlanProduct[], now = Date.now()): string | null {
  const draft = readShoppingDraft(draftRaw);
  if (!draft || !draft.mealIds.length || draft.mealIds.length !== draft.conditions.meals || !draft.mealIds.every(Boolean)) return null;
  const selected = [...new Set(draft.mealIds)].map(id => products.find(p => p.id === id));
  if (selected.some(p => !p)) return null;
  const raw = JSON.stringify({version: 1, at: now, signature: signature(draft), products: selected});
  return raw.length <= 1_000_000 ? raw : null;
}

export function readPlanPreview(raw: string | null, draftRaw: string | null, now = Date.now()) {
  try {
    const draft = readShoppingDraft(draftRaw), value = JSON.parse(raw ?? 'null');
    if (!draft || value?.version !== 1 || !Number.isFinite(value.at) || value.at > now || now - value.at > MAX_AGE || value.signature !== signature(draft)) return null;
    if (!Array.isArray(value.products) || !draft.mealIds.length || draft.mealIds.length !== draft.conditions.meals) return null;
    if (!value.products.every((p: PlanProduct) => p && typeof p.id === 'string' && typeof p.name === 'string' && Number.isFinite(p.price) && p.servings > 0)) return null;
    if (!draft.mealIds.every(id => id && value.products.some((p: PlanProduct) => p.id === id))) return null;
    return {conditions: draft.conditions, mealIds: draft.mealIds, products: value.products as PlanProduct[]};
  } catch { return null; }
}
