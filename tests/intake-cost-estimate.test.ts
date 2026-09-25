import {test} from 'node:test';
import assert from 'node:assert/strict';
import {sumMealCosts,parseCostGuesses,type CostMeal} from '../lib/intake-cost-estimate';
import {calendarCalories} from '../lib/intake-calendar';
const meals:CostMeal[]=[{id:'a',name:'밥',portions:2,calories:600,cost:1000},{id:'b',name:'콜라',portions:1,calories:null,cost:null}];
test('cost is already consumed amount; unknown is not counted as free',()=>{
 assert.deepEqual(sumMealCosts(meals),{low:1000,high:1000,missing:1,aiCount:0,count:2});
 assert.deepEqual(sumMealCosts(meals,[{id:'b',low:1000,high:2000}]),{low:2000,high:3000,missing:0,aiCount:1,count:2});
});
test('reject missing, duplicated, mismatched and invalid AI costs',()=>{
 for(const items of [[],[{id:'b',low:-1,high:1}],[{id:'b',low:2,high:1}],[{id:'b',low:null,high:1}],[{id:'wrong',low:1,high:2}]])assert.throws(()=>parseCostGuesses(JSON.stringify({items}),[meals[1]]));
 assert.deepEqual(parseCostGuesses('{"items":[{"id":"b","low":null,"high":null}]}',[meals[1]]),[{id:'b',low:null,high:null}]);
});
test('calendar sums each date and distinguishes unknown calories from zero',()=>{
 assert.deepEqual(calendarCalories([{date:'2026-09-26',calories:200},{date:'2026-09-26',calories:300},{date:'2026-09-26',calories:null},{date:'2026-09-25',calories:0}]),{'2026-09-26':{count:3,kcal:500,missing:1,periods:[]},'2026-09-25':{count:1,kcal:0,missing:0,periods:[]}});
});
import {recordMealPeriod} from '../lib/intake-calendar';
test('meal time bands use Korea time, and calendar deduplicates periods',()=>{
 assert.equal(recordMealPeriod('2026-09-25T23:00:00Z'),'아침');
 assert.equal(recordMealPeriod('2026-09-26T02:00:00Z'),'점심');
 assert.equal(recordMealPeriod('2026-09-26T08:00:00Z'),'저녁');
 assert.equal(recordMealPeriod('2026-09-26T14:00:00Z'),'밤');
 assert.equal(recordMealPeriod('invalid'),null);
 const day=calendarCalories([{date:'2026-09-26',calories:100,createdAt:'2026-09-25T23:00:00Z'},{date:'2026-09-26',calories:200,createdAt:'2026-09-26T00:00:00Z'}])['2026-09-26'];
 assert.deepEqual(day.periods,['아침']);assert.equal(day.kcal,300);
});
