import assert from 'node:assert/strict';
import {test} from 'node:test';
import {estimateRecipes,recipeEstimate,allowedEstimateRecipes} from '../lib/recipe-estimates';
import {initialConditions} from '../lib/shopping-plan';
const beef=estimateRecipes.find(r=>r.id==='beef-mushroom-porridge')!;
test('beef porridge shows usage costs separately from whole pack purchases',()=>{
 const result=recipeEstimate(beef);
 assert.equal(result.usedLow,2800);
 assert.equal(result.usedHigh,5800);
 assert.equal(result.buyLow,20500);
 assert.equal(result.buyHigh,40500);
 assert.ok(beef.match.test('[본죽] 소고기버섯죽'));
 assert.equal(beef.match.test('단호박죽'),false);
});
test('owned ingredients reduce purchasing only, without changing consumed value',()=>{
 const result=recipeEstimate(beef,beef.parts.map(([id])=>id));
 assert.equal(result.buyLow,0);assert.equal(result.buyHigh,0);
 assert.equal(result.usedLow,recipeEstimate(beef).usedLow);
 const partial=recipeEstimate(beef,['rice','salt']);
 assert.equal(partial.buyLow,16500);
 assert.equal(partial.buyHigh,33500);
});
test('estimated recipes respect excluded ingredients and free text',()=>{
 assert.ok(allowedEstimateRecipes(initialConditions).some(r=>r.id===beef.id));
 assert.equal(allowedEstimateRecipes({...initialConditions,excluded:['beef']}).some(r=>r.id===beef.id),false);
 assert.equal(allowedEstimateRecipes({...initialConditions,avoid:'버섯'}).some(r=>r.id===beef.id),false);
 assert.equal(allowedEstimateRecipes({...initialConditions,excluded:['soy']}).some(r=>r.id==='egg-fried-rice'),false);
});
