import test from 'node:test';
import assert from 'node:assert/strict';
import {foodProvenance} from '../lib/food-provenance';
const row={basis_amount:'100',basis_unit:'g',calories_kcal:'275',protein_g:'11.4',fat_g:null,carbohydrates_g:null,sugar_g:null,sodium_mg:null};
const raw={'영양성분함량기준량':'100g','에너지(kcal)':'275','단백질(g)':'11.40','데이터기준일자':'2026-08-28','데이터생성일자':'2023-10-31','식품중량':'946g','출처명':'식품의약품안전처'};
test('provenance keeps publication and creation dates distinct without inventing pieces',()=>{
 const p=foodProvenance(row,raw)!;assert.equal(p.matches,true);assert.equal(p.sourceDate,'2026-08-28');assert.equal(p.createdDate,'2023-10-31');assert.equal(p.weightText,'946g');assert.equal(p.servingText,null);
});
test('different nutrient values or units cannot certify displayed summary provenance',()=>{
 assert.equal(foodProvenance({...row,calories_kcal:'300'},raw)?.matches,false);
 assert.equal(foodProvenance({...row,basis_unit:'mL'},raw)?.matches,false);
 assert.equal(foodProvenance({...row,fat_g:'0'},raw)?.matches,false);
 assert.equal(foodProvenance(row,null),null);
});
