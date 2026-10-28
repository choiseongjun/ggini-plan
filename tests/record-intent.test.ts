import test from 'node:test';
import assert from 'node:assert/strict';
import {parseRecordIntent,rememberRecordFood,pendingRecordPortions,takeRecordFood} from '../lib/record-intent';
test('login continuation accepts only a recent explicit recording choice',()=>{
 const now=1000000;
 assert.equal(parseRecordIntent(JSON.stringify({mode:'photo',at:now-1000}),now),'photo');
 assert.equal(parseRecordIntent(JSON.stringify({mode:'search',at:now}),now),'search');
 for(const raw of [null,'bad',JSON.stringify({mode:'other',at:now}),JSON.stringify({mode:'photo',at:now-900000}),JSON.stringify({mode:'photo',at:now+1})])assert.equal(parseRecordIntent(raw,now),null);
});
test('food and serving survive login, expired or invalid servings do not',()=>{
 const entries=new Map<string,string>();
 const previous=Object.getOwnPropertyDescriptor(globalThis,'sessionStorage');
 Object.defineProperty(globalThis,'sessionStorage',{configurable:true,value:{getItem:(k:string)=>entries.get(k)??null,setItem:(k:string,v:string)=>entries.set(k,v),removeItem:(k:string)=>entries.delete(k)}});
 try{
  rememberRecordFood('test-food',1.5);
  assert.equal(pendingRecordPortions(),1.5);
  assert.equal(takeRecordFood(),'test-food');
  assert.equal(takeRecordFood(),null);
  rememberRecordFood('test-food',99);assert.equal(pendingRecordPortions(),1);
  rememberRecordFood('test-food',2);assert.equal(pendingRecordPortions(Date.now()+16*60_000),1);
 }finally{if(previous)Object.defineProperty(globalThis,'sessionStorage',previous);else Reflect.deleteProperty(globalThis,'sessionStorage');}
});
