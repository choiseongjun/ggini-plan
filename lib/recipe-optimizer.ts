// Deterministic "similar-nutrition recipe" synthesis: given a finished dish's target nutrition
// (from foodsafety_nutrition_canonical, which has no ingredient list) and a small raw-ingredient
// nutrition table, search for a gram-level ingredient mix whose combined nutrition is close to
// the target. This explicitly does NOT reconstruct the dish's real recipe — see GeneratedRecipe.note.

export const nutrientKeys = ['kcal', 'carbohydrate', 'protein', 'fat', 'sugar', 'sodium'] as const;
export type NutrientKey = typeof nutrientKeys[number];
export type NutrientVector = Record<NutrientKey, number>;

export type FoodNutrition = {name: string; basisAmount: string; per100g: NutrientVector};
// packGrams is the realistic minimum retail unit this ingredient is actually sold in (a bundle of
// scallions, a bag of rice, a tub of doenjang) — recipes almost never use a whole pack, so pricing is
// applied per-pack (see lib/recipe-optimizer-plan.ts), not per-gram-used, the way real grocery shopping
// (and this app's own real-catalog recipes) actually works.
export type IngredientNutrition = {id: string; name: string; per100g: NutrientVector; sourceNote: string; pricePer100gWon: number; packGrams: number};

export type IngredientGroup = {id: string; label: string; ingredientIds: string[]; minPercent: number; maxPercent: number};
export type RecipeTemplate = {id: string; name: string; matches: RegExp; totalGrams: number; groups: IngredientGroup[]};

export type GeneratedIngredient = {ingredientId: string; name: string; grams: number};
export type GeneratedRecipe = {
 templateId: string; templateName: string; targetName: string; targetBasisAmount: string; totalGrams: number;
 ingredients: GeneratedIngredient[]; predicted: NutrientVector; target: NutrientVector; error: NutrientVector; score: number;
};

export const NutritionCalculator = {
 scale(ingredient: IngredientNutrition, grams: number): NutrientVector {
  const out = {} as NutrientVector;
  for (const key of nutrientKeys) out[key] = ingredient.per100g[key] * grams / 100;
  return out;
 },
 sum(parts: NutrientVector[]): NutrientVector {
  const out = {} as NutrientVector;
  for (const key of nutrientKeys) out[key] = parts.reduce((s, p) => s + p[key], 0);
  return out;
 },
 // Weights roughly normalize each nutrient's typical scale (sodium's mg range vs fat's g range)
 // so no single dimension dominates the search, mirroring lib/foodsafety-collector.ts's approach.
 score(predicted: NutrientVector, target: NutrientVector): number {
  const scale: NutrientVector = {kcal: 50, carbohydrate: 10, protein: 5, fat: 5, sugar: 5, sodium: 200};
  return nutrientKeys.reduce((sum, key) => sum + Math.abs(predicted[key] - target[key]) / scale[key], 0);
 },
};

export interface RecipeOptimizer {
 optimize(target: FoodNutrition, template: RecipeTemplate, ingredients: Map<string, IngredientNutrition>): GeneratedRecipe;
}

// MVP strategy: random-sample percent-of-total allocations per group (respecting each group's
// min/max share and each ingredient's share within its group), score by nutrient error, keep the
// best; then locally perturb the best candidate to refine it. Swap this class out for a real
// solver (e.g. a scipy-style constrained optimizer via a service call) without touching callers,
// since everything else only depends on the RecipeOptimizer interface.
export class RandomSearchOptimizer implements RecipeOptimizer {
 constructor(private iterations = 4000, private refinements = 800, private random: () => number = Math.random) {}

 private sampleGrams(template: RecipeTemplate, ingredients: Map<string, IngredientNutrition>): Map<string, number> {
  const groupPercents = template.groups.map((g) => g.minPercent + this.random() * (g.maxPercent - g.minPercent));
  const total = groupPercents.reduce((s, v) => s + v, 0) || 1;
  const grams = new Map<string, number>();
  template.groups.forEach((group, i) => {
   const groupGrams = (groupPercents[i] / total) * template.totalGrams;
   const valid = group.ingredientIds.filter((id) => ingredients.has(id));
   if (!valid.length) return;
   // A group like "주재료(고기·해산물·두부)" lists several ALTERNATIVE proteins, not ingredients meant
   // to be blended together — no one cooks 갈비찜 with pork AND beef AND chicken AND squid AND egg AND
   // tofu at once. Picking a small subset (1-2, occasionally more if the group happens to be small)
   // keeps each generated recipe looking like one real dish's ingredient list instead of every
   // template option mixed in at once.
   const pickCount = Math.min(valid.length, 1 + Math.floor(this.random() * 2));
   const shuffled = [...valid].sort(() => this.random() - 0.5);
   const chosen = shuffled.slice(0, pickCount);
   const weights = chosen.map(() => this.random() + 0.05);
   const weightTotal = weights.reduce((s, v) => s + v, 0);
   chosen.forEach((id, j) => grams.set(id, (grams.get(id) ?? 0) + groupGrams * weights[j] / weightTotal));
  });
  return grams;
 }

 private evaluate(grams: Map<string, number>, ingredients: Map<string, IngredientNutrition>, target: NutrientVector) {
  const parts = [...grams.entries()].map(([id, g]) => NutritionCalculator.scale(ingredients.get(id)!, g));
  const predicted = NutritionCalculator.sum(parts);
  return {predicted, score: NutritionCalculator.score(predicted, target)};
 }

 optimize(target: FoodNutrition, template: RecipeTemplate, ingredients: Map<string, IngredientNutrition>): GeneratedRecipe {
  let best = this.sampleGrams(template, ingredients);
  let bestResult = this.evaluate(best, ingredients, target.per100g);
  for (let i = 1; i < this.iterations; i++) {
   const candidate = this.sampleGrams(template, ingredients);
   const result = this.evaluate(candidate, ingredients, target.per100g);
   if (result.score < bestResult.score) { best = candidate; bestResult = result; }
  }
  // Local refinement: nudge one ingredient at a time, keep improvements only. Rescaling every
  // ingredient back to the template's fixed totalGrams after each nudge is what keeps this a
  // "100g dish" recipe — without it, repeatedly accepting nudges that each shave nutrient error
  // but never give anything back let the total drift arbitrarily far over hundreds of iterations
  // (a real generated case reached 151g of ingredients for a template declared at 100g, i.e. 87g
  // of pork alone in what was supposed to be a 100g dish).
  for (let i = 0; i < this.refinements; i++) {
   const ids = [...best.keys()]; if (!ids.length) break;
   const id = ids[Math.floor(this.random() * ids.length)];
   const delta = (this.random() - 0.5) * template.totalGrams * 0.1;
   const candidate = new Map(best);
   candidate.set(id, Math.max(0, (candidate.get(id) ?? 0) + delta));
   const total = [...candidate.values()].reduce((s, v) => s + v, 0);
   if (total > 0) { const scale = template.totalGrams / total; for (const [key, grams] of candidate) candidate.set(key, grams * scale); }
   const result = this.evaluate(candidate, ingredients, target.per100g);
   if (result.score < bestResult.score) { best = candidate; bestResult = result; }
  }
  const roundedIngredients: GeneratedIngredient[] = [...best.entries()]
   .filter(([, grams]) => grams >= 0.5)
   .map(([id, grams]) => ({ingredientId: id, name: ingredients.get(id)!.name, grams: Math.round(grams)}));
  const finalPredicted = NutritionCalculator.sum(roundedIngredients.map((i) => NutritionCalculator.scale(ingredients.get(i.ingredientId)!, i.grams)));
  const error = {} as NutrientVector;
  for (const key of nutrientKeys) error[key] = Math.round((finalPredicted[key] - target.per100g[key]) * 100) / 100;
  return {
   templateId: template.id, templateName: template.name, targetName: target.name, targetBasisAmount: target.basisAmount, totalGrams: template.totalGrams,
   ingredients: roundedIngredients, predicted: finalPredicted, target: target.per100g, error,
   score: NutritionCalculator.score(finalPredicted, target.per100g),
  };
 }
}
