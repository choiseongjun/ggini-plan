import assert from 'node:assert/strict';
import {test} from 'node:test';
import {initialConditions,parseConditions,purchaseBasket,basketTotal,recommendShopping,candidates,validMealIds,slotCandidates,swapMeal,alternativesFor,sideCountFor,initialHomeConditions,type PlanProduct,type MealSlot} from '../lib/shopping-plan';
import {withCookingSides} from '../lib/cooking-sides';
import {remainingPlanPortions} from '../lib/daily-plan';
import {sharedPlanSnapshot} from '../lib/shared-plan';
import {consumeFood} from '../lib/food-intake';
const vegetable=(id:string,name:string):PlanProduct=>({id,name,detail:'200g',unit:'개',quantity:1,market:'KR',currency:'KRW',price:2000,servings:1,servingGrams:200,servingNote:'1팩',productUrl:'https://example.com/'+id,priceCheckedAt:'2026-09-19',avoidanceText:name,allergyInfo:{status:'ingredients',statement:name},allergens:[],nutritionBasis:'100g당',nutritionSourceUrl:'https://example.com/label',caloriesKcal:30,proteinG:2,carbohydratesG:4,fatG:1,sodiumMg:1} as unknown as PlanProduct);
const cabbage=vegetable('cabbage','양배추'),mushroom=vegetable('mushroom','표고버섯'),zucchini=vegetable('zucchini','애호박');
const main:PlanProduct={...cabbage,id:'cook-test',name:'채소 밥상',price:1000,productUrl:null,recipe:{minutes:10,slots:['dinner'],family:'vegetable',ingredients:[{product:cabbage,packs:.5,label:'양배추 100g'}],steps:['익혀요.'],nutrition:{calories:30,protein:2}}};
test('legacy defaults and invalid household options',()=>{
 assert.equal(initialConditions.people,1);assert.equal(initialConditions.sideCount,0);
 for(const people of [0,5,1.5,'2',null])assert.equal(parseConditions({...initialConditions,people}),null);
 for(const sideCount of [-1,3,.5,'1',null])assert.equal(parseConditions({...initialConditions,sideCount}),null);
 assert.equal(parseConditions({...initialConditions,people:4,sideCount:2})?.people,4);
});
test('household requirements multiply before subtracting stock and rounding packs',()=>{
 const rows=purchaseBasket([main.id],[main],[],{cabbage:.25},undefined,3);
 assert.equal(rows[0].required,1.5);assert.equal(rows[0].packs,2);assert.equal(rows[0].cost,4000);
 assert.equal(basketTotal([main.id],[main],[],{},1),2000);
 assert.equal(basketTotal([main.id],[main],[],{},4),4000);
 const c={...initialConditions,days:1,meals:1,mealMode:'cook' as const,budget:2000,people:4};
 assert.equal(recommendShopping([main],c),null);
 assert.equal(sharedPlanSnapshot(c,[main.id],[main])?.total,4000);
});
test('side counts represent real ingredients, nutrition, budget and saved identities',()=>{
 const products=withCookingSides([main],[cabbage,mushroom,zucchini]);
 for(const sideCount of [0,1,2]){
  const c={...initialConditions,cookingEffort:'relaxed' as const,days:1,meals:1,mealMode:'cook' as const,sideCount,people:2};
  const pool=candidates(products,c);assert.equal(pool.length,1);assert.equal(pool[0].recipe?.sides?.length??0,sideCount);
  assert.ok(validMealIds([pool[0].id],products,c));
  if(sideCount){assert.ok(pool[0].price>main.price);assert.ok(pool[0].recipe!.nutrition.calories!>30);assert.ok(purchaseBasket([pool[0].id],products,[],{},undefined,2).length>1);}
 }
 assert.equal(withCookingSides([main],[]).length,1,'missing side products are not invented');
});
test('personal intake consumes one portion while household shopping retains others',()=>{
 const remain=remainingPlanPortions([{id:main.id,date:'2026-09-20'}],'2026-09-20',[{productId:main.id,portions:1}],3);
 assert.equal(remain[main.id],2);
 const rows=purchaseBasket([main.id],[main],[],{},remain,3);assert.equal(rows[0].required,1);
 const stock={cabbage:{id:'cabbage',name:'양배추',unit:'묶음',url:null,owned:2,ordered:0,updatedAt:'2026-09-20'}};
 const consumed=consumeFood(stock,main,1);assert.equal(consumed.stock.cabbage.owned,1.5);assert.equal(consumed.calories,30);
});

test('per-meal composition validates input and preserves legacy fallback',()=>{
 assert.deepEqual(initialHomeConditions.mealSideCounts,{breakfast:0,lunch:1,dinner:2});
 for(const mealSideCounts of [null,[],1,{snack:1},{breakfast:3},{lunch:-1},{dinner:1.5},{breakfast:'0'}])assert.equal(parseConditions({...initialConditions,mealSideCounts}),null);
 const c=parseConditions({...initialConditions,sideCount:2,mealSideCounts:{breakfast:0}})!;
 assert.equal(sideCountFor(c,'breakfast'),0);assert.equal(sideCountFor(c,'dinner'),2);
 assert.equal(sideCountFor({...initialConditions,sideCount:1},'lunch'),1);
});
test('mixed compositions survive recommendation, swaps, validation and sharing',()=>{
 const slots:MealSlot[]=['breakfast','lunch','dinner'];
 const mains=['오트밀','버섯덮밥','애호박볶음밥','양배추전','토마토파스타','감자국'].map((name,i)=>({...main,id:`cook-mixed-${i}`,name,recipe:{...main.recipe!,slots,family:name}}));
 const products=withCookingSides(mains,[cabbage,mushroom,zucchini]);
 const c={...initialHomeConditions,days:1,meals:3,mealMode:'cook' as const,budget:1000000};
 for(let i=0;i<3;i++){
  const pool=slotCandidates(products,c,i);assert.ok(pool.length>0);
  assert.ok(pool.every(p=>(p.recipe?.sideCount??0)===i));
 }
 const ids=recommendShopping(products,c,false,[],42);assert.ok(ids);assert.ok(validMealIds(ids,products,c));
 for(let i=0;i<3;i++){
  assert.equal(products.find(p=>p.id===ids[i])?.recipe?.sideCount??0,i);
  const swapped=swapMeal(ids,i,products,c);assert.ok(swapped);assert.ok(validMealIds(swapped,products,c));
  const alternatives=alternativesFor(products,ids,c,i);assert.ok(alternatives.length);
  assert.ok(alternatives.every(p=>(p.recipe?.sideCount??0)===i));
 }
 assert.equal(validMealIds(ids,products,{...c,mealSideCounts:{breakfast:2,lunch:1,dinner:0}}),false);
 assert.deepEqual(sharedPlanSnapshot(c,ids,products)?.mealSideCounts,c.mealSideCounts);
 assert.ok(purchaseBasket(ids,products,[]).length>1);
});
test('simple meals keep cooking effort restrictions when other meals include sides',()=>{
 const hard={...main,id:'hard',recipe:{...main.recipe!,slots:['breakfast','dinner'] as MealSlot[],minutes:60}};
 const products=withCookingSides([hard],[cabbage,mushroom,zucchini]);
 const c={...initialHomeConditions,days:1,meals:3,mealMode:'cook' as const};
 assert.equal(slotCandidates(products,c,0).length,0);
 assert.ok(slotCandidates(products,c,2).length>0);
 assert.ok(candidates(products,c).every(p=>(p.recipe?.sideCount??0)>0));
});
