import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseServerPantry} from '../lib/pantry-server-input';
const item={name:'두부',quantity:'반 모',expiresOn:'',purchasedOn:'',planned:false,opened:false,useSoon:true};
test('server pantry preserves optional metadata and purchase state',()=>{
 const result=parseServerPantry([item,{...item,planned:true}]);
 assert.equal(result?.length,2);assert.equal(result?.[0].quantity,'반 모');assert.equal(result?.[0].useSoon,true);assert.equal(result?.[1].planned,true);
});
test('empty inventory is valid for clearing the kitchen',()=>{assert.deepEqual(parseServerPantry([]),[]);});
test('rejects oversized lists, malformed fields and impossible dates',()=>{
 for(const value of [null,{},Array(101).fill(item),[{...item,planned:'true'}],[{...item,expiresOn:'2026-02-30'}],[{...item,name:''}],[{...item,quantity:'x'.repeat(41)}]])assert.equal(parseServerPantry(value),null);
});
