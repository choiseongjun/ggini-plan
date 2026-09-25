import test from 'node:test';
import assert from 'node:assert/strict';
import {parseRecordIntent} from '../lib/record-intent';
test('login continuation accepts only a recent explicit recording choice',()=>{
 const now=1000000;
 assert.equal(parseRecordIntent(JSON.stringify({mode:'photo',at:now-1000}),now),'photo');
 assert.equal(parseRecordIntent(JSON.stringify({mode:'search',at:now}),now),'search');
 for(const raw of [null,'bad',JSON.stringify({mode:'other',at:now}),JSON.stringify({mode:'photo',at:now-900000}),JSON.stringify({mode:'photo',at:now+1})])assert.equal(parseRecordIntent(raw,now),null);
});
