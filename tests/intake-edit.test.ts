import test from 'node:test';
import assert from 'node:assert/strict';
import {rescaleIntake} from '../lib/intake-edit';
test('portion corrections preserve unknown nutrients and scale the recorded values',()=>{
 assert.equal(rescaleIntake(null,1,2),null);
 assert.equal(rescaleIntake('600',1.5,0.5),200);
 assert.equal(rescaleIntake(0,1,2),0);
 assert.equal(rescaleIntake(12.5,0.5,1.5),37.5);
});
test('repeated scaling returns to the original amount and rejects invalid portions',()=>{
 assert.equal(rescaleIntake(rescaleIntake(400,1,2),2,1),400);
 assert.throws(()=>rescaleIntake(400,0,1));
 assert.throws(()=>rescaleIntake(400,1,-1));
 assert.throws(()=>rescaleIntake('invalid',1,2));
});
