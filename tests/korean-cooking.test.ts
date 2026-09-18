import {test} from 'node:test';
import assert from 'node:assert/strict';
import recipeData from '../data/cooking-recipes.json';
import sourceData from '../data/catalog-kr-2000.json';
import type {CatalogItem} from '../lib/catalog';
import {cookingProducts} from '../lib/cooking-recipes';
import {initialConditions,slotCandidates,purchaseBasket} from '../lib/shopping-plan';

test('Korean meat dishes use registered pack contracts and remain lunch/dinner meals',()=>{
 const catalog=Object.entries(recipeData.contracts).map(([id,c])=>{
  const source=sourceData.rows.find(row=>row.id===id);
  return {id,name:source?.name??id,unit:c.unit,quantity:c.quantity,detail:source?.detail??({'rice':'210g × 1개','tofu':'300g × 1팩','eggs':'20구','chicken':'100g','kurly-5152797':'200g · 1봉 · 냉장','kurly-5031392':'100g · 1봉 · 냉장','kurly-1001897355':'600g · 봉 · 냉장'} as Record<string,string>)[id],price:5000,productUrl:source?.productUrl??'https://example.com',allergyInfo:{status:'ingredients',statement:'소고기 돼지고기 대두 밀'},allergens:[],nutritionBasis:null} as unknown as CatalogItem;
 });
 const products=cookingProducts(catalog);
 for(const id of ['cook-beef-bulgogi','cook-pork-bulgogi','cook-pork-belly-grill','cook-pork-belly-steam']){
  const dish=products.find(p=>p.id===id);assert.ok(dish,id);
  assert.ok(dish.recipe!.ingredients.length>=3);
  assert.equal(dish.recipe!.nutrition.calories,null,'missing label nutrition stays unknown');
  assert.ok(slotCandidates(products,{...initialConditions,mealMode:'cook',slots:['dinner']},0).some(p=>p.id===id));
  assert.ok(!slotCandidates(products,{...initialConditions,mealMode:'cook',slots:['breakfast']},0).some(p=>p.id===id));
 }
 const rows=purchaseBasket(['cook-pork-belly-grill','cook-pork-belly-steam'],products,[]);
 assert.equal(rows.find(r=>r.product.id==='kurly-1002274835')?.packs,1,'two dishes share one 300g meat pack');
 assert.ok(!cookingProducts(catalog.filter(p=>p.id!=='kurly-1002274835')).some(p=>p.id==='cook-pork-belly-grill'));
});
