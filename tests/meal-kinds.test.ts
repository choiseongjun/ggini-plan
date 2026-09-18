import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mealKind,allowsMealKind,validMealKinds} from '../lib/meal-kinds';
import {yogurtCombinations} from '../lib/catalog-meals';
import type {CatalogItem} from '../lib/catalog';
import {initialConditions,parseConditions,candidates,recommendShopping,swapMeal,validMealIds,type PlanProduct} from '../lib/shopping-plan';
const product=(id:string,name:string):PlanProduct=>({id,name,price:3000,servings:1,category:'ready_meal',productUrl:'https://example.com',avoidanceText:'밀 함유'} as PlanProduct);
const foods=[product('rice','닭가슴살 볶음밥'),product('rice2','소고기 덮밥'),product('noodle','크림 파스타'),product('bread','잠봉뵈르 샌드위치'),product('light','닭가슴살 샐러드'),product('unknown','소고기 미역국')];

test('yogurt selection includes breakfast assemblies and preserves light preferences',()=>{
 const base={market:'KR',currency:'KRW',productUrl:'https://example.com',price:4000,priceCheckedAt:'2026-09-19',unit:'g',quantity:400,detail:'400g',nutritionBasis:'100g',nutritionSourceUrl:'https://example.com',caloriesKcal:100,proteinG:10};
 const catalog=[{...base,id:'y',name:'그릭요거트',foodType:'yogurt'},{...base,id:'c',name:'그래놀라',foodType:'cereal'}] as CatalogItem[];
 const [bowl]=yogurtCombinations(catalog);
 assert.equal(mealKind(bowl),'yogurt');
 assert.equal(allowsMealKind(bowl,['yogurt']),true);
 assert.equal(allowsMealKind(bowl,['light']),true);
 assert.equal(allowsMealKind(product('s','요거트 소스 샐러드'),['yogurt']),false);
 assert.deepEqual(bowl.recipe?.slots,['breakfast']);
 assert.equal(bowl.recipe?.nutrition.calories,190);
 assert.equal(bowl.recipe?.nutrition.protein,19);
 assert.equal(bowl.price,1900);
 assert.equal(yogurtCombinations(catalog.map(p=>({...p,detail:'400g × 2개'}))).length,0);
 assert.equal(validMealKinds(['rice','noodles','bread','light','yogurt']),true);
});
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
 assert.deepEqual(candidates(foods,{...conditions,mealKinds:[]}).map(p=>p.id),['rice','rice2','noodle','bread']);
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
