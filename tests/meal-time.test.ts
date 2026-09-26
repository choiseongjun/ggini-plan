import assert from 'node:assert/strict';
import {test} from 'node:test';
import {mealTimeLocal,mealTimeISO,validEatenAt,mealTimeline} from '../lib/meal-time';
import {calendarCalories} from '../lib/intake-calendar';
import {weeklyReport} from '../lib/intake-stats';

test('Korea eating time round trips across midnight and rejects malformed/future dates',()=>{
 assert.equal(mealTimeISO('2026-09-27T00:10'),'2026-09-26T15:10:00.000Z');
 assert.equal(mealTimeLocal('2026-09-26T15:10:00Z'),'2026-09-27T00:10');
 for(const value of ['2026-02-30T12:00','2026-09-27T24:00','bad'])assert.equal(mealTimeISO(value),null);
 const now=Date.parse('2026-09-27T00:00:00Z');
 assert.ok(validEatenAt('2026-09-26T23:30:00+09:00',now));
 for(const value of [null,'bad','2026-02-30T12:00:00Z','2026-09-28T00:00:00Z','2026-09-26T12:00'])assert.equal(validEatenAt(value,now),false);
});
test('timeline and calendar use eaten time, preserve repeated foods and legacy timestamps',()=>{
 const createdAt='2026-09-27T14:00:00Z';
 const logs=[{id:'evening',createdAt,eatenAt:'2026-09-27T11:00:00Z'},{id:'morning2',createdAt,eatenAt:'2026-09-27T01:00:00Z'},{id:'dawn',createdAt,eatenAt:'2026-09-26T16:00:00Z'},{id:'morning1',createdAt,eatenAt:'2026-09-27T00:00:00Z'},{id:'legacy',createdAt}];
 assert.deepEqual(mealTimeline(logs).map(group=>[group.period,group.logs.map(log=>log.id)]),[['새벽',['dawn']],['오전',['morning1','morning2']],['저녁',['evening','legacy']]]);
 assert.deepEqual(calendarCalories([{date:'2026-09-27',calories:100,createdAt,eatenAt:'2026-09-27T00:00:00Z'}])['2026-09-27'].periods,['아침']);
});
test('weekly time feedback describes recorded foods without inventing skipped meals',()=>{
 const logs=['2026-09-21T00:00:00Z','2026-09-21T04:00:00Z','2026-09-21T06:00:00Z'].map(eatenAt=>({productId:'ref:protein',name:'프로틴',date:'2026-09-21',calories:100,protein:20,cost:null,eatenAt}));
 const report=weeklyReport(logs,'2026-09-21',{calories:null,protein:null});
 assert.deepEqual(report.timeCounts.map(item=>item.count),[0,1,2,0]);
 assert.equal(report.timeInsight,'음식 기록 3건 중 2건이 오후 시간대에 있어요.');
 assert.equal(weeklyReport(logs.slice(0,1),'2026-09-21',{calories:null,protein:null}).timeInsight,null);
});
