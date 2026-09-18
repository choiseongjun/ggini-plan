import assert from 'node:assert/strict';
import {test} from 'node:test';
import {dailyNutritionReference} from '../lib/daily-nutrition-reference';
const base={age:29,sex:'female',height:165,weight:60,activity:'light',meals:3,pregnancy:false};
test('KDRI age and sex boundaries select the correct reference',()=>{
 for(const [age,protein,sodiumAdequate,sodiumReduction] of [[19,55,1500,2300],[29,55,1500,2300],[30,50,1500,2300],[64,50,1500,2300],[65,50,1300,1900],[74,50,1300,1900],[75,50,1200,1800],[78,50,1200,1800]]){
  const r=dailyNutritionReference({...base,age})!;
  assert.equal(r.protein,protein);assert.equal(r.sodiumAdequate,sodiumAdequate);assert.equal(r.sodiumReduction,sodiumReduction);
 }
 assert.equal(dailyNutritionReference({...base,sex:'male',age:49})?.protein,65);
 assert.equal(dailyNutritionReference({...base,sex:'male',age:50})?.protein,60);
});
test('unsupported profiles do not receive adult fallback targets',()=>{
 for(const p of [null,{}, {...base,age:18},{...base,age:79},{...base,pregnancy:true}])assert.equal(dailyNutritionReference(p),null);
});
test('macro ranges use personal energy while population protein reference stays explicit',()=>{
 const a=dailyNutritionReference(base)!,b=dailyNutritionReference({...base,activity:'active'})!;
 assert.ok(b.calories>a.calories);assert.equal(a.protein,b.protein);
 assert.deepEqual(a.carbs,[a.calories*.5/4,a.calories*.65/4]);
 assert.deepEqual(a.fat,[a.calories*.15/9,a.calories*.3/9]);
});
