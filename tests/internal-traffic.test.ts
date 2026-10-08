import assert from 'node:assert/strict';
import {test,beforeEach} from 'node:test';
import {applyInternalParam,isInternalDevice,setInternalDevice} from '../lib/internal-traffic';

let href='';
const store=new Map<string,string>();
function visit(url:string){href=url;}
beforeEach(()=>{
 store.clear();visit('https://gginiplan.kr/');
 (globalThis as {window?:unknown}).window={
  get location(){return new URL(href);},
  localStorage:{getItem:(k:string)=>store.get(k)??null,setItem:(k:string,v:string)=>{store.set(k,v);},removeItem:(k:string)=>{store.delete(k);}},
  history:{state:{keep:true},replaceState:(_state:unknown,_title:string,url:string)=>{href=new URL(url,href).href;}},
 };
});

test('a browser is measured until it is marked as internal',()=>{
 assert.equal(isInternalDevice(),false);
 setInternalDevice(true);assert.equal(isInternalDevice(),true);
 setInternalDevice(false);assert.equal(isInternalDevice(),false);
});

test('the marking visit itself is excluded before the flag is stored',()=>{
 visit('https://gginiplan.kr/plan?internal=1&tab=week');
 assert.equal(isInternalDevice(),true);
 assert.equal(store.size,0);
});

test('the internal parameter is stored and removed from the address bar',()=>{
 visit('https://gginiplan.kr/plan?internal=1&tab=week#today');
 applyInternalParam();
 assert.equal(isInternalDevice(),true);
 assert.equal(href,'https://gginiplan.kr/plan?tab=week#today');
 visit('https://gginiplan.kr/?internal=0');
 assert.equal(isInternalDevice(),false);
 applyInternalParam();
 assert.equal(isInternalDevice(),false);
 assert.equal(href,'https://gginiplan.kr/');
});

test('unrelated values do not change the mark',()=>{
 setInternalDevice(true);
 visit('https://gginiplan.kr/?internal=yes');
 applyInternalParam();
 assert.equal(isInternalDevice(),true);
 assert.equal(href,'https://gginiplan.kr/?internal=yes');
});
