import {test} from 'node:test';
import assert from 'node:assert/strict';
import {compareMealCost} from '../lib/meal-cost-comparison';
test('compares one serving without clamping higher costs into savings',()=>{
 assert.equal(compareMealCost(3387,10000),6613);
 assert.equal(compareMealCost(12000,10000),-2000);
 assert.equal(compareMealCost(10000,10000),0);
});
test('missing and invalid prices cannot claim savings',()=>{
 for(const value of [0,-1,NaN,Infinity]){
  assert.equal(compareMealCost(value,10000),null);
  assert.equal(compareMealCost(3000,value),null);
 }
 assert.equal(compareMealCost(3000,1000001),null);
});
