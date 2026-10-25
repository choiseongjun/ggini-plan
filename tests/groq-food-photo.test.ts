import test from 'node:test';
import assert from 'node:assert/strict';
import {parsePhotoFoods,analyzeGroqPhoto} from '../lib/groq-food-photo';
test('multi-food response keeps each food without inventing nutrients',()=>{
 assert.deepEqual(parsePhotoFoods(JSON.stringify({foods:[{name:'만두',description:'주름진 피'},{name:'치킨너겟',description:'튀김옷이 보여요'}]})).map(x=>x.name),['만두','치킨너겟']);
 assert.deepEqual(parsePhotoFoods('{"foods":[]}'),[]);
 for(const text of ['bad','null','{"foods":[{"name":""}]}'])assert.throws(()=>parsePhotoFoods(text));
});
test('missing key never calls provider; rate limits are surfaced, not retried with paid provider',async()=>{
 const oldKey=process.env.GROQ_API_KEY,original=globalThis.fetch;let calls=0;
 try{
  delete process.env.GROQ_API_KEY;
  globalThis.fetch=async()=>{calls++;return new Response('',{status:429});};
  await assert.rejects(()=>analyzeGroqPhoto(Buffer.from('test')),/연결을 준비/);assert.equal(calls,0);
  process.env.GROQ_API_KEY='test-key';
  await assert.rejects(()=>analyzeGroqPhoto(Buffer.from('test')),/무료 분석 한도/);assert.equal(calls,1);
 }finally{globalThis.fetch=original;if(oldKey===undefined)delete process.env.GROQ_API_KEY;else process.env.GROQ_API_KEY=oldKey;}
});
