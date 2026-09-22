import assert from 'node:assert/strict';
import {test} from 'node:test';
import {buildDishNameIndex,resolveDishCandidate,cleanDishName,type GovDish} from '../lib/foodsafety-resolve';
import type {CatalogItem} from '../lib/catalog';

const dish=(itemName:string,representativeName=itemName):GovDish=>({
 foodCode:'D-'+itemName,itemName,representativeName,datasetLabel:'음식',basisAmount:'100g',
 caloriesKcal:200,proteinG:10,fatG:5,carbohydratesG:20,sugarG:5,sodiumMg:300,
});
const item=(id:string,name:string,extra:Partial<CatalogItem>={}):CatalogItem=>({
 id,name,detail:'1팩',price:5000,portions:'1팩',protein:'',color:'mint',searchQuery:name,unit:'g',quantity:300,
 category:'ready_meal',inWeeklyCart:true,productImageUrl:null,productUrl:'https://example.com/'+id,
 nutritionSourceName:null,nutritionSourceUrl:null,nutritionPhotoUrl:null,nutritionBasis:null,
 caloriesKcal:null,proteinG:null,carbohydratesG:null,fatG:null,sodiumMg:null,updatedAt:null,
 ...extra,
} as CatalogItem);

test('buildDishNameIndex keys by cleaned item and representative names',()=>{
 const index=buildDishNameIndex([dish('소불고기덮밥','불고기덮밥')]);
 assert.ok(index.has(cleanDishName('소불고기덮밥')));
 assert.ok(index.has(cleanDishName('불고기덮밥')));
 assert.equal(index.get(cleanDishName('소불고기덮밥'))?.itemName,'소불고기덮밥');
});

test('resolves a real catalog product whose name matches a government dish, deriving servings',()=>{
 const index=buildDishNameIndex([dish('소불고기덮밥')]);
 const product=item('kurly-1','소불고기덮밥',{unit:'개',quantity:1});
 const resolved=resolveDishCandidate(product,index,new Set());
 assert.ok(resolved);
 assert.equal(resolved?.servings,1);
 assert.equal(resolved?.id,'kurly-1');
});

test('parses an explicit 인분/개입 count from name or detail when unit is not a single count',()=>{
 const index=buildDishNameIndex([dish('제육볶음')]);
 const product=item('kurly-2','제육볶음',{unit:'g',quantity:600,detail:'2인분 · 600g'});
 const resolved=resolveDishCandidate(product,index,new Set());
 assert.equal(resolved?.servings,2);
});

test('never resolves a candidate without an honestly derivable serving size',()=>{
 const index=buildDishNameIndex([dish('제육볶음')]);
 const product=item('kurly-3','제육볶음',{unit:'g',quantity:600,detail:'600g'});
 assert.equal(resolveDishCandidate(product,index,new Set()),null);
});

test('never resolves a candidate with no real price or purchase link',()=>{
 const index=buildDishNameIndex([dish('소불고기덮밥')]);
 assert.equal(resolveDishCandidate(item('kurly-4','소불고기덮밥',{unit:'개',quantity:1,price:0}),index,new Set()),null);
 assert.equal(resolveDishCandidate(item('kurly-5','소불고기덮밥',{unit:'개',quantity:1,productUrl:null}),index,new Set()),null);
});

test('skips names that do not match any government dish',()=>{
 const index=buildDishNameIndex([dish('소불고기덮밥')]);
 assert.equal(resolveDishCandidate(item('kurly-6','완전히 다른 음식',{unit:'개',quantity:1}),index,new Set()),null);
});

test('skips products already present in the existing candidate pool',()=>{
 const index=buildDishNameIndex([dish('소불고기덮밥')]);
 const product=item('kurly-7','소불고기덮밥',{unit:'개',quantity:1});
 assert.equal(resolveDishCandidate(product,index,new Set(['kurly-7'])),null);
});
