import {test} from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import {NextRequest} from 'next/server';
import {POST} from '../app/api/food-intake/confirmed-photo/route';
import {getPool} from '../lib/db';

test('photo meal validates all rows, rolls back failures and replays the whole batch without duplicates',async t=>{
 process.env.DATABASE_URL='postgres://test:test@localhost:1/test';
 const pool=getPool();
 t.mock.method(pool,'query',async(sql:string)=>({rows:sql.includes('FROM food_reference')?[{food_code:'test-food',name:'만두',brand:null,category:null,basis_amount:'100',basis_unit:'g',serving_amount:'200',serving_unit:'g',calories_kcal:'100',protein_g:'10',carbohydrates_g:'20',sugar_g:null,fat_g:'5',sodium_mg:'100'}]:[{id:'qa-user',name:'QA',email:'qa@example.test'}]}));
 type Row={id:unknown;product_name:unknown;portions:unknown;calories:unknown;protein:unknown;carbs:unknown;fat:unknown;sugar:unknown;sodium:unknown;eaten_at:unknown;meal_slot:unknown};
 let saved:Row[]=[],staged:Row[]=[],images=0,stagedImages=0,failSecond=false,rollbacks=0;
 const client={query:async(sql:string,args?:unknown[])=>{
  if(sql==='BEGIN'){staged=[...saved];stagedImages=images;}
  if(sql==='COMMIT'){saved=[...staged];images=stagedImages;}
  if(sql==='ROLLBACK'){staged=[...saved];rollbacks++;}
  if(sql.startsWith('INSERT INTO food_intake_logs')){
   if(failSecond&&staged.length===1)throw Error('simulated second insert failure');
   staged.push({id:args?.[1],product_name:args?.[3],portions:args?.[4],calories:args?.[5],protein:args?.[6],carbs:args?.[9],fat:args?.[12],sugar:args?.[10],sodium:args?.[11],eaten_at:args?.[13],meal_slot:args?.[14]});
  }
  if(sql.startsWith('INSERT INTO food_intake_photos')){stagedImages++;assert.ok(Buffer.isBuffer(args?.[3]));}
  if(sql.startsWith('SELECT id,product_name'))return {rows:staged};
  return {rows:[]};
 },release:()=>{}};
 t.mock.method(pool,'connect',async()=>client);
 const image=await sharp({create:{width:2,height:2,channels:3,background:'white'}}).jpeg().toBuffer();
 const items=[{referenceCode:'test-food',portions:0.5},{referenceCode:'manual:너겟',portions:1.5}];
 function request(value:unknown=items){
  const form=new FormData();form.set('id','8f693a1d-17d5-4d2d-8280-5d3f836da87e');form.set('items',JSON.stringify(value));form.set('mealSlot','lunch');form.set('eatenAt','2026-01-01T03:00:00Z');form.set('photo',new Blob([new Uint8Array(image)],{type:'image/jpeg'}),'meal.jpg');
  return new NextRequest('http://localhost/api/food-intake/confirmed-photo',{method:'POST',headers:{origin:'http://localhost',cookie:'kkiniplan_session=test'},body:form});
 }
 try{
  for(const invalid of [[],Array(11).fill(items[0]),[items[0],{referenceCode:'manual:너겟',portions:-1}],[{referenceCode:'manual:너겟',portions:0.3}]])assert.equal((await POST(request(invalid))).status,400);
  assert.equal((await POST(request([items[0],{referenceCode:'manual:',portions:1}]))).status,422);
  assert.equal(saved.length,0);
  failSecond=true;assert.equal((await POST(request())).status,503);assert.equal(rollbacks,1);assert.equal(saved.length,0);assert.equal(images,0);
  failSecond=false;const response=await POST(request());assert.equal(response.status,200);const result=await response.json();assert.equal(result.ids.length,2);assert.equal(result.food.name,'만두 + 너겟');assert.deepEqual(saved.map(row=>row.portions),[0.5,1.5]);assert.equal(images,1);
  assert.equal(result.nutrition.calories,100);assert.equal(result.nutrition.protein,10);assert.equal(saved[1].calories,null,'unknown nutrition stays unknown');
  const retry=await POST(request());assert.equal(retry.status,200);assert.equal((await retry.json()).replayed,true);assert.equal(saved.length,2);assert.equal(images,1);
 }finally{await pool.end();}
});
