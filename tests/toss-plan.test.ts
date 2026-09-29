import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {changeSlots,configurePlan,initialTossConditions,parseSaved,shoppingRows,storedStock} from '../toss/src/model';
import {initialConditions,recommendShopping,purchaseBasket,validMealIds,mealSchedule,sideCountFor,parseConditions,type PlanProduct} from '../lib/shopping-plan';
const products=JSON.parse(fs.readFileSync('toss/public/catalog.json','utf8')).products as PlanProduct[];
test('Toss bundled catalog produces an affordable plan and restores exact pack quantities',()=>{
 const ids=recommendShopping(products,initialConditions)!;assert.ok(ids);assert.ok(validMealIds(ids,products,initialConditions));
 const before=purchaseBasket(ids,products,[]),total=before.reduce((n,r)=>n+r.cost,0);assert.ok(total<=initialConditions.budget);
 const first=before[0],have={[first.product.id]:first.packs};const data={conditions:initialConditions,ids,have};
 assert.deepEqual(parseSaved(JSON.stringify(data),products),data);
 const after=purchaseBasket(ids,products,[],have);assert.equal(after[0].packs,0);assert.equal(after.reduce((n,r)=>n+r.cost,0),total-first.cost);
 assert.equal(parseSaved(JSON.stringify({...data,ids:['missing']}),products),null);
 assert.equal(parseSaved(JSON.stringify({...data,have:{invalid:-1}}),products),null);
 assert.equal(parseSaved('broken json',products),null);
});

test('current Toss default generates the same recipe-only three-meal schedule and side counts as the web',()=>{
 const conditions=configurePlan(initialTossConditions,null)!;
 const ids=recommendShopping(products,conditions);
 assert.ok(ids);assert.equal(ids.length,21);assert.ok(validMealIds(ids,products,conditions));
 const schedule=mealSchedule(conditions);
 ids.forEach((id,index)=>{const product=products.find(p=>p.id===id)!;assert.ok(product.recipe&&!product.recipe.assembly);assert.equal(product.recipe.sideCount??0,sideCountFor(conditions,schedule[index].slot));});
 const saved={conditions:{...conditions,people:2},ids,have:{}};
 const one=shoppingRows({...saved,conditions:{...conditions,people:1}},products);
 const two=shoppingRows(saved,products);
 for(const row of two){const original=one.find(r=>r.product.id===row.product.id)!;assert.ok(Math.abs(row.required-original.required*2)<1e-8);}
 const first=two.find(row=>row.cost>0)!;
 const withStock={...saved,have:{[first.product.id]:first.packs}};
 assert.equal(shoppingRows(withStock,products).find(row=>row.product.id===first.product.id)!.packs,0);
 assert.deepEqual(parseSaved(JSON.stringify(withStock),products),withStock);
});

test('changing meal slots keeps partial schedules valid and cannot select zero meals',()=>{
 const partial={...initialTossConditions,mealCountMode:true,meals:5,days:2};
 const result=changeSlots(partial,['dinner']);
 assert.equal(result.meals,5);assert.equal(result.days,5);assert.ok(parseConditions(result));
 assert.equal(changeSlots(result,[]),result);
 const calendar=changeSlots(initialTossConditions,['lunch','dinner']);
 assert.equal(calendar.meals,14);assert.equal(calendar.days,7);assert.ok(parseConditions(calendar));
});

test('optional ingredient cap accounts for people and rejects invalid values',()=>{
 const conditions=configurePlan({...initialTossConditions,people:2},4000)!;
 assert.equal(conditions.budget,21*2*4000);assert.equal(conditions.mealMode,'cook');
 for(const cap of [0,499,50001,NaN,Infinity])assert.equal(configurePlan(initialTossConditions,cap),null);
});

test('catalog changes retain valid stock without keeping removed recipe ids',()=>{
 const raw=JSON.stringify({conditions:initialConditions,ids:['removed-recipe'],have:{rice:1.5,invalid:-1}});
 assert.equal(parseSaved(raw,products),null);
 assert.deepEqual(storedStock(raw),{rice:1.5});
 assert.deepEqual(storedStock('broken'),{});
 assert.deepEqual(storedStock('{"have":{"__proto__":1,"constructor":2,"tofu":2}}'),{tofu:2});
});
