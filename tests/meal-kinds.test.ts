import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mealKind} from '../lib/meal-kinds';
import {initialConditions,parseConditions,candidates,recommendShopping,swapMeal,validMealIds,type PlanProduct} from '../lib/shopping-plan';
const product=(id:string,name:string):PlanProduct=>({id,name,price:3000,servings:1,category:'ready_meal',productUrl:'https://example.com',avoidanceText:'밀 함유'} as PlanProduct);
const foods=[product('rice','닭가슴살 볶음밥'),product('rice2','소고기 덮밥'),product('noodle','크림 파스타'),product('bread','잠봉뵈르 샌드위치'),product('light','닭가슴살 샐러드'),product('unknown','소고기 미역국')];
test('meal kinds validate selections and keep old saved preferences compatible',()=>{
 assert.ok(parseConditions(initialConditions));assert.ok(parseConditions({...initialConditions,mealKinds:[]}));
 for(const mealKinds of [['pizza'],['rice','rice'],'rice',null])assert.equal(parseConditions({...initialConditions,mealKinds}),null);
});
test('specific kinds filter recommendation, replacement and server validation without fallback',()=>{
 const c={...initialConditions,days:1,meals:1,mealKinds:['rice'] as const};const conditions={...c,mealKinds:[...c.mealKinds]};
 assert.deepEqual(candidates(foods,conditions).map(p=>p.id),['rice','rice2']);
 const ids=recommendShopping(foods,conditions)!;assert.equal(ids.length,1);assert.ok(['rice','rice2'].includes(ids[0]));
 assert.ok(swapMeal(ids,0,foods,conditions)?.every(id=>['rice','rice2'].includes(id)));
 assert.equal(validMealIds(['noodle'],foods,conditions),false);
 assert.equal(recommendShopping([foods[2]],conditions),null);
 assert.equal(candidates(foods,{...conditions,mealKinds:[]}).length,foods.length);
 assert.deepEqual(candidates(foods,{...conditions,mealKinds:['bread','noodles']}).map(p=>p.id),['noodle','bread']);
 assert.equal(candidates(foods,{...conditions,avoid:'닭고기'}).some(p=>p.id==='rice'),false);
});
test('dish type uses the meal name, not incidental ingredients or brand names',()=>{
 assert.equal(mealKind(product('a','[밥친구] 통밀 파스타')),'noodles');
 assert.equal(mealKind(product('b','닭가슴살 샌드위치')),'bread');
 assert.equal(mealKind(product('c','크루통 샐러드')),'light');
 assert.equal(mealKind(product('d','전복죽')),'rice');
 assert.equal(mealKind(product('e','연어 스테이크')),null);
});
