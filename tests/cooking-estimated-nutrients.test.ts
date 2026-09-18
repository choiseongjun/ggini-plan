import {test} from 'node:test';
import assert from 'node:assert/strict';
import {servingNutrients,nutritionIsEstimated} from '../lib/serving-nutrients';
import type {PlanProduct} from '../lib/shopping-plan';

const egg={unit:'개',quantity:20,servings:1,nutritionBasis:'1개당 · 추정 포함',caloriesKcal:70,proteinG:6,carbohydratesG:0.4,fatG:5,sodiumMg:65,nutritionEstimate:{fields:['caloriesKcal'],note:'가식부 중량 가정',model:'test',estimatedAt:'2026-09-19'}} as PlanProduct;
test('explicit piece basis scales a 20-egg pack to two used eggs without guessing grams',()=>{
 const recipe={recipe:{ingredients:[{product:egg,packs:.1}],nutrition:{calories:140,protein:12}}} as PlanProduct;
 assert.equal(servingNutrients(egg).calories,1400);
 assert.deepEqual(servingNutrients(recipe),{calories:140,protein:12,carbs:.8,fat:10,sodium:130});
 assert.equal(nutritionIsEstimated(recipe),true);
 assert.equal(servingNutrients({...egg,nutritionBasis:'100g당'}).calories,null);
});
test('unsourced numbers remain unknown, while explicitly identified AI estimates can be used',()=>{
 assert.equal(servingNutrients({...egg,nutritionEstimate:null}).calories,null);
 assert.equal(servingNutrients({...egg,nutritionBasis:'1회분'}).calories,null);
 assert.equal(servingNutrients({...egg,nutritionBasis:'0개당'}).calories,null);
});
