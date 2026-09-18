import {test} from 'node:test';
import assert from 'node:assert/strict';
import {retailPortions,expandedMeals,riceCombinations} from '../lib/catalog-meals';
import manifest from '../data/catalog-kr-2000.json';
import {basketTotal,purchaseBasket,initialConditions,recommendShopping,candidates,type PlanProduct} from '../lib/shopping-plan';
import {consumeFood,restoreConsumption,servingNutrition} from '../lib/food-intake';
import type {CatalogItem} from '../lib/catalog';

test('retail portions distinguish total weight, multipacks and conflicting counts',()=>{
 const s={id:'x',name:'냉면',detail:'',productUrl:'https://example.com',sourceVolume:'400g',sourceSalesUnit:'1팩'};
 assert.deepEqual(retailPortions({...s,name:'냉면 2인분'}),{servings:2,servingGrams:200});
 assert.deepEqual(retailPortions({...s,sourceVolume:'200g × 4',name:'볶음밥 4개입'}),{servings:4,servingGrams:200});
 assert.equal(retailPortions({...s,name:'냉면 2인분 (4개입)'}),null);
 assert.equal(retailPortions({...s,sourceVolume:'2kg'}),null);
 assert.equal(retailPortions({...s,sourceVolume:'200g (100g x 2)'}),null);
});
test('raw kimbap ingredients, tofu, pickles and crackers never become full meals',()=>{
 const names=['김밥어묵','김밥햄','찌개두부','샌드위치피클','크래커 샌드위치'];
 const rows=manifest.rows.filter(p=>names.some(n=>p.name.includes(n))).map(p=>({...p,market:'KR',currency:'KRW',priceCheckedAt:p.checkedAt}) as unknown as CatalogItem);
 assert.ok(rows.length>=5);
 const result=expandedMeals(rows);assert.equal(result.mains.length+result.sides.length,0);
});
test('changed pack units fail closed instead of retaining the old serving contract',()=>{
 const source=manifest.rows.find(p=>p.name==='[그녀의빵공장] 라우겐 잠봉뵈르 샌드위치')!;
 const item={...source,market:'KR',currency:'KRW',priceCheckedAt:source.checkedAt} as unknown as CatalogItem;
 assert.equal(expandedMeals([item]).mains.length,1);
 assert.equal(expandedMeals([{...item,quantity:2}]).mains.length,0);
 assert.equal(expandedMeals([{...item,unit:'g'}]).mains.length,0);
});
const product=(id:string,price:number,extra:Partial<PlanProduct>={}):PlanProduct=>({id,name:id,price,servings:1,category:'ready_meal',productUrl:'https://example.com',avoidanceText:null,allergens:[],nutritionBasis:null,caloriesKcal:null,proteinG:null,...extra} as PlanProduct);
test('soup and rice combine purchase packs, consume one portion and preserve unknown nutrition',()=>{
 const rice=product('rice',2000,{detail:'210g × 1개',quantity:210,unit:'g'});
 const soup=product('soup',5000,{name:'갈비탕',servings:2});
 const meal=riceCombinations([soup],[rice])[0];
 assert.ok(meal);assert.equal(basketTotal([meal.id,meal.id],[meal],[]),9000);
 assert.equal(purchaseBasket([meal.id,meal.id],[meal],[]).length,2);
 assert.deepEqual(servingNutrition(meal),{calories:null,protein:null});
 const stock={soup:{id:'soup',name:'갈비탕',unit:'묶음',url:null,ordered:0,owned:1},rice:{id:'rice',name:'밥',unit:'묶음',url:null,ordered:0,owned:2}};
 const eaten=consumeFood(stock,meal,1);assert.equal(eaten.stock.soup.owned,0.5);assert.equal(eaten.stock.rice.owned,1);
 assert.deepEqual(restoreConsumption(eaten.stock,eaten.snapshot,eaten.packs),stock);
 assert.equal(candidates([meal],{...initialConditions,mealMode:'ready'}).length,1);
 assert.equal(candidates([meal],{...initialConditions,mealMode:'cook'}).length,0);
});
test('refresh favors unseen meals but never sacrifices budget or exclusions',()=>{
 const pool=['김밥','파스타','우동','샌드위치','비빔밥','도시락'].map(name=>product(name,3000,{name,avoidanceText:'확인'}));
 const c={...initialConditions,days:2,meals:2,budget:6000,mealMode:'ready' as const};
 const first=recommendShopping(pool,c)!;const second=recommendShopping(pool,c,false,first)!;
 assert.equal(second.filter(id=>first.includes(id)).length,0);assert.ok(basketTotal(second,pool,[])<=c.budget);
 assert.deepEqual(recommendShopping([pool[0]],c,false,[pool[0].id]),[pool[0].id,pool[0].id]);
 assert.equal(recommendShopping(pool,{...c,budget:1000},false,first),null);
});
