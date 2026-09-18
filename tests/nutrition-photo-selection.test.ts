import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readNutritionPhotos} from '../lib/nutrition-photo-selection';
import {emptyNutrition} from '../lib/nutrition-ocr';
const full={nutritionBasis:'100g당',caloriesKcal:150,proteinG:8,carbohydratesG:20,fatG:4,sodiumMg:200};
test('automatically tries the next image when first image is not a nutrition table',async()=>{
  const calls:(number|undefined)[]=[];
  const result=await readNutritionPhotos(async index=>{calls.push(index);return {images:['one','two','three'],imageUrl:index===1?'two':'one',extracted:index===1?full:emptyNutrition};},()=>{});
  assert.deepEqual(calls,[undefined,1]);assert.deepEqual(result.extracted,full);assert.equal(result.checkedImages,2);
});
test('never mixes partial tables or replaces useful numbers with an unreadable image',async()=>{
  const partial={...emptyNutrition,nutritionBasis:'100g당',caloriesKcal:100,proteinG:5};
  const result=await readNutritionPhotos(async index=>({images:['one','two','three'],imageUrl:'one',extracted:index===undefined?partial:index===1?{...emptyNutrition,nutritionBasis:'1팩당',fatG:8}:emptyNutrition}),()=>{});
  assert.deepEqual(result.extracted,partial);assert.equal(result.checkedImages,3);
});
test('a complete first image avoids extra API calls',async()=>{
  let calls=0;await readNutritionPhotos(async()=>{calls++;return {images:['one','two'],imageUrl:'one',extracted:full};},()=>{});assert.equal(calls,1);
});
