import {test} from 'node:test';
import assert from 'node:assert/strict';
import {validKnownNutrition,mergeNutritionEstimate} from '../lib/nutrition-estimate';
import {emptyNutrition} from '../lib/nutrition-ocr';
test('estimation fills only absent values and retains confirmed zero',()=>{
  const known={...emptyNutrition,nutritionBasis:'100g당',fatG:0,proteinG:8};
  const guessed={nutritionBasis:'100g당',fatG:3,proteinG:10,caloriesKcal:100,carbohydratesG:15,sodiumMg:200};
  const result=mergeNutritionEstimate(known,guessed);
  assert.equal(result.extracted.fatG,0);assert.equal(result.extracted.proteinG,8);
  assert.deepEqual(result.fields,['caloriesKcal','carbohydratesG','sodiumMg']);
});
test('different serving bases cannot be mixed',()=>{
  const known={...emptyNutrition,nutritionBasis:'100g당',proteinG:8};
  assert.deepEqual(mergeNutritionEstimate(known,{...known,nutritionBasis:'1팩당',fatG:9}),{extracted:known,fields:[]});
});
test('rejects values without basis and cleans display marker',()=>{
  assert.deepEqual(validKnownNutrition({proteinG:8}),emptyNutrition);
  assert.equal(validKnownNutrition({nutritionBasis:'100g당 · 추정 포함',proteinG:0,fatG:-1}).proteinG,0);
  assert.equal(validKnownNutrition({nutritionBasis:'100g당',proteinG:NaN}).proteinG,null);
});
