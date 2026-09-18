import {test} from 'node:test';
import assert from 'node:assert/strict';
import type {CatalogItem} from '../lib/catalog';
import {ingredientRole,ingredientPack,cookingIngredientPool} from '../lib/cooking-ingredient-pool';
import {cookingProducts} from '../lib/cooking-recipes';
import {recommendShopping,initialConditions,basketTotal,validMealIds} from '../lib/shopping-plan';
const item=(id:string,name:string,detail:string,price=2000)=>({id,name,detail,price,unit:'개',quantity:1,market:'KR',currency:'KRW',productUrl:'https://example.com/'+id,priceCheckedAt:'2026-09-19',allergyInfo:{status:'ingredients',statement:name},allergens:[],nutritionSourceUrl:'https://example.com/label',nutritionBasis:'100g',caloriesKcal:100,proteinG:5} as unknown as CatalogItem);
test('roles distinguish cooking state and reject incompatible processed foods',()=>{
 for(const [name,role] of [['소고기 불고기용','rawBeef'],['양념 소불고기','beef'],['돼지고기 앞다리 불고기용','rawPork'],['쌀 4kg',null],['현미밥','rice'],['순두부',null],['마파두부',null],['감자전',null],['감자','potato'],['삼겹살 찌개용',null]] as const)assert.equal(ingredientRole(item('x',name,'300g')),role,name);
 assert.equal(ingredientPack(item('x','두부','150g x 2개입 · 냉장'),'tofu'),300);
 assert.equal(ingredientPack(item('x','두부','300g 내외'),'tofu'),null);
 assert.equal(ingredientPack(item('x','두부','300g (150g x 2)'),'tofu'),null);
 assert.equal(ingredientPack(item('x','달걀','10구 · 1팩'),'eggs'),10);
});
test('unlisted catalog IDs create priced recipes without original hardcoded ingredients',()=>{
 const catalog=[item('new-rice','즉석 현미밥','210g'),item('new-tofu','부침용 두부','300g'),item('new-eggs','무항생제 달걀','10구'),item('new-mushroom','표고버섯','100g'),item('new-cabbage','양배추','600g'),item('new-onion','양파','200g'),item('other-tofu','국산 두부','500g',3000)];
 const pool=cookingIngredientPool(catalog);assert.equal(pool.tofu.length,2);
 const products=cookingProducts(catalog);assert.ok(products.length>3);
 const tofu=products.find(p=>p.id.startsWith('cook-tofu-egg--auto--'))!;assert.ok(tofu);
 assert.equal(tofu.recipe!.ingredients.find(i=>i.product.id==='new-eggs')?.packs,.2);
 assert.equal(tofu.recipe!.nutrition.calories,null,'egg count must not turn into edible grams');
 const c={...initialConditions,mealMode:'cook' as const,days:3,meals:3,budget:15000};
 const ids=recommendShopping(products,c)!;assert.equal(ids.length,3);assert.ok(basketTotal(ids,products,[])<=15000);
 assert.equal(new Set(ids.map(id=>id.split('--auto--')[0])).size,3);
 const twins=products.filter(p=>p.id.startsWith('cook-tofu-egg--auto--')).slice(0,2).map(p=>p.id);
 assert.equal(validMealIds(twins,products,{...c,days:2,meals:2}),false);
 assert.equal(cookingIngredientPool(catalog.map(p=>({...p,priceCheckedAt:null}))).tofu.length,0);
 assert.ok(!cookingProducts(catalog.map(p=>({...p,detail:'용량 미확인'}))).length);
});
