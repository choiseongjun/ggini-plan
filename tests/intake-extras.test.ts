import assert from 'node:assert/strict';
import {test} from 'node:test';
import {parseIntakeExtras} from '../lib/intake-extras';

test('additional foods accept reference portions and legacy photo results',()=>{
 const values=['rice-half',{referenceCode:'FOOD-1',portions:0.75}];
 assert.deepEqual(parseIntakeExtras(values),values);
 assert.deepEqual(parseIntakeExtras(undefined),[]);
 assert.deepEqual(parseIntakeExtras([{referenceCode:'A',portions:10}]),[{referenceCode:'A',portions:10}]);
});

test('rejects invalid foods, amounts, duplicates, and too many items',()=>{
 for(const portions of [0,-1,0.1,10.25,NaN,Infinity,'1',null])
  assert.equal(parseIntakeExtras([{referenceCode:'A',portions}]),null);
 for(const referenceCode of ['', ' ', 'a'.repeat(61), null, 3])
  assert.equal(parseIntakeExtras([{referenceCode,portions:1}]),null);
 for(const value of [null,{},['unknown'],['rice-half','rice-half'],[{referenceCode:'A',portions:1},{referenceCode:'A',portions:2}],Array.from({length:11},(_,i)=>({referenceCode:`F${i}`,portions:1}))])
  assert.equal(parseIntakeExtras(value),null);
});
