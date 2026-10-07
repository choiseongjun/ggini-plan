import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseTasteSave} from '../lib/pending-taste-save';
import {sanitizeAnalytics} from '../lib/analytics-events';
const now=Date.now(),draft={id:'5ef9ef73-1fe1-4a10-aeae-39b0a3fe7463',name:'돈가스',day:'2026-10-07',slot:'dinner',at:now};
test('login continuation preserves exactly the same save identity and payload',()=>{
 const restored=parseTasteSave(JSON.stringify({...draft,password:'never keep',redirect:'https://bad.test'}),now+1000);
 assert.deepEqual(restored,draft);
 assert.equal(parseTasteSave(JSON.stringify(restored),now+2000)?.id,draft.id);
});
test('expired, future, corrupted, or malformed saves cannot resume',()=>{
 for(const patch of [{at:now-1800001},{at:now+1},{id:'invalid'},{name:''},{name:'a'.repeat(81)},{slot:'breakfast'},{day:'bad'},{day:'2026-02-31'}])assert.equal(parseTasteSave(JSON.stringify({...draft,...patch}),now),null);
 for(const raw of [null,'bad','{}','[]'])assert.equal(parseTasteSave(raw,now),null);
});
test('return destination stays on taste, never an external login redirect',()=>{
 for(const returnTo of ['https://bad.test','//bad.test','/profile','/taste/../profile'])assert.equal(parseTasteSave(JSON.stringify({...draft,returnTo}),now)?.returnTo,undefined);
 assert.equal(parseTasteSave(JSON.stringify({...draft,returnTo:'/taste?v=2&me=6'}),now)?.returnTo,'/taste?v=2&me=6');
});
test('conversion events cannot include selected meal or login credentials',()=>{
 assert.deepEqual(sanitizeAnalytics('save_login_failed',{screen:'taste',email:'private',name:'돈가스',password:'private',error:'private'}),{$process_person_profile:false,$geoip_disable:true,screen:'taste'});
});
