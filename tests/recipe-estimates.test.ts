import assert from 'node:assert/strict';
import {test} from 'node:test';
import data from '../data/recipe-comparison.json';
import cooking from '../data/cooking-recipes.json';
import {estimateRecipes,recipeIngredientsFor,allowedEstimateRecipes} from '../lib/recipe-estimates';
import {initialConditions} from '../lib/shopping-plan';
const beef=estimateRecipes.find(r=>r.id==='beef-mushroom-porridge')!;
test('recipe data has valid references, units, portions and no assumed prices',()=>{
 assert.equal(data.schemaVersion,1);
 assert.equal(new Set(estimateRecipes.map(r=>r.id)).size,estimateRecipes.length);
 for(const r of estimateRecipes){
  assert.ok(r.steps.length);assert.equal(r.portionCount,1);assert.equal(r.source.kind,'editorial');
  assert.equal(new Set(r.parts.map(([id])=>id)).size,r.parts.length);
  for(const row of recipeIngredientsFor(r)){assert.ok(row.name);assert.ok(['g','ml','개'].includes(row.unit));assert.ok(row.amount>0);assert.ok(!('low' in row));assert.ok(!('pack' in row));}
 }
 for(const link of data.productLinks){const ingredient=data.ingredients[link.key as keyof typeof data.ingredients];assert.ok(ingredient);assert.equal(ingredient.unit,link.amountUnit);assert.ok(link.amount>0);assert.ok(link.sourceUrl.startsWith('https://'));}
 for(const recipe of cooking.recipes)for(const [id,amount] of recipe.parts){assert.ok(id in cooking.contracts);assert.ok(Number(amount)>0);}
});
test('beef porridge preserves raw rice quantity and matching',()=>{
 assert.equal(recipeIngredientsFor(beef).find(r=>r.id==='rice')!.amount,60);
 assert.equal(data.ingredients.rice.form,'dry');
 assert.ok(beef.match.test('[본죽] 소고기버섯죽'));assert.equal(beef.match.test('단호박죽'),false);
});
test('recipes respect excluded ingredients and free text',()=>{
 assert.ok(allowedEstimateRecipes(initialConditions).some(r=>r.id===beef.id));
 assert.equal(allowedEstimateRecipes({...initialConditions,excluded:['beef']}).some(r=>r.id===beef.id),false);
 assert.equal(allowedEstimateRecipes({...initialConditions,avoid:'버섯'}).some(r=>r.id===beef.id),false);
 assert.equal(allowedEstimateRecipes({...initialConditions,excluded:['soy']}).some(r=>r.id==='egg-fried-rice'),false);
});
