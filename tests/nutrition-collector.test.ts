import {test} from 'node:test';
import assert from 'node:assert/strict';
import {nutritionProductUrl,allowedNutritionImage,nutritionSources,completeNutrition} from '../lib/nutrition-collector';
import {extractNutrition} from '../lib/nutrition-ocr';
const url='https://www.kurly.com/goods/123';
const label='100g당 열량 150kcal 단백질 8g 탄수화물 20g 지방 4g 나트륨 250mg';
function page(p:object){return `<script id="__NEXT_DATA__">${JSON.stringify({props:{pageProps:{product:p}}})}</script>`;}
test('collection allows only fixed public product paths and image hosts',()=>{
  assert.ok(nutritionProductUrl(url));
  for(const v of ['http://www.kurly.com/goods/1','https://localhost/goods/1','https://www.kurly.com.evil.com/goods/1','https://www.kurly.com/goods/1?url=http://localhost','https://user:pass@www.kurly.com/goods/1'])assert.throws(()=>nutritionProductUrl(v));
  assert.equal(allowedNutritionImage('https://img-cf.kurly.com/a.jpg'),true);
  for(const v of ['https://img-cf.kurly.com.evil.com/a','http://127.0.0.1/a','https://img-cf.kurly.com:444/a'])assert.equal(allowedNutritionImage(v),false);
});
test('reads nutrition notice only and verifies product identity and options',()=>{
  const product={no:123,productNotice:[{notices:[{type:'PN06',description:label},{type:'PN05',description:'원재료명'}]}],productDetail:{legacyPiImages:['https://img-cf.kurly.com/a.jpg','http://localhost/private']}};
  const result=nutritionSources(page(product),url);
  assert.equal(result.text,label);assert.equal(result.images.length,1);
  assert.equal(completeNutrition(extractNutrition(result.text)),true);
  assert.throws(()=>nutritionSources(page({...product,no:124}),url));
  assert.throws(()=>nutritionSources(page({...product,dealProducts:[{},{}]}),url));
});
test('multiple labels and incomplete data are not considered saveable',()=>{
  assert.equal(completeNutrition(extractNutrition(label+'\n'+label)),false);
  assert.equal(completeNutrition(extractNutrition('영양정보 상품 이미지 참조')),false);
  assert.equal(completeNutrition({...extractNutrition(label),fatG:-1}),false);
  assert.equal(completeNutrition({...extractNutrition(label),fatG:NaN}),false);
  assert.equal(completeNutrition({...extractNutrition(label),fatG:0}),true);
});
test('oasis extracts labelled rows, ignores advertising and unlabelled pictures',()=>{
  const result=nutritionSources(`<div>${label}</div><table><tr><th>영양성분</th><td>${label}</td></tr></table><img src="https://oasisprodproduct.edge.naverncp.com/n.jpg" alt="영양정보"><img src="https://oasisprodproduct.edge.naverncp.com/advert.jpg">`,'https://www.oasis.co.kr/product/detail/123');
  assert.equal(completeNutrition(extractNutrition(result.text)),true);assert.equal(result.images.length,1);
});
