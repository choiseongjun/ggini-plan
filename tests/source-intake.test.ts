import {test} from 'node:test';
import assert from 'node:assert/strict';
import type {Pool} from 'pg';
import {logMeal} from '../lib/intake-log';

test('source meal records use existing idempotent log with unknown nutrition and no stock deduction',async()=>{
 const scope=globalThis as typeof globalThis&{kkiniplanPool?:Pool;kkiniplanDatabaseUrl?:string};
 const oldPool=scope.kkiniplanPool,oldUrl=scope.kkiniplanDatabaseUrl,oldEnv=process.env.DATABASE_URL;
 const inserts:unknown[][]=[];
 const client={release(){},async query(sql:string,args:unknown[]=[]){
  if(sql.startsWith('INSERT INTO food_intake_logs'))inserts.push(args);
  if(sql.startsWith('SELECT id,product_name'))return {rows:inserts.filter(v=>v[0]===args[0]&&v[1]===args[1]).map(v=>({id:v[1],product_name:v[3],calories:v[5],protein:v[6],carbs:v[9],sugar:v[10],sodium:v[11],fat:v[12],eaten_at:v[13],meal_slot:v[14],undone_at:null}))};
  return {rows:[]};
 }};
 process.env.DATABASE_URL='postgres://unused.invalid/test';scope.kkiniplanDatabaseUrl=process.env.DATABASE_URL;scope.kkiniplanPool={connect:async()=>client} as unknown as Pool;
 try{
  const input={id:'11111111-1111-4111-8111-111111111111',productId:'source-kR77WlHRZrs',portions:1,extras:[]};
  assert.equal((await logMeal('test-user',input)).status,200);
  const retry=await(await logMeal('test-user',input)).json();assert.equal(retry.replayed,true);assert.equal(inserts.length,1);
  assert.equal(inserts[0][2],input.productId);assert.equal(inserts[0][5],null);assert.equal(inserts[0][6],null);assert.equal(inserts[0][8],null);
  assert.deepEqual(JSON.parse(String(inserts[0][7])),{kind:'none'});
  assert.equal((await logMeal('test-user',{...input,productId:'source-invalid'})).status,422);
 }finally{scope.kkiniplanPool=oldPool;scope.kkiniplanDatabaseUrl=oldUrl;if(oldEnv===undefined)delete process.env.DATABASE_URL;else process.env.DATABASE_URL=oldEnv;}
});
