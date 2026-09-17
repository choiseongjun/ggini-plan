import assert from 'node:assert/strict';
import {test} from 'node:test';
import type {CatalogItem} from '../lib/catalog';
import {compareRecipeProducts} from '../lib/recipe-product-comparison';
import {estimateRecipes} from '../lib/recipe-estimates';
import {initialConditions} from '../lib/shopping-plan';
const beef=estimateRecipes.find(r=>r.id==='beef-mushroom-porridge')!;
const item={id:'kurly-5103616',name:'[KF365] 1+ 한우 불고기용 300g(냉장)',detail:'300g · 1팩 · 냉장',unit:'개',quantity:1,price:15540,category:'ingredient',currency:'KRW',market:'KR',productUrl:'https://www.kurly.com/goods/5103616',allergyInfo:null} as CatalogItem;
test('actual ingredient cost uses the pack amount and rounds checkout up, not consumption',()=>{
 const result=compareRecipeProducts(beef,[item],initialConditions,[],7);
 const row=result.rows.find(r=>r.id==='beef')!;
 assert.equal(result.linked,1);assert.equal(row.amount,490);
 assert.equal(row.packs,2);assert.equal(row.buyLow,31080);assert.equal(row.buyHigh,31080);
 assert.equal(row.usedLow,25382);assert.equal(row.left,110);
 assert.equal(result.rows.find(r=>r.id==='rice')!.product,undefined);
});
test('recorded stock is fractional packs and reduces checkout only',()=>{
 const result=compareRecipeProducts(beef,[item],{...initialConditions,supply:{[item.id]:0.5}});
 const row=result.rows.find(r=>r.id==='beef')!;
 assert.equal(row.have,150);assert.equal(row.packs,0);assert.equal(row.left,80);assert.equal(row.usedLow,3626);
 const owned=compareRecipeProducts(beef,[item],initialConditions,['beef'],7).rows.find(r=>r.id==='beef')!;
 assert.equal(owned.packs,0);assert.equal(owned.usedLow,25382);
});
test('changed packs, unknown allergy details with exclusions and foreign currency fall back',()=>{
 for(const changed of [{...item,detail:'600g · 2팩'},{...item,currency:'JPY'},{...item,price:NaN},{...item,name:'소고기 양념 불고기'}])assert.equal(compareRecipeProducts(beef,[changed],initialConditions).linked,0);
 assert.equal(compareRecipeProducts(beef,[item],{...initialConditions,excluded:['milk']}).linked,0);
});
