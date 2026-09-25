import test from 'node:test';
import assert from 'node:assert/strict';
import {getPool} from '../lib/db';
import {listRecipeOptimizerResults} from '../lib/recipe-optimizer-store';
import {governmentOptimizedRecipeProducts} from '../lib/recipe-optimizer-plan';
import {initialConditions,recommendShopping,mealSchedule,slotCandidates} from '../lib/shopping-plan';
import {qualityAllowsRecommendation} from '../lib/menu-quality';
test('review exclusions apply to meals and sides while a full week remains available',async()=>{
 try{
  const rows=await listRecipeOptimizerResults();
  const [meals,sides]=await Promise.all([governmentOptimizedRecipeProducts(),governmentOptimizedRecipeProducts('side')]);
  const allowed=new Set(rows.filter(r=>qualityAllowsRecommendation(r.menuQuality)).map(r=>`recipe-opt-${r.foodCode}`));
  for(const product of [...meals,...sides])assert.ok(allowed.has(product.id));
  for(const name of ['청국수','육수곤국수','쏭국수']){
   const row=rows.find(r=>r.menuQuality.originalName===name);assert.ok(row);assert.equal(qualityAllowsRecommendation(row.menuQuality),false);
   assert.equal(meals.some(p=>p.id===`recipe-opt-${row.foodCode}`),false);
  }
  const conditions={...initialConditions,days:7,meals:21,slots:['breakfast','lunch','dinner'] as import('../lib/shopping-plan').MealSlot[],budget:1000000};
  const ids=recommendShopping(meals,conditions);assert.ok(ids);assert.equal(ids.length,21);
  for(const slot of ['breakfast','lunch','dinner'])assert.equal(mealSchedule(conditions).filter(s=>s.slot===slot).length,7);
  ids.forEach((id,index)=>assert.ok(slotCandidates(meals,conditions,index).some(p=>p.id===id)));
  console.log(JSON.stringify({recipes:rows.length,meals:meals.length,sides:sides.length,held:rows.filter(r=>!qualityAllowsRecommendation(r.menuQuality)).length}));
 }finally{await getPool().end();}
});
