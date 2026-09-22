import type { PlanProduct } from './shopping-plan';
import {governmentOptimizedRecipeProducts} from './recipe-optimizer-plan';

// Retailer-catalog candidates (Kurly/Oasis/Coupang real products, hand-authored recipes, combo
// meals) are intentionally removed here per explicit instruction: the home recommendation now
// draws only from government-DB-targeted synthesized recipes (lib/recipe-optimizer-plan.ts).
// Coverage is currently small (as many dishes as have an approved template + saved result in
// recipe_optimizer_results — see /admin/recipe-optimizer), so most meal slots/budgets will have
// few or no candidates until more templates and saved recipes are added.
export async function planProducts():Promise<PlanProduct[]> {
 return governmentOptimizedRecipeProducts();
}
