import assert from 'node:assert/strict';
import {test} from 'node:test';
import {minimumShoppingCost,shoppingBudgetGuide} from '../lib/shopping-budget';
import {basketTotal,initialConditions,slotCandidates,type PlanProduct,type PlanConditions} from '../lib/shopping-plan';
const product=(id:string,price:number,servings:number,name=id):PlanProduct=>({id,name,price,servings,category:'ready_meal',productUrl:'https://example.com/item',avoidanceText:'확인된 표시'} as PlanProduct);
test('single eligible pumpkin menu explains the 14-meal minimum without promising variety',()=>{
 const c:PlanConditions={...initialConditions,days:7,slots:['lunch','dinner'],meals:14,budget:100000};
 const guide=shoppingBudgetGuide([product('pumpkin',4500,1,'호박죽')],c);
 assert.equal(guide.count,1);assert.equal(guide.minimum,63000);
 assert.equal(guide.varietyMinimum,null);assert.equal(guide.varietyUpper,null);
 assert.deepEqual(guide.options,[{slot:'lunch',count:1},{slot:'dinner',count:1}]);
});
test('minimum uses whole packs and stock, not a per-serving average',()=>{
 const products=[product('rice',8000,4),product('pasta',5000,1)];
 const c={...initialConditions,days:5,meals:5};
 assert.equal(minimumShoppingCost(products,c),13000);
 assert.equal(minimumShoppingCost(products,{...c,supply:{rice:0.5}}),8000);
 assert.equal(minimumShoppingCost(products,{...c,owned:['rice']}),0);
});
test('shared breakfast stock is allocated once and missing breakfast returns no minimum',()=>{
 const c:PlanConditions={...initialConditions,days:2,slots:['breakfast','dinner'],meals:4};
 const rice=product('rice',1000,1,'볶음밥'),porridge=product('porridge',6000,4,'호박죽');
 assert.equal(minimumShoppingCost([rice],c),null);
 assert.equal(minimumShoppingCost([rice,porridge],c),6000);
 assert.equal(minimumShoppingCost([rice,porridge],{...c,supply:{porridge:0.5}}),2000);
});
test('exact minimum matches exhaustive valid meal combinations',()=>{
 const products=[product('rice',4300,3,'볶음밥'),product('porridge',5200,2,'호박죽'),product('cereal',3900,4,'시리얼')];
 for(const supply of [{},{porridge:0.5,rice:0.333333}] as Record<string,number>[]){
  const c:PlanConditions={...initialConditions,days:2,slots:['breakfast','lunch','dinner'],meals:6,supply};
  let minimum=Infinity;
  function visit(ids:string[]){if(ids.length===c.meals){minimum=Math.min(minimum,basketTotal(ids,products,c.owned,c.supply));return;}for(const p of slotCandidates(products,c,ids.length))visit([...ids,p.id]);}
  visit([]);assert.equal(minimumShoppingCost(products,c),minimum);
 }
});
test('varied budget honors the same exclusions and costs at least the absolute minimum',()=>{
 const products=[product('rice',3000,1),product('porridge',2000,1,'호박죽'),product('shrimp',1000,1,'새우 볶음밥')];
 const c={...initialConditions,days:4,meals:4,avoid:'새우'};
 const guide=shoppingBudgetGuide(products,c);
 assert.equal(guide.count,2);assert.equal(guide.minimum,8000);assert.equal(guide.varietyMinimum,10000);
 assert.ok(guide.varietyUpper!>=guide.varietyMinimum!);
});
