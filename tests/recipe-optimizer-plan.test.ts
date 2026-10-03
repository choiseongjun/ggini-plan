import assert from 'node:assert/strict';
import {test} from 'node:test';
import {recipeProductsFromResults} from '../lib/recipe-optimizer-plan';
import type {StoredRecipeResult} from '../lib/recipe-optimizer-store';
import {decodeRecommendationCatalog,encodeRecommendationCatalog} from '../lib/recommendation-catalog';
import {slimProduct} from '../lib/plan-picker';
import {candidates,initialConditions} from '../lib/shopping-plan';

test('nutrition-derived recipes have no cooking duration throughout recommendation and catalog delivery',()=>{
 const nutrients={kcal:500,protein:20,carbohydrate:70,fat:10,sugar:2,sodium:300};
 const record:StoredRecipeResult={
  foodCode:'test-egg-rice',targetName:'계란볶음밥',targetBasisAmount:'100g',templateId:'stirfry-meat-rice',templateName:'볶음밥',
  totalGrams:300,ingredients:[],target:nutrients,predicted:nutrients,error:nutrients,score:0,
  menuQuality:{action:'keep',name:'계란볶음밥',originalName:'계란볶음밥',reason:'테스트'},
  createdAt:'2026-10-02T00:00:00Z',imageUrl:null,imageUrls:null,source:'optimizer',
  aiIngredients:{note:'재료 조합 참고',ingredients:[
   {name:'밥',grams:200,caloriesKcal:150,proteinG:3,fatG:1,carbohydratesG:30,sugarG:0,sodiumMg:0,packGrams:200,packPriceWon:1000},
   {name:'계란',grams:100,caloriesKcal:150,proteinG:13,fatG:10,carbohydratesG:1,sugarG:0,sodiumMg:100,packGrams:500,packPriceWon:5000},
  ]},
 };
 const products=recipeProductsFromResults([record]);
 assert.equal(products.length,1);
 assert.equal(products[0].recipe!.minutes,null);
 assert.equal(candidates(products,{...initialConditions,mealMode:'cook'}).length,1,'a missing time must not exclude a simple dish');
 assert.equal(decodeRecommendationCatalog(encodeRecommendationCatalog(products))[0].recipe!.minutes,null);
 assert.equal(slimProduct(products[0]).recipe!.minutes,null);
});
