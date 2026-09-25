import {test} from 'node:test';
import assert from 'node:assert/strict';
import {subscribeRecordSync} from '../lib/record-sync';
test('record sync refreshes visible devices on return, reconnect and timer, then cleans up',()=>{
 const oldWindow=Object.getOwnPropertyDescriptor(globalThis,'window'),oldDocument=Object.getOwnPropertyDescriptor(globalThis,'document');
 let timer:(()=>void)|undefined,cleared=false,count=0;
 const win=Object.assign(new EventTarget(),{setInterval:(fn:()=>void)=>{timer=fn;return 1;},clearInterval:()=>{cleared=true;}});
 const doc=Object.assign(new EventTarget(),{visibilityState:'visible'});
 Object.defineProperty(globalThis,'window',{value:win,configurable:true});Object.defineProperty(globalThis,'document',{value:doc,configurable:true});
 try{
  const stop=subscribeRecordSync(()=>count++);
  win.dispatchEvent(new Event('focus'));win.dispatchEvent(new Event('online'));timer!();assert.equal(count,3);
  doc.visibilityState='hidden';timer!();assert.equal(count,3);
  doc.visibilityState='visible';doc.dispatchEvent(new Event('visibilitychange'));assert.equal(count,4);
  stop();win.dispatchEvent(new Event('focus'));assert.equal(count,4);assert.equal(cleared,true);
 }finally{
  if(oldWindow)Object.defineProperty(globalThis,'window',oldWindow);else Reflect.deleteProperty(globalThis,'window');
  if(oldDocument)Object.defineProperty(globalThis,'document',oldDocument);else Reflect.deleteProperty(globalThis,'document');
 }
});
