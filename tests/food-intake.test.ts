import assert from 'node:assert/strict';
import {test} from 'node:test';
import {consumeFood,restoreFood,servingNutrition,intakeTotals,validPortions,type IntakeLog} from '../lib/food-intake';
import {parseStock,remainingQuantity,type ShoppingStock} from '../lib/shopping-progress';
import {basketTotal,type PlanProduct} from '../lib/shopping-plan';
const p={id:'rice',name:'볶음밥',unit:'g',quantity:400,servings:2,servingGrams:200,nutritionBasis:'100g당',caloriesKcal:180,proteinG:7,nutritionSourceUrl:'https://example.com/nutrition',price:5000} as PlanProduct;
const item={id:'rice',name:'볶음밥',unit:'묶음',url:null,owned:1,ordered:0};
test('one serving uses the labelled basis and subtracts only half a two-serving pack',()=>{
 const result=consumeFood({rice:item},p,1);
 assert.equal(result.calories,360);assert.equal(result.protein,14);
 assert.equal(result.stock.rice.owned,0.5);assert.ok(parseStock(result.stock));
 assert.equal(basketTotal(['rice'],[p],[],{rice:0.5}),0);
 assert.equal(basketTotal(['rice','rice'],[p],[],{rice:0.5}),5000);
 assert.deepEqual(restoreFood(result.stock,item,result.packs),{rice:item});
});
test('partial portions, thirds, and insufficient inventory do not lose an extra pack',()=>{
 assert.equal(consumeFood({rice:item},p,0.5).stock.rice.owned,0.75);
 let stock:ShoppingStock={rice:item};for(let i=0;i<3;i++)stock=consumeFood(stock,{...p,servings:3},1).stock;
 assert.equal(stock.rice.owned,0);
 assert.throws(()=>consumeFood(stock,p,1));
 assert.throws(()=>consumeFood({rice:{...item,owned:0,ordered:1}},p,1));
 assert.equal(remainingQuantity(1/3,{...item,owned:0.333333}),0);
 for(const n of [0,-1,0.3,11,NaN,Infinity])assert.equal(validPortions(n),false);
});
test('unknown nutrition is preserved as unknown, not inferred from marketing or unit counts',()=>{
 assert.deepEqual(servingNutrition({...p,nutritionSourceUrl:null,nutritionPhotoUrl:null}),{calories:null,protein:null});
 assert.deepEqual(servingNutrition({...p,nutritionBasis:'100mL당'}),{calories:null,protein:null});
 assert.equal(servingNutrition({...p,unit:'개',servingGrams:undefined}).calories,null);
 const a={calories:360,protein:null} as IntakeLog,b={calories:null,protein:14} as IntakeLog;
 assert.deepEqual(intakeTotals([a,b]),{calories:360,protein:14,missingCalories:1,missingProtein:1});
});
