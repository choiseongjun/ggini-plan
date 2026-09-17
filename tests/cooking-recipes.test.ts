import assert from 'node:assert/strict';
import {test} from 'node:test';
import {emptyAllergyInfo} from '../lib/catalog-allergy';
import type {CatalogItem} from '../lib/catalog';
import {cookingProducts,matchesCookingAlternative} from '../lib/cooking-recipes';
import {basketTotal,purchaseBasket,recommendShopping,initialConditions,parseConditions,candidates} from '../lib/shopping-plan';
import {availablePortions,consumeFood,restoreConsumption} from '../lib/food-intake';
import {sharedPlanSnapshot} from '../lib/shared-plan';
const ingredient=(id:string,price:number,quantity:number,detail:string,unit:'g'|'개'='g'):CatalogItem=>({emoji:'🍚',portions:'1팩',protein:'',color:'',searchQuery:id,category:'ingredient',inWeeklyCart:false,productImageUrl:null,nutritionSourceName:null,nutritionPhotoUrl:null,carbohydratesG:null,fatG:null,sodiumMg:null,updatedAt:null,id,name:id,price,quantity,detail,unit,productUrl:'https://example.test/item',nutritionBasis:'100g당',caloriesKcal:100,proteinG:10,nutritionSourceUrl:'https://example.test/nutrition',allergens:[],allergyInfo:{...emptyAllergyInfo,status:'ingredients',statement:id}});
const catalog=[ingredient('rice',2000,210,'210g × 1개'),ingredient('tofu',2200,300,'300g × 1팩'),ingredient('eggs',7700,20,'20구 · 1팩','개'),ingredient('chicken',2090,100,'100g'),ingredient('kurly-5036690',6890,1,'600g · 1봉','개')];
const products=cookingProducts(catalog),tofu=products.find(p=>p.id==='cook-tofu-rice')!,egg=products.find(p=>p.id==='cook-egg-rice')!;
test('two recipes share selling packs and preserve fractional leftovers',()=>{
 const ids=[tofu.id,egg.id],rows=purchaseBasket(ids,products,[]);
 assert.equal(rows.find(r=>r.product.id==='rice')?.packs,2);
 assert.equal(rows.find(r=>r.product.id==='kurly-5036690')?.packs,1);
 assert.equal(rows.find(r=>r.product.id==='kurly-5036690')?.left,0.6);
 assert.equal(basketTotal(ids,products,[]),4000+2200+7700+6890);
 assert.equal(basketTotal(ids,products,[],{'rice':2,'tofu':0.5,'eggs':0.1,'kurly-5036690':0.4}),0);
 assert.equal(purchaseBasket(ids,products,[],{}, {[tofu.id]:0,[egg.id]:0}).length,0);
});
test('recipe mode, exclusions, breakfast and budget are respected',()=>{
 assert.equal(products.length,4);
 assert.equal(candidates(products,{...initialConditions,mealMode:'ready'}).length,0);
 assert.equal(parseConditions({...initialConditions,mealMode:'invalid'}),null);
 assert.equal(candidates(products,{...initialConditions,excluded:['egg']}).some(p=>p.recipe?.ingredients.some(i=>i.product.id==='eggs')),false);
 const c={...initialConditions,mealMode:'cook' as const,days:2,meals:2,budget:14000};
 const ids=recommendShopping(products,c)!;assert.equal(ids.length,2);assert.ok(basketTotal(ids,products,[])<=c.budget);
 assert.equal(recommendShopping(products,{...c,budget:1000}),null);
});
test('changed selling units or incomplete ingredient catalog never invent a recipe',()=>{
 assert.equal(cookingProducts([]).length,0);
 assert.equal(cookingProducts(catalog.map(p=>p.id==='rice'?{...p,quantity:2520}:p)).length,0);
 const unknown=cookingProducts(catalog.map(p=>p.id==='tofu'?{...p,proteinG:null}:p)).find(p=>p.id===tofu.id)!;
 assert.equal(unknown.recipe?.nutrition.protein,null);
});
test('eating consumes only used ingredients and undo restores exact snapshots',()=>{
 const stock=Object.fromEntries(tofu.recipe!.ingredients.map(({product:p})=>[p.id,{id:p.id,name:p.name,unit:'묶음',url:p.productUrl,ordered:0,owned:1}]));
 const result=consumeFood(stock,tofu,1);
 assert.equal(availablePortions(stock,tofu),1);
 assert.equal(result.stock.tofu.owned,0.5);assert.equal(result.stock['kurly-5036690'].owned,0.8);assert.equal(result.stock.rice.owned,0);
 assert.equal(stock.tofu.owned,1);
 assert.deepEqual(restoreConsumption(result.stock,result.snapshot,result.packs),stock);
 assert.throws(()=>consumeFood({...stock,tofu:{...stock.tofu,owned:0}},tofu,1));
 assert.equal(stock.rice.owned,1);
});
test('shared plan retains meals but lists actual ingredients once',()=>{
 const snapshot=sharedPlanSnapshot({...initialConditions,days:2,meals:2},[tofu.id,egg.id],products)!;
 assert.equal(snapshot.products.length,2);assert.equal(snapshot.meals[0].productId,tofu.id);
 assert.equal(snapshot.purchases!.filter(p=>p.id==='kurly-5036690').length,1);
 assert.equal(snapshot.total,snapshot.purchases!.reduce((sum,p)=>sum+p.price*p.packs,0));
});

test('comparison matches the main ingredient instead of merely sharing rice or porridge',()=>{
 const chicken=products.find(p=>p.id==='cook-chicken-porridge')!;
 const ready=(name:string)=>({...chicken,name,recipe:undefined});
 assert.equal(matchesCookingAlternative(chicken,ready('소고기버섯죽')),false);
 assert.equal(matchesCookingAlternative(chicken,ready('호박죽')),false);
 assert.equal(matchesCookingAlternative(chicken,ready('닭죽')),true);
 assert.equal(matchesCookingAlternative(egg,ready('계란볶음밥')),true);
 assert.equal(matchesCookingAlternative(egg,ready('새우 계란볶음밥')),false);
});
