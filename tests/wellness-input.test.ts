import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseWellnessInput} from '../lib/wellness-input';
const base={date:'2026-10-04',version:0,requestId:'d4c2b84c-98df-4c96-94cb-c26441777890'};
const parse=(p:object)=>parseWellnessInput({...base,...p},'2026-10-04');
test('water amounts must be whole ml within supported input bounds',()=>{
 assert.ok(parse({action:'water',ml:200}));for(const ml of [-200,0,1.5,2001,'200',null])assert.equal(parse({action:'water',ml}),null);
});
test('weights accept tenths and deletion, reject non-finite and excess precision',()=>{
 for(const kg of [65.2,1,500,null])assert.ok(parse({action:'weight',kg}));for(const kg of [NaN,Infinity,0,501,65.23,'65'])assert.equal(parse({action:'weight',kg}),null);
});
test('settings allow opting out and an optional user chosen water goal',()=>{
 assert.ok(parse({action:'settings',waterEnabled:false,weightEnabled:false,cupMl:250,goalMl:null}));
 assert.equal(parse({action:'settings',waterEnabled:true,weightEnabled:true,cupMl:200,goalMl:0}),null);
});
test('impossible dates, future dates, missing identity and stale-invalid versions are rejected',()=>{
 for(const overrides of [{date:'2026-02-30'},{date:'2026-10-05'},{requestId:'bad'},{version:-1},{version:1.5}])assert.equal(parse({action:'water',ml:200,...overrides}),null);
 assert.equal(parse({action:'undoWater',id:'bad'}),null);
 assert.ok(parse({action:'undoWater',id:base.requestId}));
});
