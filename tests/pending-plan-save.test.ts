import test from 'node:test';
import assert from 'node:assert/strict';
import {readPendingPlanSave} from '../lib/pending-plan-save';
import {initialConditions} from '../lib/shopping-plan';
const now=100000000;
const draft=(extra:Record<string,unknown>={})=>JSON.stringify({conditions:{...initialConditions,days:1,meals:1},mealIds:['picked-menu'],savedAt:now,returnTo:'/next-meal',names:['선택 메뉴'],...extra});
test('save login restores the exact selection and only allowed return routes',()=>{
 assert.deepEqual(readPendingPlanSave(draft(),now)?.mealIds,['picked-menu']);
 assert.equal(readPendingPlanSave(draft(),now)?.returnTo,'/next-meal');
 assert.equal(readPendingPlanSave(draft({returnTo:'/plan'}),now)?.returnTo,'/plan');
 assert.equal(readPendingPlanSave(draft({returnTo:'https://example.com'}),now)?.returnTo,'/next-meal');
});
test('expired, future, malformed and incomplete selections cannot trigger auto-save',()=>{
 for(const raw of [null,'broken',draft({savedAt:now-86400001}),draft({savedAt:now+1}),draft({mealIds:[]}),draft({mealIds:['']})])assert.equal(readPendingPlanSave(raw,now),null);
});
