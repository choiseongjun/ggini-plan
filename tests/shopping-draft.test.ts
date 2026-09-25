import test from 'node:test';
import assert from 'node:assert/strict';
import {chooseShoppingDraft} from '../lib/shopping-draft';
import {initialConditions} from '../lib/shopping-plan';

const draft=(savedAt:number, mealIds=['guest-meal'])=>JSON.stringify({conditions:{...initialConditions,days:1,meals:1,people:2,goal:'lose'},mealIds,savedAt});
test('new guest recommendation survives login with an existing account draft',()=>{
 const result=chooseShoppingDraft(draft(100,['old-account-meal']),draft(200));
 assert.equal(result.fromGuest,true);
 assert.deepEqual(result.draft?.mealIds,['guest-meal']);
 assert.equal(result.draft?.conditions.people,2);
 assert.equal(result.draft?.conditions.goal,'lose');
});
test('settings-only or corrupt account draft does not hide a complete guest plan',()=>{
 for(const account of [draft(300,[]),'invalid',null])assert.equal(chooseShoppingDraft(account,draft(200)).fromGuest,true);
});
test('older and incomplete guest plans cannot replace a newer account plan',()=>{
 for(const guest of [draft(100),draft(400,['']),draft(400,[]),'invalid']){
  assert.equal(chooseShoppingDraft(draft(300,['account-meal']),guest).fromGuest,false);
 }
});
test('explicit data reset prevents resurrecting earlier guest drafts',()=>{
 assert.equal(chooseShoppingDraft(null,draft(100),new Date(200).toISOString()).draft,null);
 assert.equal(chooseShoppingDraft(null,draft(300),new Date(200).toISOString()).fromGuest,true);
});
