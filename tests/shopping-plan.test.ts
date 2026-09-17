import assert from 'node:assert/strict';
import {test} from 'node:test';
import {basket,basketTotal,candidates,initialConditions,parseConditions,recommendShopping,swapMeal,mealSchedule,validMealIds,type PlanProduct} from '../lib/shopping-plan';
const product=(id:string,price:number,servings:number,extra:Partial<PlanProduct>={}):PlanProduct=>({id,price,servings,name:id,category:'frozen_meal',productUrl:'https://example.com/product',avoidanceText:'대두 함유',...extra} as PlanProduct);
test('charges whole packs and shows unused portions; owned means the entire required amount',()=>{
 const p=[product('rice',8000,4)];
 const row=basket(['rice','rice','rice','rice','rice'],p,[])[0];
 assert.equal(row.packs,2);assert.equal(row.cost,16000);assert.equal(row.left,3);
 assert.equal(basketTotal(['rice','rice'],p,['rice']),0);
});
test('budget is a hard constraint, with no invented meals when stock is unavailable',()=>{
 const p=[product('rice',8000,4),product('pasta',5000,1)];
 const c={...initialConditions,days:5,meals:5,budget:10000};
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

test('a high personalization score cannot fill a two-meal week with pumpkin porridge',()=>{
 const products=[product('pumpkin',4000,1,{name:'호박죽',personalizationScore:160}),...Array.from({length:8},(_,i)=>product(`meal${i}`,5000,1,{name:`다른 죽 ${i}`,personalizationScore:-150}))];
 const c={...initialConditions,budget:100000,days:7,slots:['lunch','dinner'] as const,meals:14};
 const conditions={...c,slots:[...c.slots]};
 const ids=recommendShopping(products,conditions)!;
 assert.equal(ids.length,14);assert.ok(basketTotal(ids,products,[])<=100000);
 assert.ok(new Set(ids).size>=7);
 assert.ok(basket(ids,products,[]).every(r=>r.uses<=2));
 assert.ok(ids.every((id,i)=>i===0||id!==ids[i-1]));
});
test('limited candidates remain usable without breaking exclusions or budget',()=>{
 const products=[product('pumpkin',4000,1,{name:'호박죽'}),product('shrimp',5000,1,{name:'새우 볶음밥',avoidanceText:'새우 함유'})];
 const c={...initialConditions,budget:60000,days:7,slots:['lunch','dinner'] as ('lunch'|'dinner')[],meals:14,avoid:'새우'};
 assert.deepEqual(recommendShopping(products,c),Array(14).fill('pumpkin'));
 assert.equal(recommendShopping(products,{...c,budget:55000}),null);
});

test('selected meal times persist and breakfast never falls back to fried rice',()=>{
 const c={...initialConditions,days:5,slots:['breakfast','dinner'] as ('breakfast'|'dinner')[],meals:10};
 assert.ok(parseConditions(c));
 assert.equal(parseConditions({...c,meals:7}),null);
 assert.equal(parseConditions({...c,slots:[]}),null);
 assert.deepEqual(mealSchedule(c).slice(0,3),[{day:1,slot:'breakfast'},{day:1,slot:'dinner'},{day:2,slot:'breakfast'}]);
 const products=[product('rice',2000,1,{name:'냉동 볶음밥'})];
 assert.equal(recommendShopping(products,c),null);
 products.push(product('sandwich',3000,1,{name:'달걀 샌드위치'}));
 const ids=recommendShopping(products,c)!;
 assert.ok(validMealIds(ids,products,c));
 assert.ok(ids.every((id,i)=>i%2!==0||id==='sandwich'));
 assert.equal(validMealIds(Array(10).fill('rice'),products,c),false);
 const {days,slots,...legacy}=initialConditions;
 void days;void slots;
 assert.ok(parseConditions(legacy));
});
