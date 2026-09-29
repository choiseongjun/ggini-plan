import assert from 'node:assert/strict';
import {test} from 'node:test';
import {getPool} from '../lib/db';
import {encodeRecommendationCatalog,decodeRecommendationCatalog,hydrateRecommendationProducts} from '../lib/recommendation-catalog';
import type {PlanProduct} from '../lib/shopping-plan';

test('compressed catalog preserves exact numeric values and ingredient data',()=>{
 const products=[{id:'recipe-opt-test',name:'계란볶음밥',price:892,personalizationScore:0,recipe:{ingredients:[{packs:0.125,product:{id:'egg',price:5600}}],steps:['','공통 안내']}}] as PlanProduct[];
 const encoded=encodeRecommendationCatalog(products);
 assert.deepEqual(decodeRecommendationCatalog(encoded),products);
 assert.throws(()=>decodeRecommendationCatalog('invalid'));
});

test('only selected meals and their composed sides load display details without changing costs',async t=>{
 const previous=process.env.DATABASE_URL;
 process.env.DATABASE_URL??='postgresql://localhost/recommendation-catalog-test';
 const pool=getPool();let calls=0;
 t.mock.method(pool,'query',async(sql:string,params:unknown[])=>{
  calls++;
  assert.match(sql,/WHERE food_code=ANY/);
  assert.deepEqual(params,[['test-main','test-side']]);
  return {rows:[{food_code:'test-main',note:'메인 설명',image_url:'https://example.com/main.jpg',image_urls:['https://example.com/main.jpg']},{food_code:'test-side',note:'반찬 설명',image_url:null,image_urls:null}]};
 });
 t.after(async()=>{t.mock.restoreAll();await pool.end();if(previous===undefined)delete process.env.DATABASE_URL;else process.env.DATABASE_URL=previous;});
 const product={id:'recipe-opt-test-main--sides-1-test-side',price:1500,personalizationScore:42,recipe:{steps:['','공통 안내','반찬: ','반찬: 반찬 공통 안내'],ingredients:[{packs:0.2,product:{id:'egg',price:5000}}],composition:{items:[{id:'recipe-opt-test-main',role:'main'},{id:'recipe-opt-test-side',role:'side'}]},sides:[{name:'반찬',steps:['','반찬 공통 안내']}]}} as unknown as PlanProduct;
 const [result]=await hydrateRecommendationProducts([product]);
 assert.equal(result.price,1500);assert.equal(result.personalizationScore,42);
 assert.deepEqual(result.recipe!.ingredients,product.recipe!.ingredients);
 assert.deepEqual(result.recipe!.steps,['메인 설명','공통 안내','반찬: 반찬 설명','반찬: 반찬 공통 안내']);
 assert.equal(result.productImageUrl,'https://example.com/main.jpg');
 assert.equal(result.recipe!.sides![0].productImageUrl,null);
 assert.equal(product.recipe!.steps[0],'','cached input is never mutated');
 assert.deepEqual(await hydrateRecommendationProducts([]),[]);assert.equal(calls,1);
 t.mock.method(pool,'query',async()=>({rows:[]}));
 await assert.rejects(hydrateRecommendationProducts([product]),/unavailable/);
});
