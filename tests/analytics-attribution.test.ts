import test from 'node:test';
import assert from 'node:assert/strict';
import {attributionFromSearch,parseAttribution,entryAttribution,attributionStorageKey} from '../lib/analytics-attribution';
test('only named source and campaign codes can reach storage, without URLs or free text',()=>{
 assert.deepEqual(attributionFromSearch('?utm_source=threads&utm_campaign=meal-reuse&email=private&food=secret',100),{source:'threads',campaign:'meal-reuse',createdAt:100});
 assert.deepEqual(attributionFromSearch('?from=kcal&log=private-food&utm_campaign=private',100),{source:'kcal',createdAt:100});
 assert.equal(attributionFromSearch('?utm_source=https://private.example',100),null);
});
test('entry survives navigation and reload but expires after 30 minutes',()=>{
 let raw:string|null=null;const storage={getItem:()=>raw,setItem:(key:string,value:string)=>{assert.equal(key,attributionStorageKey);raw=value;}};
 const expected={source:'threads',campaign:'recording-restart'};
 assert.deepEqual(entryAttribution(storage,'?utm_source=threads&utm_campaign=recording-restart',100),expected);
 assert.deepEqual(entryAttribution(storage,'',200),expected);
 assert.deepEqual(entryAttribution(storage,'?utm_source=threads&utm_campaign=recording-restart',300),expected);
 assert.equal(parseAttribution(raw,400)?.createdAt,100);
 assert.deepEqual(entryAttribution(storage,'',1800100),{});
});
test('explicit new sources replace previous entry and invalid or future timestamps are ignored',()=>{
 let raw=JSON.stringify({source:'threads',createdAt:100});const storage={getItem:()=>raw,setItem:(_key:string,value:string)=>{raw=value;}};
 assert.deepEqual(entryAttribution(storage,'?from=kcal',200),{source:'kcal'});
 for(const value of ['broken',JSON.stringify({source:'private',createdAt:100}),JSON.stringify({source:'threads',createdAt:300})])assert.equal(parseAttribution(value,200),null);
});
test('blocked browser storage cannot block record actions',()=>{
 const denied={getItem:()=>{throw new Error('denied');},setItem:()=>{throw new Error('denied');}};
 assert.deepEqual(entryAttribution(denied,'?utm_source=instagram',100),{source:'instagram'});
 assert.deepEqual(entryAttribution(denied,'',100),{});
});
