import assert from 'node:assert/strict';
import {test} from 'node:test';
import {randomUUID} from 'node:crypto';
import {NextRequest} from 'next/server';
import {GET,PUT} from '../app/api/shopping-progress/route';
import {createSession,SESSION_COOKIE,type PublicUser} from '../lib/auth';
import {getPool} from '../lib/db';
const req=(cookie='',body?:unknown,scope='products',origin='http://localhost:3000')=>new NextRequest(`http://localhost:3000/api/shopping-progress?scope=${scope}`,{method:body?'PUT':'GET',headers:{Cookie:cookie,origin,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});
test('progress persists per account and scope; stale writes cannot overwrite newer receipts',async()=>{
 const db=getPool(),ids:string[]=[],cookies:string[]=[];
 try{
  assert.equal((await GET(req())).status,401);
  for(let i=0;i<2;i++){const user=(await db.query<PublicUser>("INSERT INTO users(name,email) VALUES('구매 상태 테스트',$1) RETURNING id::text,name,email",[`progress-${randomUUID()}@example.test`])).rows[0];ids.push(user.id);cookies.push(`${SESSION_COOKIE}=${(await createSession(user)).cookies.get(SESSION_COOKIE)!.value}`);}
  const stock={rice:{id:'rice',name:'밥',unit:'묶음',url:null,ordered:2,owned:0}};
  assert.equal((await PUT(req(cookies[0],{stock,version:0}))).status,200);
  assert.deepEqual((await(await GET(req(cookies[0]))).json()).stock,stock);
  assert.deepEqual((await(await GET(req(cookies[1]))).json()).stock,{});
  assert.deepEqual((await(await GET(req(cookies[0],undefined,'ingredients'))).json()).stock,{});
  assert.equal((await PUT(req(cookies[0],{stock,version:0}))).status,409);
  const received={rice:{...stock.rice,ordered:0,owned:2}};
  assert.equal((await PUT(req(cookies[0],{stock:received,version:1}))).status,200);
  assert.equal((await PUT(req(cookies[0],{stock,version:1}))).status,409);
  assert.deepEqual((await(await GET(req(cookies[0]))).json()).stock,received);
  assert.equal((await PUT(req(cookies[0],{stock,version:2},'products','https://evil.example'))).status,403);
  assert.equal((await PUT(req(cookies[0],{stock:{rice:{...stock.rice,owned:-1}},version:2}))).status,400);
 }finally{await db.query('DELETE FROM users WHERE id=ANY($1::bigint[])',[ids]);await db.end();}
});
