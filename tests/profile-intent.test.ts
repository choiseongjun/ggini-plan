import test from 'node:test';
import assert from 'node:assert/strict';
import {validProfileIntent} from '../lib/profile-intent';
test('profile login continuation accepts a recent explicit intent only',()=>{
 const now=1_000_000;
 assert.equal(validProfileIntent(JSON.stringify({at:now}),now),true);
 for(const value of [null,'invalid','{}',JSON.stringify({at:now+1}),JSON.stringify({at:now-900_000})])assert.equal(validProfileIntent(value,now),false);
});
