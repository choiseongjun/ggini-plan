import assert from 'node:assert/strict';
import {test} from 'node:test';
import {importGuestStock} from '../lib/guest-shopping-progress';

test('guest import retains a retry token on failure, keeps account ownership and removes only imported stock',async(t)=>{
 const replaceGlobal=(key:string,value:unknown)=>{
  const original=Object.getOwnPropertyDescriptor(globalThis,key);
  Object.defineProperty(globalThis,key,{configurable:true,value});
  t.after(()=>{if(original)Object.defineProperty(globalThis,key,original);else Reflect.deleteProperty(globalThis,key);});
 };
 const storage=new Map<string,string>();
 const key='kkiniplan-progress-products-guest';
 storage.set(key,JSON.stringify({version:2,stock:{rice:{id:'rice',name:'밥',unit:'묶음',url:null,ordered:1,owned:2}}}));
 replaceGlobal('localStorage',{
  getItem:(k:string)=>storage.get(k)??null,
  setItem:(k:string,v:string)=>storage.set(k,v),
  removeItem:(k:string)=>storage.delete(k),
 });
 replaceGlobal('navigator',{locks:{request:async(_name:string,work:()=>Promise<unknown>)=>work()}});
 replaceGlobal('window',new EventTarget());
 const requests:{importId:string;targetUserId:string}[]=[];
 t.mock.method(globalThis,'fetch',async(_url:unknown,options:RequestInit)=>{
  requests.push(JSON.parse(options.body as string));
  if(requests.length===1)throw new Error('network interrupted');
  return Response.json({stock:{},version:1});
 });
 await assert.rejects(importGuestStock('1'),/network interrupted/);
 assert.ok(storage.has(key));
 await importGuestStock('2');
 assert.equal(requests.length,1);
 await importGuestStock('1');
 assert.equal(requests.length,2);
 assert.equal(requests[0].importId,requests[1].importId);
 assert.equal(requests[1].targetUserId,'1');
 assert.equal(storage.has(key),false);
 await importGuestStock('1');
 assert.equal(requests.length,2);
});
