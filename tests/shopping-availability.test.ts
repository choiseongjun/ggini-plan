import assert from 'node:assert/strict';
import {test} from 'node:test';
import {shoppingAvailabilityMessage} from '../lib/shopping-availability';
import {initialConditions,type PlanProduct} from '../lib/shopping-plan';

const product=(id:string)=>({id,name:'도시락',price:5000,servings:1,category:'frozen_meal',productUrl:'https://example.com/product',avoidanceText:'쌀',caloriesKcal:null,proteinG:null} as PlanProduct);
const conditions={...initialConditions,days:5,meals:10,budget:150000};
test('missing nutrition is distinguished from a budget problem',()=>{
 const products=Array.from({length:10},(_,i)=>product(String(i)));
 assert.equal(shoppingAvailabilityMessage(products,conditions),null);
 assert.match(shoppingAvailabilityMessage(products,{...conditions,goal:'muscle'})!,/영양정보가 있는 메뉴는 0개/);
});
test('variants count as one dish and increasing budget does not fix shortages',()=>{
 const products=Array.from({length:20},(_,i)=>product(`dish--auto--${i}`));
 assert.match(shoppingAvailabilityMessage(products,conditions)!,/현재 조건에 맞는 메뉴는 1개/);
 assert.equal(shoppingAvailabilityMessage(products,conditions),shoppingAvailabilityMessage(products,{...conditions,budget:300000}));
});
test('dishes unavailable for requested slots do not count',()=>{
 const products=Array.from({length:10},(_,i)=>({...product(String(i)),mealSlots:['breakfast'] as ['breakfast']}));
 assert.match(shoppingAvailabilityMessage(products,conditions)!,/현재 조건에 맞는 메뉴는 0개/);
});
