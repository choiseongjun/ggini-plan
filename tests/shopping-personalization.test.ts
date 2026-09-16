import {test} from 'node:test';
import assert from 'node:assert/strict';
import {personalizeProducts} from '../lib/shopping-personalization';
import {defaultDiet} from '../lib/meal-plan';
import type {PlanProduct} from '../lib/shopping-plan';
const profile={height:165,weight:60,age:28,sex:'female',activity:'light',meals:3,pregnancy:false};
const product={id:'a',name:'도시락',unit:'g',quantity:300,servings:1,caloriesKcal:200,proteinG:10,nutritionBasis:'100g',nutritionSourceUrl:'https://example.com',avoidanceText:'쌀',category:'frozen_meal'} as PlanProduct;
test('saved body needs rank sourced serving nutrition without inventing missing values',()=>{
 const result=personalizeProducts([product,{...product,id:'b',caloriesKcal:50},{...product,id:'c',nutritionSourceUrl:null}],profile,defaultDiet);
 assert.equal(result.products[0].servingCalories,600);
 assert.ok(result.products[0].personalizationScore>result.products[1].personalizationScore);
 assert.equal(result.products[2].servingCalories,null);
 assert.equal(result.personalization.nutritionMatched,2);
 const larger=personalizeProducts([product],{...profile,weight:100},defaultDiet);
 assert.notEqual(larger.personalization.perMealCalories,result.personalization.perMealCalories);
});
test('saved exclusions and plant preference constrain the actual shopping catalog',()=>{
 const products=[product,{...product,id:'b',avoidanceText:'새우 함유'},{...product,id:'c',avoidanceText:null}];
 assert.deepEqual(personalizeProducts(products,profile,{...defaultDiet,excluded:['shrimp']}).products.map(p=>p.id),['a']);
 assert.equal(personalizeProducts(products,profile,{...defaultDiet,style:'plant'}).products.length,0);
 assert.equal(personalizeProducts(products,{...profile,pregnancy:true},defaultDiet).personalization.blocked,true);
});
