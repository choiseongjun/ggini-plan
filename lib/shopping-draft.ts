import {parseConditions, type PlanConditions} from './shopping-plan';

type Draft = {conditions: PlanConditions; mealIds: string[]; savedAt: number};
export function readShoppingDraft(raw: string | null): Draft | null {
 try {
  const value = JSON.parse(raw ?? 'null');
  const conditions = parseConditions(value?.conditions);
  if (!conditions || !Array.isArray(value?.mealIds)
   || value.mealIds.some((id: unknown) => typeof id !== 'string')) return null;
  return {conditions, mealIds: value.mealIds, savedAt: Number.isFinite(value.savedAt) ? value.savedAt : 0};
 } catch { return null; }
}

// A newly chosen guest plan wins over an older account draft, including an
// account draft containing only settings. Never transfer a partial generation.
export function chooseShoppingDraft(accountRaw: string | null, guestRaw: string | null, resetAt?: string | null) {
 const reset = resetAt ? Date.parse(resetAt) : -Infinity;
 const account = readShoppingDraft(accountRaw);
 const guest = readShoppingDraft(guestRaw);
 const current = account && account.savedAt > reset ? account : null;
 const complete = guest && guest.mealIds.length === guest.conditions.meals && guest.mealIds.every(Boolean);
 if (complete && guest.savedAt > reset && (!current || !current.mealIds.length || guest.savedAt > current.savedAt)) {
  return {draft: guest, fromGuest: true};
 }
 return {draft: current, fromGuest: false};
}
