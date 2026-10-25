import {test} from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import {NextRequest} from 'next/server';
import {POST} from '../app/api/food-intake/confirmed-photo/route';
import {getPool} from '../lib/db';

test('confirmed photo enforces auth, validates images, and stores photo with the confirmed food atomically',async t=>{
 process.env.DATABASE_URL='postgres://test:test@localhost:1/test';
 const pool=getPool();
 t.mock.method(pool,'query',async()=>({rows:[{id:'qa-user',name:'QA',email:'qa@example.test'}]}));
 let inserted=false,photoCount=0;
 const client={query:async(sql:string,args?:unknown[])=>{
  if(sql.startsWith('INSERT INTO food_intake_logs')){inserted=true;assert.equal(args?.[0],'qa-user');assert.equal(args?.[2],'ref:manual:테스트 식사');}
  if(sql.startsWith('INSERT INTO food_intake_photos')){photoCount++;assert.ok(Buffer.isBuffer(args?.[3]));}
  if(sql.startsWith('SELECT id,product_name'))return {rows:inserted?[{id:'8f693a1d-17d5-4d2d-8280-5d3f836da87e',product_name:'테스트 식사',calories:null,protein:null,carbs:null,fat:null,sugar:null,sodium:null,eaten_at:'2026-01-01T03:00:00Z',meal_slot:'lunch'}]:[]};
  return {rows:[]};
 },release:()=>{}};
 t.mock.method(pool,'connect',async()=>client);
 const image=await sharp({create:{width:2,height:2,channels:3,background:'white'}}).jpeg().toBuffer();
 function request(options:{auth?:boolean;origin?:string;badPhoto?:boolean;portions?:string}={}){
  const form=new FormData();form.set('id','8f693a1d-17d5-4d2d-8280-5d3f836da87e');form.set('referenceCode','manual:테스트 식사');form.set('portions',options.portions??'1');form.set('mealSlot','lunch');form.set('eatenAt','2026-01-01T03:00:00Z');form.set('photo',new Blob([new Uint8Array(options.badPhoto?Buffer.from('invalid'):image)],{type:'image/jpeg'}),'meal.jpg');
  return new NextRequest('http://localhost/api/food-intake/confirmed-photo',{method:'POST',headers:{origin:options.origin??'http://localhost',...(options.auth===false?{}:{cookie:'kkiniplan_session=test'})},body:form});
 }
 try{
  assert.equal((await POST(request({origin:'https://other.test'}))).status,403);
  assert.equal((await POST(request({auth:false}))).status,401);
  assert.equal((await POST(request({badPhoto:true}))).status,400);
  assert.equal((await POST(request({portions:'-1'}))).status,400);
  const saved=await POST(request());assert.equal(saved.status,200);assert.equal((await saved.json()).ids.length,1);assert.equal(photoCount,1);
  const retry=await POST(request());assert.equal(retry.status,200);assert.equal(photoCount,1,'retry must not insert a duplicate image');
 }finally{await pool.end();}
});
