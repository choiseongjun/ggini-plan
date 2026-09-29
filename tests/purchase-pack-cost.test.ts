import assert from 'node:assert/strict';
import {test} from 'node:test';
import {basketTotal,purchaseBasket,type PlanProduct} from '../lib/shopping-plan';
import {purchaseSummary} from '../lib/plan-explanation';

const pork={id:'pork',name:'돼지고기 400g',category:'ingredient',price:5600,servings:1,productUrl:'https://example.com/pork'} as PlanProduct;
const meal={id:'meal',name:'돼지고기 100g 요리',price:1400,servings:1,recipe:{ingredients:[{product:pork,packs:0.25,label:'100g'}]}} as PlanProduct;

test('BUG-001: owning one pork pack removes 5600 won, while meal usage price stays 1400',()=>{
 const before=purchaseBasket(['meal'],[meal],[]);
 const after=purchaseBasket(['meal'],[meal],[],{pork:1});
 assert.equal(before[0].packs,1);
 assert.equal(before[0].cost,5600);
 assert.equal(after[0].cost,0);
 assert.equal(purchaseSummary(before).total-purchaseSummary(after).total,5600);
 assert.equal(purchaseSummary(before).groups[0].cost,5600);
 assert.equal(basketTotal(['meal'],[meal],[]),5600);
 assert.equal(meal.price,1400);
 assert.equal(purchaseBasket(['meal'],[meal],['pork'])[0].cost,0);
});

test('partial stock still requires a full pack, shared meals aggregate before rounding',()=>{
 assert.equal(purchaseBasket(['meal'],[meal],[],{pork:0.1})[0].cost,5600);
 assert.equal(purchaseBasket(['meal'],[meal],[],{pork:0.25})[0].cost,0);
 assert.equal(basketTotal(['meal','meal'],[meal],[]),5600);
 assert.equal(basketTotal(Array(5).fill('meal'),[meal],[]),11200);
 assert.equal(basketTotal(Array(5).fill('meal'),[meal],[],{pork:1}),5600);
 assert.deepEqual(purchaseBasket(['meal'],[meal],[],{},{meal:0}),[]);
});
