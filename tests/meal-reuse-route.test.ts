import test from 'node:test';
import assert from 'node:assert/strict';
import {NextRequest} from 'next/server';
import {getPool} from '../lib/db';
import {GET,POST} from '../app/api/food-intake/reuse/route';
test('reuse validates ownership and replays a committed batch even when its original meal is gone',async t=>{
 process.env.DATABASE_URL='postgres://test:test@localhost:1/test';const pool=getPool();
 const id='8f693a1d-17d5-4d2d-8280-5d3f836da87e',source='df916757-a59a-4512-a958-a55b1c9c0419',second='a29bbfed-4142-4f5d-8ef9-238322e293c0';
 let sourceQueries=0,connections=0,inserts=0,rollbacks=0,failSecond=false;
 type Row={id:unknown;product_name:unknown;calories:unknown;protein:unknown;carbs:unknown;fat:unknown;sugar:unknown;sodium:unknown;eaten_at:unknown;meal_slot:unknown;undone_at?:unknown};
 let saved:Row[]=[],staged:Row[]=[];
 let originals=[{id:source,product_id:'first',product_name:'첫 음식',portions:1,calories:500,protein:20,carbs:60,fat:10,sugar:null,sodium:200},{id:second,product_id:'second',product_name:'미확인 음식',portions:1,calories:null,protein:null,carbs:null,fat:null,sugar:null,sodium:null}];
 t.mock.method(pool,'query',async(sql:string,args:unknown[])=>{
  if(sql.startsWith('SELECT id,product_name')){assert.equal(args[0],'qa-owner');return {rows:saved};}
  if(sql.includes('FROM food_intake_logs')){assert.ok(sql.includes('user_id=$1'));assert.equal(args[0],'qa-owner');
   if(sql.includes('json_agg'))return {rows:[]};sourceQueries++;return {rows:originals};}
  return {rows:[{id:'qa-owner',name:'QA',email:'qa@example.test'}]};
 });
 const client={query:async(sql:string,args?:unknown[])=>{
  if(sql==='BEGIN')staged=[...saved];
  if(sql==='COMMIT')saved=[...staged];
  if(sql==='ROLLBACK'){rollbacks++;staged=[...saved];}
  if(sql.startsWith('INSERT INTO food_intake_logs')){
   if(failSecond&&staged.length===1)throw new Error('lost second insert');
   inserts++;staged.push({id:args?.[1],product_name:args?.[3],calories:args?.[5],protein:args?.[6],carbs:args?.[9],fat:args?.[12],sugar:args?.[10],sodium:args?.[11],eaten_at:args?.[13],meal_slot:args?.[14]});
  }
  if(sql.startsWith('SELECT id,product_name'))return {rows:staged};
  return {rows:[]};
 },release:()=>{}};
 t.mock.method(pool,'connect',async()=>{connections++;return client;});
 const items=[{id:source,portions:1.5,calories:999999},{id:second,portions:2}];
 const request=(override:Record<string,unknown>={})=>new NextRequest('http://localhost/api/food-intake/reuse',{method:'POST',headers:{origin:'http://localhost',cookie:'kkiniplan_session=test','Content-Type':'application/json'},body:JSON.stringify({id,source,owner:'qa-owner',items,eatenAt:'2026-01-01T03:00:00Z',mealSlot:'lunch',...override})});
 try{
  assert.equal((await POST(request({owner:'another-account'}))).status,403);
  assert.equal((await POST(request({items:[items[0],items[0]]}))).status,400);
  assert.equal(sourceQueries,0);
  assert.equal((await POST(request({items:[{id,portions:1}]}))).status,404);
  assert.equal(sourceQueries,1);
  failSecond=true;assert.equal((await POST(request())).status,503);assert.equal(rollbacks,1);assert.equal(saved.length,0);
  failSecond=false;const response=await POST(request());assert.equal(response.status,200);
  const result=await response.json();assert.equal(result.saved,true);assert.equal(result.replayed,false);assert.equal(saved.length,2);
  assert.equal(saved[0].calories,750);assert.equal(saved[1].calories,null);assert.equal(result.nutrition.calories,750);
  const writes=inserts,connected=connections,reads=sourceQueries;
  originals=[];
  const retry=await POST(request());assert.equal(retry.status,200);assert.equal((await retry.json()).replayed,true);
  assert.equal(inserts,writes);assert.equal(connections,connected);assert.equal(sourceQueries,reads);
  assert.equal((await POST(request({eatenAt:'invalid old input'}))).status,200,'already saved requests are confirmed before fresh validation');
  saved[0].undone_at='2026-01-02T00:00:00Z';assert.equal((await POST(request())).status,409);assert.equal(inserts,writes);
  const recent=await GET(new NextRequest('http://localhost/api/food-intake/reuse',{headers:{cookie:'kkiniplan_session=test'}}));
  assert.deepEqual(await recent.json(),{ownerId:'qa-owner',meals:[]});
 }finally{await pool.end();}
});
