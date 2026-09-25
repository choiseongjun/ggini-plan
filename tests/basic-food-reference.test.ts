import {test} from 'node:test';
import assert from 'node:assert/strict';
import {manualFoodReference,rawFoodReference,rankFoodReferences} from '../lib/basic-food-reference';
test('basic fruit outranks tea and branded products',()=>{
 const base=manualFoodReference('manual:사과')!;
 const items=[{...base,code:'tea',name:'사과차'},{...base,code:'brand',name:'사과',brand:'브랜드'},{...base,code:'raw:apple'}];
 assert.equal(rankFoodReferences(items,'사과',30)[0].code,'raw:apple');
});
test('raw references preserve source basis without inventing piece weights',()=>{
 const f=rawFoodReference({food_code:'APPLE',item_name:'사과_생것',category_large:'과일',basis_amount:'100g',calories_kcal:'57',protein_g:'0.2',carbohydrates_g:null,sugar_g:null,fat_g:null,sodium_mg:null});
 assert.equal(f?.name,'사과');assert.equal(f?.servingAmount,100);assert.equal(f?.kcal,57);assert.equal(f?.carbs,null);
});
test('manual names have unknown nutrition and validate length and controls',()=>{
 assert.equal(manualFoodReference('manual:집에서 만든 간식')?.kcal,null);
 for(const code of ['manual:','manual:'+ '가'.repeat(41),'manual:사\n과','raw:apple'])assert.equal(manualFoodReference(code),null);
});
