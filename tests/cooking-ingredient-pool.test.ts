import {test} from 'node:test';
import assert from 'node:assert/strict';
import type {CatalogItem} from '../lib/catalog';
import {ingredientRole,ingredientPack,cookingIngredientPool} from '../lib/cooking-ingredient-pool';
import {cookingProducts} from '../lib/cooking-recipes';
import {recommendShopping,initialConditions,basketTotal,validMealIds} from '../lib/shopping-plan';
import {hasGoalNutrition} from '../lib/shopping-goals';
const item=(id:string,name:string,detail:string,price=2000)=>({id,name,detail,price,unit:'개',quantity:1,market:'KR',currency:'KRW',productUrl:'https://example.com/'+id,priceCheckedAt:'2026-09-19',allergyInfo:{status:'ingredients',statement:name},allergens:[],nutritionSourceUrl:'https://example.com/label',nutritionBasis:'100g',caloriesKcal:100,proteinG:5} as unknown as CatalogItem);
test('complete nutrition combinations survive cheap ingredients with multiple missing labels',()=>{
 const catalog=[['현미밥','210g'],['두부','300g'],['달걀','10구'],['표고버섯','100g'],['양배추','600g'],['양파','200g']].flatMap(([name,detail],role)=>[
  ...Array.from({length:5},(_,i)=>({...item(`cheap-${role}-${i}`,name,detail,100+i),caloriesKcal:null,proteinG:null})),
  {...item(`known-${role}`,name,detail,2000),nutritionBasis:role===2?'1개당':'100g당',fatG:3,carbohydratesG:10},
 ]);
 const products=cookingProducts(catalog);
 assert.equal(new Set(products.map(p=>p.id)).size,products.length);
 for(const goal of ['lose','muscle','lowfat','lowcarb'] as const){
  const c={...initialConditions,mealMode:'cook' as const,days:5,meals:5,budget:150000,goal};
  const ids=recommendShopping(products,c);
  assert.ok(ids);assert.equal(ids.length,5);assert.ok(validMealIds(ids,products,c));
  assert.ok(ids.every(id=>hasGoalNutrition(products.find(p=>p.id===id)!,goal)));
  assert.ok(basketTotal(ids,products,[])<=c.budget);
 }
 const cheapOnly=cookingProducts(catalog.filter(p=>p.id.startsWith('cheap-')));
 assert.equal(cheapOnly.filter(p=>hasGoalNutrition(p,'lose')).length,0,'missing values are never fabricated');
});
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
