import test from 'node:test';
import assert from 'node:assert/strict';
import {buddyGrowth} from '../lib/buddy-growth';

test('first recorded day unlocks scarf and keeps exact accumulated days',()=>{
 assert.equal(buddyGrowth(0).level,1);
 assert.equal(buddyGrowth(1).gift,'민트 스카프');
 const midway=buddyGrowth(5);
 assert.equal(midway.days,5);
 assert.equal(midway.gift,'작은 앞치마');
 assert.equal(midway.remaining,2);
 assert.equal(midway.percent,50);
});
test('each gift unlocks on its threshold and final stage keeps counting days',()=>{
 for(const [day,stage] of [[1,1],[3,2],[7,3],[14,4],[30,5]]){
  assert.equal(buddyGrowth(day-1).stage,stage-1);
  assert.equal(buddyGrowth(day).stage,stage);
 }
 assert.equal(buddyGrowth(401).days,401);
 assert.equal(buddyGrowth(401).next,null);
 assert.equal(buddyGrowth(401).percent,100);
});
test('invalid counts cannot produce negative or invalid growth',()=>{
 for(const value of [-1,NaN,Infinity])assert.equal(buddyGrowth(value).days,0);
});
