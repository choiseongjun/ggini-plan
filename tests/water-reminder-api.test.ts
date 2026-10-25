import {test} from 'node:test';
import assert from 'node:assert/strict';
import {NextRequest} from 'next/server';
import {GET,PUT} from '../app/api/water-reminders/route';
import {getPool} from '../lib/db';
test('water reminders require session and origin, default off, and save only session user',async t=>{
 process.env.DATABASE_URL='postgres://test:test@localhost:1/test';
 const pool=getPool();let saved:unknown=null;
 t.mock.method(pool,'query',async(sql:string,args?:unknown[])=>{
  if(sql.startsWith('SELECT enabled'))return {rows:saved?[saved]:[]};
  if(sql.startsWith('INSERT INTO water_reminders')){assert.equal(args?.[0],'qa-user');saved={enabled:args?.[1],times:JSON.parse(args?.[2] as string)};return {rows:[]};}
  return {rows:[{id:'qa-user',name:'QA',email:'qa@example.test'}]};
 });
 const request=(value:unknown,auth=true,origin='http://localhost')=>new NextRequest('http://localhost/api/water-reminders',{method:'PUT',headers:{origin,...(auth?{cookie:'kkiniplan_session=test'}:{})},body:JSON.stringify(value)});
 try{
  const response=await GET(new NextRequest('http://localhost/api/water-reminders',{headers:{cookie:'kkiniplan_session=test'}}));
  assert.equal((await response.json()).enabled,false);
  assert.equal((await PUT(request({enabled:true,times:['10:00']},false))).status,401);
  assert.equal((await PUT(request({enabled:true,times:['10:00']},true,'https://other.test'))).status,403);
  assert.equal((await PUT(request({enabled:true,times:['01:00']}))).status,400);
  assert.equal(saved,null);
  assert.equal((await PUT(request({enabled:true,times:['10:00'],userId:'other'}))).status,200);
  assert.deepEqual(saved,{enabled:true,times:['10:00']});
 }finally{await pool.end();}
});
