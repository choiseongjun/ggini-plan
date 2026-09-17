import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import type {CatalogItem} from '../lib/catalog';
import {comparableNutrition,comparablePrice,filterComparison,safeStructuredJson} from '../lib/product-comparison';
import {foodTypes} from '../lib/catalog-food-types';
import {foodComparisonGuides} from '../lib/food-comparison-guides';
const item={id:'a',name:'상품 A',detail:'2팩',price:8000,quantity:400,unit:'g',nutritionBasis:'총 내용량 200g당',nutritionSourceUrl:'https://example.com/label',nutritionPhotoUrl:null,caloriesKcal:320,proteinG:24,carbohydratesG:20,fatG:8,sodiumMg:null} as CatalogItem;
test('nutrition compares explicit g and mL independently, including zero but not unknown',()=>{
 assert.deepEqual(comparableNutrition(item),{unit:'g',calories:160,protein:12,carbs:10,fat:4,sodium:null});
 assert.equal(comparableNutrition({...item,nutritionBasis:'1팩 200mL당'}).unit,'mL');
 assert.equal(comparableNutrition({...item,proteinG:0}).protein,0);
 for(const nutritionBasis of [null,'1팩','총 200g, 100g당','0g당','가식부 100g당','200g당 (조리 후)','100g당 (일반 식품 참고값)'])assert.equal(comparableNutrition({...item,nutritionBasis}).protein,null,nutritionBasis??'null');
 assert.equal(comparableNutrition({...item,nutritionSourceUrl:null}).protein,null);
});
test('whole package prices and quantity units are kept distinct',()=>{
 assert.deepEqual(comparablePrice(item),{amount:2000,basis:'100g'});
 assert.deepEqual(comparablePrice({...item,unit:'개',quantity:2}),{amount:4000,basis:'1개'});
 assert.equal(comparablePrice({...item,quantity:0}),null);
 assert.deepEqual(comparablePrice({...item,unit:'개',quantity:1,detail:'400g · 1팩'}),{amount:2000,basis:'100g'});
 assert.deepEqual(comparablePrice({...item,unit:'개',quantity:1,detail:'200mL · 1팩'}),{amount:4000,basis:'100mL'});
 assert.deepEqual(comparablePrice({...item,unit:'개',quantity:1,detail:'100g*4 · 1묶음'}),{amount:8000,basis:'1개'});
 assert.equal(comparablePrice({...item,detail:'200mL · 1팩'}),null);
});
test('nutrition ordering never treats unknown or mL values as g and does not mutate input',()=>{
 const unknown={...item,id:'unknown',name:'가',proteinG:null};
 const liquid={...item,id:'liquid',nutritionBasis:'200mL당',proteinG:100};
 const high={...item,id:'high',proteinG:40};const input=[unknown,item,liquid,high];
 assert.deepEqual(filterComparison(input,'','protein').map(p=>p.id),['high','a','unknown','liquid']);
 assert.equal(input[0],unknown);assert.equal(filterComparison(input,'상품 A','price').length,3);
});
test('100 distinct search intents map to existing category or guide routes and JSON is safe',()=>{
 const {keywords}=JSON.parse(readFileSync('data/korean-search-topics.json','utf8'));
 assert.equal(keywords.length,100);assert.equal(new Set(keywords.map((k:{query:string})=>k.query)).size,100);
 for(const {path} of keywords){if(path.startsWith('/foods/'))assert.ok(Object.hasOwn(foodTypes,path.split('/')[2]));else assert.ok(['/','/products','/guides/weekly-food-budget','/guides/grocery-list-for-one','/guides/easy-weekly-meal-plan'].includes(path));}
 assert.deepEqual(Object.keys(foodComparisonGuides).sort(),Object.keys(foodTypes).sort());
 const raw={name:'</script><script>alert(1)</script>'};const encoded=safeStructuredJson(raw);assert.ok(!encoded.includes('<'));assert.deepEqual(JSON.parse(encoded),raw);
});
