import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {taiwanFoodKind,taiwanFoodGuides} from '../lib/taiwan-food-types';
import {comparableNutrition,filterComparison} from '../lib/product-comparison';
import {twComparablePrice,twNutritionDisplay,twProductPath} from '../lib/taiwan-comparison';
import {twMoney} from '../lib/taiwan-plan';
import type {CatalogItem} from '../lib/catalog';
const item={id:'tw-test',name:'雞胸肉',detail:'200g · 1 包',market:'TW',currency:'TWD',price:9900,quantity:200,unit:'g',nutritionBasis:'200g',nutritionSourceUrl:'https://example.com/label',nutritionPhotoUrl:null,caloriesKcal:220,proteinG:40,carbohydratesG:2,fatG:4,sodiumMg:500} as CatalogItem;
test('Taiwan display converts minor currency units exactly once and preserves nutrition units',()=>{
 assert.equal(twMoney(item.price),'NT$99');
 assert.equal(twMoney(twComparablePrice(item)!.amount),'NT$49.5');
 assert.equal(comparableNutrition(item).protein,20);
 assert.equal(comparableNutrition({...item,nutritionBasis:'200ml'}).unit,'mL');
 assert.equal(twNutritionDisplay(null,'g'),'尚未確認');
 assert.equal(twProductPath(item.id),'/tw/products/tw-test');
});
test('prepared dishes take precedence over named ingredients and raw groups follow seller paths',()=>{
 assert.equal(taiwanFoodKind('雞胸肉炒飯'),'fried_rice');
 assert.equal(taiwanFoodKind('起司水餃'),'dumplings');
 assert.equal(taiwanFoodKind('鮮奶饅頭'),'buns');
 assert.equal(taiwanFoodKind('舒肥雞胸'),'chicken_breast');
 assert.equal(taiwanFoodKind('青江菜',['生鮮冷凍','各式蔬菜','葉菜類']),'vegetables');
 assert.equal(taiwanFoodKind('不明商品'),'other');
});
test('all 500 source products map once and all 100 search intents point to populated pages',()=>{
 const items=['data/taiwan-products.json','data/taiwan-catalog.json'].flatMap(f=>JSON.parse(readFileSync(f,'utf8')).products);
 assert.equal(items.length,500);const counts=new Map<string,number>();
 for(const p of items){const key=taiwanFoodKind(p.name,p.categoryPath);assert.ok(Object.hasOwn(taiwanFoodGuides,key));counts.set(key,(counts.get(key)??0)+1);}
 assert.equal([...counts.values()].reduce((a,b)=>a+b,0),500);
 const {keywords}=JSON.parse(readFileSync('data/taiwan-search-topics.json','utf8'));
 assert.equal(keywords.length,100);assert.equal(new Set(keywords.map((k:{query:string})=>k.query)).size,100);
 for(const {path} of keywords){if(path==='/tw/products')continue;assert.ok(path.startsWith('/tw/foods/'));assert.ok(counts.get(path.split('/').at(-1))!>0);}
});
test('nutrition sort leaves incomparable mL and unknown data behind measured g values',()=>{
 const milk={...item,id:'milk',nutritionBasis:'200ml',proteinG:90},unknown={...item,id:'unknown',proteinG:null};
 assert.equal(filterComparison([milk,unknown,item],'','protein','zh-TW')[0].id,'tw-test');
 assert.equal(twComparablePrice({...item,unit:'개',quantity:1,detail:'規格請見賣場'})?.basis,'每個販售單位');
});
