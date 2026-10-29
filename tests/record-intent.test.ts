import test from 'node:test';
import assert from 'node:assert/strict';
import {parseRecordIntent,rememberRecordFood,pendingRecordPortions,pendingRecordFood,takeRecordFood,recordPortions,pendingRecordTiming} from '../lib/record-intent';
import {rememberSavedFoodList,savedFoodReturn,rememberSavedFood,clearSavedFood} from '../lib/saved-food-intent';

test('search landing portions accept only supported quarter servings',()=>{
 for(const value of [null,'',0,'-1','NaN','Infinity','1.1',11])assert.equal(recordPortions(value),1);
 for(const value of ['0.25','0.5','1.5','10'])assert.equal(recordPortions(value),Number(value));
});
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
  const timing={eatenAt:new Date(Date.now()-86400000).toISOString(),mealSlot:'dinner' as const};
  rememberRecordFood('test-food',0.5,timing);assert.deepEqual(pendingRecordTiming(),timing);
  assert.equal(pendingRecordTiming(Date.now()+16*60_000),undefined);
  rememberSavedFoodList();assert.equal(savedFoodReturn(),'/saved-foods');
  rememberSavedFood('A&B');assert.equal(savedFoodReturn(),'/saved-foods?food=A%26B');
  clearSavedFood();assert.equal(savedFoodReturn(),null);
  rememberRecordFood('test-food',1.5);
  assert.equal(pendingRecordPortions(),1.5);
  assert.equal(pendingRecordFood(),'test-food');
  assert.equal(pendingRecordFood(),'test-food'); // Interrupted renders must not consume the login continuation.
  assert.equal(takeRecordFood(),'test-food');
  assert.equal(takeRecordFood(),null);
  rememberRecordFood('test-food',99);assert.equal(pendingRecordPortions(),1);
  rememberRecordFood('test-food',2);assert.equal(pendingRecordPortions(Date.now()+16*60_000),1);
  assert.equal(pendingRecordFood(Date.now()+16*60_000),null);
  assert.equal(pendingRecordFood(Date.now()-1000),null);
 }finally{if(previous)Object.defineProperty(globalThis,'sessionStorage',previous);else Reflect.deleteProperty(globalThis,'sessionStorage');}
});
