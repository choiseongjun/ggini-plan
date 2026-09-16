import assert from 'node:assert/strict';
import {test} from 'node:test';
import {basket,basketTotal,candidates,initialConditions,parseConditions,recommendShopping,swapMeal,type PlanProduct} from '../lib/shopping-plan';
const product=(id:string,price:number,servings:number,extra:Partial<PlanProduct>={}):PlanProduct=>({id,price,servings,name:id,category:'frozen_meal',productUrl:'https://example.com/product',avoidanceText:'대두 함유',...extra} as PlanProduct);
test('charges whole packs and shows unused portions; owned means the entire required amount',()=>{
 const p=[product('rice',8000,4)];
 const row=basket(['rice','rice','rice','rice','rice'],p,[])[0];
 assert.equal(row.packs,2);assert.equal(row.cost,16000);assert.equal(row.left,3);
 assert.equal(basketTotal(['rice','rice'],p,['rice']),0);
});
test('budget is a hard constraint, with no invented meals when stock is unavailable',()=>{
 const p=[product('rice',8000,4),product('pasta',5000,1)];
 const c={...initialConditions,budget:10000};
 const ids=recommendShopping(p,c);assert.equal(ids,null);
 const enough=recommendShopping(p,{...c,budget:13000})!;
 assert.equal(enough.length,5);assert.ok(basketTotal(enough,p,[])<=13000);
 assert.equal(recommendShopping([],c),null);
});
test('avoidance excludes unknown source and known ingredient aliases; cooking is respected',()=>{
 const p=[product('a',1000,1,{avoidanceText:'쇠고기 함유'}),product('b',1000,1,{avoidanceText:null}),product('c',1000,1,{category:'meal_kit'})];
 assert.deepEqual(candidates(p,{...initialConditions,avoid:'소고기'}).map(x=>x.id),['c']);
 assert.deepEqual(candidates(p,{...initialConditions,cooking:'kit'}).map(x=>x.id),['c']);
});
test('swap changes only requested meal and never exceeds pack budget',()=>{
 const p=[product('a',3000,2),product('b',4000,1)];
 assert.equal(swapMeal(['a','a'],0,p,{...initialConditions,budget:6000}),null);
 assert.deepEqual(swapMeal(['a','a'],0,p,{...initialConditions,budget:7000}),['b','a']);
});
test('rejects malformed conditions',()=>{
 assert.equal(parseConditions({...initialConditions,budget:-1}),null);
 assert.equal(parseConditions({...initialConditions,meals:100}),null);
 assert.equal(parseConditions({...initialConditions,owned:[1]}),null);
});
