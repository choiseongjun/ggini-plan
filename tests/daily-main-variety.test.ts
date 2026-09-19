import assert from 'node:assert/strict';
import {test} from 'node:test';
import {initialConditions,recommendShopping,repeatsDailyMain,validMealIds,swapMeal,mainIngredients,type PlanProduct,type PlanConditions} from '../lib/shopping-plan';
const meal=(id:string,name:string)=>({id,name,price:5000,servings:1,category:'frozen_meal',productUrl:'https://example.com/'+id,avoidanceText:'양파'} as PlanProduct);
const products=[meal('beef-a','소불고기 버섯 덮밥'),meal('beef-b','소불고기 두부 덮밥'),meal('chicken','닭가슴살 양파 덮밥'),meal('pork','삼겹살 버섯 덮밥')];
const c:PlanConditions={...initialConditions,days:1,meals:2,slots:['lunch','dinner'],budget:150000};
test('different beef recipes cannot fill lunch and dinner on the same day',()=>{
 assert.equal(recommendShopping(products.slice(0,2),c),null);
 assert.equal(validMealIds(['beef-a','beef-b'],products,c),false);
 const ids=recommendShopping(products,c)!;assert.equal(ids.length,2);assert.ok(validMealIds(ids,products,c));
});
test('swaps preserve daily variety and shared vegetables remain allowed',()=>{
 assert.equal(swapMeal(['beef-a','chicken'],1,products.slice(0,3),c),null);
 assert.equal(repeatsDailyMain(['beef-a'],products,c,1,products[3]),false);
 assert.deepEqual(mainIngredients(products[1]),['beef']);
});
test('same main ingredient may return on another day and breakfast remains independent',()=>{
 assert.ok(validMealIds(['beef-a','chicken','beef-b','pork'],products,{...c,days:2,meals:4}));
 assert.equal(repeatsDailyMain(['beef-a'],products,{...c,slots:['breakfast','dinner']},1,products[1]),false);
});


