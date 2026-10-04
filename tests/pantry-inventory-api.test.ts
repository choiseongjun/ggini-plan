import {test} from 'node:test';
import assert from 'node:assert/strict';
import type {Pool} from 'pg';
import {NextRequest} from 'next/server';
import {GET,PUT} from '../app/api/pantry/inventory/route';

test('pantry API isolates accounts, rejects stale writes and safely replays a save',async()=>{
 const scope=globalThis as typeof globalThis&{kkiniplanPool?:Pool;kkiniplanDatabaseUrl?:string};
 const previous={pool:scope.kkiniplanPool,url:scope.kkiniplanDatabaseUrl,env:process.env.DATABASE_URL};
 let currentUser='1';
 const rows=new Map<string,{inventory:unknown[];version:number;request_id:string|null}>();
 const query=async(sql:string,args:unknown[]=[])=>{
  if(sql.includes('FROM sessions JOIN users'))return {rows:[{id:currentUser,name:'test',email:'test@example.invalid'}]};
  const id=String(args[0]);
  if(sql.startsWith('INSERT INTO pantry_inventory')&&!rows.has(id))rows.set(id,{inventory:[],version:0,request_id:null});
  if(sql.startsWith('SELECT inventory'))return {rows:rows.has(id)?[{...rows.get(id)}]:[]};
  if(sql.startsWith('UPDATE pantry_inventory')){const row=rows.get(id)!;row.inventory=JSON.parse(String(args[1]));row.version++;row.request_id=String(args[2]);return {rows:[{...row}]};}
  return {rows:[]};
 };
 process.env.DATABASE_URL='postgres://unused.invalid/pantry';scope.kkiniplanDatabaseUrl=process.env.DATABASE_URL;
 scope.kkiniplanPool={query,connect:async()=>({query,release(){}})} as unknown as Pool;
 const request=(body?:unknown,cookie=true,origin='https://example.test')=>new NextRequest('https://example.test/api/pantry/inventory',{method:body?'PUT':'GET',headers:{origin,...(cookie?{cookie:'kkiniplan_session=test'}:{})},...(body?{body:JSON.stringify(body)}:{})});
 const payload={userId:'1',version:0,requestId:'11111111-1111-4111-8111-111111111111',inventory:[{name:'두부',quantity:'',expiresOn:'',purchasedOn:'',opened:false,planned:false}]};
 try{
  assert.equal((await GET(request(undefined,false))).status,401);
  assert.equal((await PUT(request(payload,true,'https://other.test'))).status,403);
  assert.equal((await PUT(request({...payload,userId:'2'}))).status,409);
  const first=await(await PUT(request(payload))).json();assert.equal(first.version,1);
  const replay=await(await PUT(request(payload))).json();assert.equal(replay.version,1);
  assert.equal((await PUT(request({...payload,requestId:'22222222-2222-4222-8222-222222222222'}))).status,409);
  assert.equal((await(await GET(request())).json()).inventory[0].name,'두부');
  currentUser='2';const second=await(await GET(request())).json();assert.deepEqual(second.inventory,[]);assert.equal(second.exists,false);
 }finally{scope.kkiniplanPool=previous.pool;scope.kkiniplanDatabaseUrl=previous.url;if(previous.env===undefined)delete process.env.DATABASE_URL;else process.env.DATABASE_URL=previous.env;}
});
