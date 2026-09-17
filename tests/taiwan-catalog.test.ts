import assert from 'node:assert/strict';
import {test} from 'node:test';
import fs from 'node:fs';
const collected=JSON.parse(fs.readFileSync('data/taiwan-products.json','utf8'));
const reviewed=JSON.parse(fs.readFileSync('data/taiwan-catalog.json','utf8'));
test('Taiwan catalog contains 500 distinct seller products with real TWD offers',()=>{
 const products=[...collected.products,...reviewed.products];
 assert.equal(products.length,500);assert.equal(new Set(products.map(p=>p.id)).size,500);
 for(const p of products){assert.ok(Number.isSafeInteger(p.priceMinor)&&p.priceMinor>0);assert.ok(new URL(p.productUrl).protocol==='https:');assert.ok(p.name.trim());}
 assert.equal(collected.seller,'萬家福線上購物');
 assert.ok(collected.products.some((p:{category:string})=>p.category==='ingredient'));
 assert.ok(collected.products.some((p:{category:string})=>p.category==='frozen_meal'));
});
test('Unreviewed retail units do not invent nutrition or servings',()=>{
 for(const p of collected.products){assert.equal(p.servings,undefined);assert.equal(p.calories,undefined);assert.ok(p.checkedAt);assert.ok(p.sourceUrl);assert.ok(p.categoryPath.length);}
});

test('Reviewed nutrition keeps label units and meal portions separate',()=>{
 const rows=JSON.parse(fs.readFileSync('data/taiwan-nutrition-reviewed.json','utf8')).products;
 const ids=new Set(collected.products.map((p:{id:string})=>p.id));
 assert.equal(new Set(rows.map((p:{id:string})=>p.id)).size,rows.length);
 for(const p of rows){
  assert.ok(ids.has(p.id));assert.ok(p.sourceUrl.startsWith('https://online.uni-prosperity.com.tw/'));
  for(const key of ['calories','protein','fat','carbs','sodium'])assert.ok(Number.isFinite(p[key])&&p[key]>=0);
  assert.ok(p.basisGrams>0);
  if(p.basisUnit==='ml'){assert.equal(p.packGrams,null);assert.equal(p.meal,false);}
  if(p.meal){assert.equal(p.basisGrams,p.packGrams);assert.ok(p.packGrams>=150);}
 }
});
