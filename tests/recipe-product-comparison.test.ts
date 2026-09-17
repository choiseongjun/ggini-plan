import assert from 'node:assert/strict';
import {test} from 'node:test';
import type {CatalogItem} from '../lib/catalog';
import {compareRecipeProducts} from '../lib/recipe-product-comparison';
import {estimateRecipes} from '../lib/recipe-estimates';
import {initialConditions} from '../lib/shopping-plan';
import imported from '../data/recipe-ingredient-import.json';
const beef=estimateRecipes.find(r=>r.id==='beef-mushroom-porridge')!;
const item={id:'kurly-5103616',name:'[KF365] 1+ 한우 불고기용 300g(냉장)',detail:'300g · 1팩 · 냉장',unit:'개',quantity:1,price:15540,category:'ingredient',currency:'KRW',market:'KR',productUrl:'https://www.kurly.com/goods/5103616',priceCheckedAt:'2026-09-16T00:00:00.000Z',allergyInfo:null} as CatalogItem;
test('pack prices give a subtotal, never a complete price when rice is unknown',()=>{
 const result=compareRecipeProducts(beef,[item],initialConditions,[],7);
 const row=result.rows.find(r=>r.id==='beef')!,rice=result.rows.find(r=>r.id==='rice')!;
 assert.equal(result.linked,1);assert.equal(row.amount,490);assert.equal(row.packs,2);
 assert.equal(row.purchaseCost,31080);assert.equal(row.usedCost,25382);assert.equal(row.left,110);
 assert.equal(rice.pack,null);assert.equal(rice.packs,null);assert.equal(rice.usedCost,null);assert.equal(rice.purchaseCost,null);assert.equal(rice.left,null);
 assert.equal(result.usedSubtotal,25382);assert.equal(result.purchaseSubtotal,31080);
 assert.equal(result.usedTotal,null);assert.equal(result.purchaseTotal,null);assert.equal(result.missing,5);
});
test('recorded fractional stock reduces purchase cost only',()=>{
 const result=compareRecipeProducts(beef,[item],{...initialConditions,supply:{[item.id]:0.5}});
 const row=result.rows.find(r=>r.id==='beef')!;
 assert.equal(row.have,150);assert.equal(row.packs,0);assert.equal(row.left,80);assert.equal(row.usedCost,3626);
 assert.equal(result.purchaseTotal,null);
});
test('owning unpriced ingredients resolves checkout only, not consumption cost',()=>{
 const result=compareRecipeProducts(beef,[item],initialConditions,beef.parts.map(([id])=>id));
 assert.equal(result.purchaseTotal,0);assert.equal(result.purchaseMissing,0);
 assert.equal(result.usedTotal,null);assert.equal(result.usedSubtotal,3626);
 const unknownOwned=result.rows.find(r=>r.id==='rice')!;
 assert.equal(unknownOwned.purchaseCost,0);assert.equal(unknownOwned.usedCost,null);assert.equal(unknownOwned.left,null);
});
test('missing source/date, changed packs, currency and exclusions fail closed',()=>{
 for(const changed of [{...item,detail:'600g · 2팩'},{...item,currency:'JPY'},{...item,price:NaN},{...item,name:'소고기 양념 불고기'},{...item,priceCheckedAt:null},{...item,priceCheckedAt:'invalid'},{...item,productUrl:'https://example.com/other'}]){
  const result=compareRecipeProducts(beef,[changed],initialConditions);assert.equal(result.linked,0);assert.equal(result.usedTotal,null);assert.equal(result.purchaseTotal,null);
 }
 assert.equal(compareRecipeProducts(beef,[item],{...initialConditions,excluded:['milk']}).linked,0);
});
test('fully sourced recipe has totals and updates when catalog prices change',()=>{
 const single={...beef,parts:[['beef',70] as ['beef',number]]};
 const result=compareRecipeProducts(single,[{...item,price:18000}],initialConditions);
 assert.equal(result.usedTotal,4200);assert.equal(result.purchaseTotal,18000);
 assert.equal(compareRecipeProducts(beef,[],initialConditions).linked,0);
});
test('collected Kurly ingredients cover every recipe and price raw rice by 4kg pack',()=>{
 const catalog:CatalogItem[]=imported.rows.map(r=>({...item,...r,unit:r.unit as CatalogItem['unit'],category:'ingredient',market:'KR',currency:'KRW',productUrl:r.sourceUrl,priceCheckedAt:r.checkedAt,allergyInfo:null}));
 assert.equal(new Set(catalog.map(p=>p.id)).size,18);
 for(const recipe of estimateRecipes){
  const result=compareRecipeProducts(recipe,catalog,initialConditions);
  assert.equal(result.missing,0,recipe.name);assert.notEqual(result.usedTotal,null);assert.notEqual(result.purchaseTotal,null);
 }
 const rice=compareRecipeProducts(beef,catalog,initialConditions).rows.find(r=>r.id==='rice')!;
 assert.equal(rice.pack,4000);assert.equal(rice.amount,60);
 assert.equal(rice.purchaseCost,18900);assert.equal(rice.usedCost,283.5);
 const multi=compareRecipeProducts(beef,catalog,initialConditions,[],7).rows.find(r=>r.id==='rice')!;
 assert.equal(multi.packs,1);assert.equal(multi.amount,420);assert.equal(multi.usedCost,1984.5);
});
