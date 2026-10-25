import {test} from 'node:test';
import assert from 'node:assert/strict';
import {officialMealMacros,officialMealNutrients,type OfficialMealNutrition} from '../lib/official-meal-nutrition';
import {parseDetailedNutrients,type DetailedNutritionData} from '../lib/detailed-nutrition';
import {servingNutrients,nutritionIsEstimated} from '../lib/serving-nutrients';
import type {PlanProduct} from '../lib/shopping-plan';
import {composePairing} from '../lib/meal-pairings';
import {encodeRecommendationCatalog,decodeRecommendationCatalog} from '../lib/recommendation-catalog';

function source(code:string,raw:Record<string,string>,unit:'g'|'mL'='g'):DetailedNutritionData{
 return {code,name:code,basisText:`100${unit}`,basis:{value:100,unit},source:'K-FCDB',sourceDate:'2026-08-28',fileName:'test.xlsx',nutrients:parseDetailedNutrients(raw,Object.keys(raw))};
}
const main=source('D-main',{'에너지(kcal)':'100','단백질(g)':'10','당류(g)':'0','칼슘(mg)':'12','비타민 D(μg)':'0.00001'});
const rice=source('D-rice',{'에너지(kcal)':'150','단백질(g)':'3','당류(g)':'0'});
const meal:OfficialMealNutrition={parts:[{role:'main',name:'메인',code:main.code,amount:{value:200,unit:'g'},reference:main},{role:'rice',name:'밥',code:rice.code,amount:{value:210,unit:'g'},reference:rice}]};
test('official dish portions add cooked rice once; zeros, missing and micronutrients remain distinct',()=>{
 const n=officialMealMacros(meal);assert.equal(n.calories,515);assert.equal(n.protein,26.3);assert.equal(n.sugar,0);assert.equal(n.fat,null);
 const rows=officialMealNutrients(meal);const calcium=rows.find(n=>n.name==='칼슘')!;
 assert.equal(calcium.value,24);assert.equal(calcium.known,1);assert.equal(calcium.total,2);
 assert.equal(rows.find(n=>n.name==='비타민 D')?.value,0.00002);
});
test('mL never converts to g and a missing dish never becomes zero or an AI estimate',()=>{
 const wrong:OfficialMealNutrition={parts:[{...meal.parts[0],amount:{value:200,unit:'mL'}}]};
 assert.equal(officialMealMacros(wrong).calories,null);
 const missing={parts:[meal.parts[1],{...meal.parts[0],reference:null}]};
 assert.equal(officialMealMacros(missing).calories,null);
 const product={officialNutrition:missing,recipe:{nutrition:{calories:999,protein:999},ingredients:[]}} as unknown as PlanProduct;
 assert.equal(servingNutrients(product).calories,null);assert.equal(nutritionIsEstimated(product),false);
});
test('side compositions and cache roundtrip preserve all source nutrients and combined portions',()=>{
 const product=(id:string,n:OfficialMealNutrition)=>({id,name:id,price:10,servings:1,officialNutrition:n,recipe:{ingredients:[],steps:[],minutes:null,nutrition:{calories:999,protein:999}}}) as unknown as PlanProduct;
 const side=product('side',{parts:[{...meal.parts[0],role:'side',amount:{value:80,unit:'g'}}]});
 const combo=composePairing(product('main',meal),[side]);
 assert.equal(servingNutrients(combo).calories,595);assert.equal(combo.officialNutrition?.parts.length,3);
 const restored=decodeRecommendationCatalog(encodeRecommendationCatalog([combo]))[0];
 assert.deepEqual(restored.officialNutrition,combo.officialNutrition);assert.equal(servingNutrients(restored).calories,595);
});
test('text values cannot be summed and different nutrient units cannot be mixed',()=>{
 const ref=source('D-text',{'칼슘(mg)':'미량','칼슘(μg)':'10'});
 const rows=officialMealNutrients({parts:[{role:'main',name:'문자',code:ref.code,amount:{value:200,unit:'g'},reference:ref}]});
 assert.equal(rows.length,2);assert.equal(rows[0].value,null);assert.equal(rows[1].value,20);
});
