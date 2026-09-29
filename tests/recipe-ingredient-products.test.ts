import assert from 'node:assert/strict';
import {test} from 'node:test';
import {ingredientSearchTerms,matchesIngredientProduct} from '../lib/recipe-ingredient-products';

const candidates=[
 {name:'스파게티 컵',category:'ingredient'},
 {name:'프로틴 파스타',category:'ingredient'},
 {name:'[농장] 대파 500g',category:'ingredient'},
 {name:'[농장] 계란 10구',category:'ingredient'},
 {name:'[브랜드] 두부 300g',category:'ingredient'},
 {name:'게살 200g',category:'ingredient'},
 {name:'게살 볶음밥',category:'frozen_meal'},
 {name:'두부면 200g',category:'ingredient'},
 {name:'한끼 계란 연두부 2입',category:'ingredient'},
 {name:'깐 계란 700g',category:'ingredient'},
];
for(const [dish,names] of [
 ['게살볶음밥',['게살','파','밥']],
 ['계란 덮밥',['달걀(생것)','파','밥']],
 ['두부구이',['두부','파','식용유']],
] as const){
 test(`BUG-003: ${dish} only returns relevant ingredient products`,()=>{
  const terms=ingredientSearchTerms([...names]);
  const actual=candidates.filter(p=>matchesIngredientProduct(p.name,p.category,terms)).map(p=>p.name);
  assert.deepEqual(actual,dish==='게살볶음밥'?['[농장] 대파 500g','게살 200g']:dish==='계란 덮밥'?['[농장] 대파 500g','[농장] 계란 10구']:['[농장] 대파 500g','[브랜드] 두부 300g']);
 });
}
test('no broad fallback, brand-only matches or wildcard matches',()=>{
 assert.equal(matchesIngredientProduct('프로틴 파스타','ingredient',ingredientSearchTerms(['파'])),false);
 assert.equal(matchesIngredientProduct('[두부] 스낵','ingredient',['두부']),false);
 assert.equal(matchesIngredientProduct('계란','ready_meal',['계란']),false);
 assert.deepEqual(ingredientSearchTerms(['물','']),[]);
 assert.equal(matchesIngredientProduct('두부','ingredient',['.*']),false);
 assert.equal(matchesIngredientProduct('두부 부침용 300g','ingredient',['두부']),true);
});
