import test from 'node:test';
import assert from 'node:assert/strict';
import {decodedValueCache} from '../lib/decoded-value-cache';
test('repeated payloads decode once; shared-cache invalidation replaces the value immediately',()=>{
 let calls=0;const read=decodedValueCache((s:string)=>{calls++;return JSON.parse(s);});
 const first=read('[1]');for(let i=0;i<100;i++)assert.equal(read('[1]'),first);
 assert.equal(calls,1);assert.deepEqual(read('[2]'),[2]);assert.equal(calls,2);
 assert.throws(()=>read('broken'));assert.deepEqual(read('[2]'),[2]);assert.equal(calls,3);
});
