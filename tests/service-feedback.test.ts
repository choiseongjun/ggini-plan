import assert from 'node:assert/strict';
import {test} from 'node:test';
import {randomUUID} from 'node:crypto';
import {NextRequest} from 'next/server';
import {POST} from '../app/api/feedback/route';
import {GET,PATCH} from '../app/api/admin/feedback/route';
import {parseFeedback} from '../lib/service-feedback';
import {getPool} from '../lib/db';
const input={id:randomUUID(),kind:'useful',message:'[자동 테스트] 의견 저장 확인',page:'/'};
const req=(body:unknown,origin='http://localhost:3000')=>new NextRequest('http://localhost:3000/api/feedback',{method:'POST',headers:{origin},body:JSON.stringify(body)});
test('feedback validation accepts reactions and rejects private URLs and invalid payloads',()=>{
 assert.ok(parseFeedback({...input,message:''}));
 for(const value of [null,{...input,kind:'toString'},{...input,message:'a'.repeat(1001)},{...input,page:'/?token=secret'},{...input,id:'bad'}])assert.equal(parseFeedback(value),null);
});
test('anonymous feedback is stored once, protected from overwrite, and private',async()=>{
 const db=getPool();
 try{
  assert.equal((await POST(req(input,'https://other.example'))).status,403);
  assert.equal((await POST(req({...input,kind:'bad'}))).status,400);
  assert.equal((await GET(new NextRequest('http://localhost:3000/api/admin/feedback'))).status,403);
  assert.equal((await PATCH(req({id:input.id,status:'done'}))).status,403);
  assert.equal((await POST(req(input))).status,201);
  assert.equal((await POST(req(input))).status,200);
  assert.equal((await POST(req({...input,message:'overwrite'}))).status,409);
  const {rows}=await db.query('SELECT message,status FROM service_feedback WHERE id=$1',[input.id]);
  assert.deepEqual(rows,[{message:input.message,status:'new'}]);
 }finally{await db.query('DELETE FROM service_feedback WHERE id=$1',[input.id]);await db.end();}
});
