import test from 'node:test';
import assert from 'node:assert/strict';
import {mealReuseStorageKey,readPendingMealReuse,rememberMealReuse,clearPendingMealReuse,type MealReuseRequest} from '../lib/pending-meal-reuse';
const id='8f693a1d-17d5-4d2d-8280-5d3f836da87e',source='df916757-a59a-4512-a958-a55b1c9c0419';
const request:MealReuseRequest={id,source,owner:'test-owner',items:[{id:source,portions:1.5}],eatenAt:'2026-01-01T03:00:00Z',mealSlot:'lunch'};
function store(){const values=new Map<string,string>();return {getItem:(key:string)=>values.get(key)??null,setItem:(key:string,value:string)=>{values.set(key,value);},removeItem:(key:string)=>{values.delete(key);}};}
test('an uncertain save survives a new consumer with the same id, quantities, time and owner',()=>{
 const storage=store();rememberMealReuse(storage,request);
 const restored=readPendingMealReuse(storage,request.owner)!;
 assert.deepEqual(restored,request);assert.equal(readPendingMealReuse(storage,'other-owner'),null);
 rememberMealReuse(storage,restored);assert.equal(readPendingMealReuse(storage,request.owner)?.id,id);
 clearPendingMealReuse(storage,request.owner,id);assert.equal(readPendingMealReuse(storage,request.owner),null);
});
test('persistent requests never contain food names, photos or nutrients',()=>{
 const storage=store(),withExtraFields={...request,items:[{...request.items[0],name:'private meal',photo:'private photo',calories:123}]};rememberMealReuse(storage,withExtraFields);
 const raw=storage.getItem(mealReuseStorageKey(request.owner))!;
 for(const secret of ['private','name','photo','calories'])assert.ok(!raw.includes(secret));
});
test('a different save cannot overwrite or clear an unresolved request',()=>{
 const storage=store();rememberMealReuse(storage,request);
 assert.throws(()=>rememberMealReuse(storage,{...request,id:source}));
 clearPendingMealReuse(storage,request.owner,source);assert.equal(readPendingMealReuse(storage,request.owner)?.id,id);
});
test('corrupt, foreign or invalid persisted inputs fail closed without dropping the original id',()=>{
 for(const change of [{owner:'other'}, {items:[]}, {items:[{id:source,portions:.3}]}, {items:[request.items[0],request.items[0]]}, {id:'bad'}, {eatenAt:'not-a-time'}, {mealSlot:'bad'}]){
  const storage=store(),raw=JSON.stringify({version:1,...request,...change});storage.setItem(mealReuseStorageKey(request.owner),raw);
  assert.throws(()=>readPendingMealReuse(storage,request.owner));assert.equal(storage.getItem(mealReuseStorageKey(request.owner)),raw);
 }
});
test('storage failure is surfaced before a network save can be started',()=>{
 const storage=store();storage.setItem=()=>{throw new Error('quota');};assert.throws(()=>rememberMealReuse(storage,request),/quota/);
 storage.setItem=()=>{};assert.throws(()=>rememberMealReuse(storage,request));
});
