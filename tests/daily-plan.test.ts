import assert from 'node:assert/strict';
import {test} from 'node:test';
import {planDay,planDate,recordedForSlot,validPlanDate,remainingPlanPortions} from '../lib/daily-plan';
import {parseConditions,initialConditions} from '../lib/shopping-plan';

test('saved plan advances by date and handles upcoming and completed plans',()=>{
 assert.deepEqual(planDay('2026-09-17','2026-09-17',7),{day:1,active:true});
 assert.deepEqual(planDay('2026-09-17','2026-09-22',7),{day:6,active:true});
 assert.deepEqual(planDay('2026-09-17','2026-09-24',7),{day:7,active:false});
 assert.deepEqual(planDay('2026-09-17','2026-09-16',7),{day:1,active:false});
 assert.equal(planDate('2026-09-30',2),'2026-10-01');
 assert.equal(validPlanDate('2026-02-30'),false);
 assert.equal(parseConditions({...initialConditions,startDate:'2026-02-30'}),null);
 assert.equal(parseConditions({...initialConditions,startDate:'2026-09-17'})?.startDate,'2026-09-17');
});
test('one eaten serving does not mark two identical meals as complete',()=>{
 assert.equal(recordedForSlot(['rice','rice'],0,1),1);
 assert.equal(recordedForSlot(['rice','rice'],1,1),0);
 assert.equal(recordedForSlot(['rice','rice'],1,1.5),0.5);
 assert.equal(recordedForSlot(['rice','noodles','rice'],2,2),1);
});
test('eaten and elapsed meals do not return to the shopping list; future repeats remain',()=>{
 const entries=[{id:'rice',date:'2026-09-16'},{id:'rice',date:'2026-09-17'},{id:'rice',date:'2026-09-18'}];
 assert.deepEqual(remainingPlanPortions(entries,'2026-09-17',[{productId:'rice',portions:1}]),{rice:1});
 assert.deepEqual(remainingPlanPortions(entries,'2026-09-17',[{productId:'rice',portions:0.5}]),{rice:1.5});
 assert.deepEqual(remainingPlanPortions(entries,'2026-09-17',[]),{rice:2});
});
