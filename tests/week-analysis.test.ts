import test from 'node:test';
import assert from 'node:assert/strict';
import {analyzeWeek,actualByDay} from '../lib/week-analysis';
import type {BodyProfile} from '../lib/body-profile';
import type {PlanProduct,PlanConditions} from '../lib/shopping-plan';
const profile:BodyProfile={height:170,weight:70,age:30,sex:'male',activity:'light',meals:3,pregnancy:false};
const product={id:'meal',unit:'g',quantity:300,servings:1,servingGrams:300,nutritionBasis:'100g',nutritionSourceUrl:'https://example.com/nutrition',caloriesKcal:200,proteinG:10,carbohydratesG:20,fatG:5,sodiumMg:200} as PlanProduct;
const conditions:PlanConditions={budget:100000,meals:15,days:5,slots:['breakfast','lunch','dinner'],cooking:'all',avoid:'',owned:[]};
const input={ids:Array(15).fill('meal'),products:[product],conditions,profile,target:null};
test('five days and fifteen per-serving meals are summed without weight extrapolation',()=>{
 const a=analyzeWeek(input)!;
 assert.equal(a.days.length,5);assert.equal(a.avgIntake,1800);
 assert.equal(a.totalDelta,(1800-a.maintenance)*5);
 assert.equal(a.plannedMeals,15);assert.equal(a.assumedMeals,0);assert.equal(a.unknownMeals,0);
 assert.equal('weekKg' in a,false);assert.equal('monthKg' in a,false);
 assert.equal(a.nutrients.find(n=>n.key==='protein')!.perMeal,30);
});
test('unplanned and unknown meals are explicitly counted, missing products block analysis',()=>{
 const a=analyzeWeek({...input,ids:['meal'],conditions:{...conditions,meals:1,slots:['dinner']},products:[{...product,caloriesKcal:null}]})!;
 assert.equal(a.assumedMeals,2);assert.equal(a.unknownMeals,1);
 assert.equal(a.avgIntake,a.dailyGoal);
 assert.equal(analyzeWeek({...input,products:[]}),null);
 assert.equal(analyzeWeek({...input,ids:['meal']}),null);
});
test('actual records do not fill missing meals or unknown calories with targets',()=>{
 const a=analyzeWeek(input)!;
 const actual=actualByDay(a,[{productId:'meal',calories:500,date:'2026-09-25'},{productId:'unknown',calories:null,date:'2026-09-25'}],['2026-09-25','2026-09-26']);
 assert.equal(actual[0]!.intake,500);assert.equal(actual[0]!.unknown,1);assert.equal(actual[1],null);
});
test('zero macro target is not labeled as adequate and comparison uses unrounded ratio',()=>{
 const target={calories:1800,carbRatio:60,proteinRatio:0,fatRatio:40};
 const a=analyzeWeek({...input,target})!;
 assert.equal(a.nutrients.find(n=>n.key==='protein')!.status,null);
 const b=analyzeWeek({...input,target:{...target,proteinRatio:20,carbRatio:40},products:[{...product,proteinG:12.51}]})!;
 assert.equal(b.nutrients.find(n=>n.key==='protein')!.status,'high');
});
test('new photo values, undo, and a replacement menu are reflected in separate actual and planned totals',()=>{
 const plan=analyzeWeek(input)!;
 const dates=['2026-09-25'];
 const photo={productId:'meal',date:dates[0],calories:420,protein:24};
 assert.equal(actualByDay(plan,[photo],dates)[0]!.logged,420);
 assert.equal(actualByDay(plan,[{...photo,calories:510,protein:31}],dates)[0]!.protein,31);
 assert.equal(actualByDay(plan,[],dates)[0],null);
 const swapped=analyzeWeek({...input,products:[{...product,caloriesKcal:250}]})!;
 assert.equal(swapped.avgIntake,2250);
 assert.equal(actualByDay(swapped,[photo],dates)[0]!.logged,420);
});
