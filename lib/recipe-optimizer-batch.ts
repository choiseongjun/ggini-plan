import {fetchCookedDishes} from './foodsafety-resolve';
import {templateForDishName, ingredientMap} from './recipe-ingredient-data';
import {RandomSearchOptimizer, type FoodNutrition} from './recipe-optimizer';
import {saveRecipeOptimizerResult} from './recipe-optimizer-store';

// A real Korean soup/stew is legitimately very low-calorie per 100g (broth is mostly water — e.g.
// 콩나물국 is 6kcal/100g, 미역국 12kcal/100g — both genuine, common meals), so calorie value alone
// can't distinguish a real dish from a non-meal entry; a plain numeric floor would delete the wrong
// half. What actually marks an entry as "not a servable dish" is its name: these patterns catch the
// broth/extract-only component of a dish rather than the dish itself (e.g. "무국물" — literally "radish
// soup LIQUID", 3kcal/100g), infant/invalid porridge, and liquid/beverage products that only matched a
// recipe template by accident (e.g. "설탕" containing "탕").
const NON_MEAL_NAME = /(국물|육수|즙|_?만)$|^미음|^액상/;

// Shared by scripts/generate-similar-recipes.mjs (CLI) and the admin "일괄 생성" button
// (app/api/admin/recipe-optimizer/route.ts PUT) so both stay in sync with one implementation.
export async function generateAllEligibleRecipes(): Promise<{total: number; eligible: number; saved: number; failed: number}> {
 const dishes = await fetchCookedDishes();
 const eligible = dishes.filter((d) =>
  templateForDishName(d.itemName) &&
  d.caloriesKcal !== null && d.proteinG !== null && d.fatG !== null && d.carbohydratesG !== null && d.sugarG !== null && d.sodiumMg !== null &&
  !NON_MEAL_NAME.test(d.itemName),
 );
 const optimizer = new RandomSearchOptimizer();
 const ingredients = ingredientMap();
 let saved = 0, failed = 0;
 for (const dish of eligible) {
  try {
   const template = templateForDishName(dish.itemName)!;
   const target: FoodNutrition = {name: dish.itemName, basisAmount: dish.basisAmount, per100g: {kcal: dish.caloriesKcal!, carbohydrate: dish.carbohydratesG!, protein: dish.proteinG!, fat: dish.fatG!, sugar: dish.sugarG!, sodium: dish.sodiumMg!}};
   const recipe = optimizer.optimize(target, template, ingredients);
   await saveRecipeOptimizerResult(dish.foodCode, recipe);
   saved++;
  } catch { failed++; }
 }
 return {total: dishes.length, eligible: eligible.length, saved, failed};
}
