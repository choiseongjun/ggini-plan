import assert from 'node:assert/strict';
import {test} from 'node:test';
import {randomUUID} from 'node:crypto';
import {NextRequest} from 'next/server';
import {GET,POST} from '../app/api/shopping-plan/route';
import {createSession,SESSION_COOKIE,type PublicUser} from '../lib/auth';
import {getPool} from '../lib/db';
import {initialConditions,recommendShopping} from '../lib/shopping-plan';
const req=(cookie='',body?:unknown,saved=false)=>new NextRequest(`http://localhost:3000/api/shopping-plan${saved?'?saved=1':''}`,{method:body?'POST':'GET',headers:{Cookie:cookie,origin:'http://localhost:3000','Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});
test('guest recommendation, authenticated save, account isolation and server validation',async()=>{
 const db=getPool(),ids:string[]=[],cookies:string[]=[];
 try{
  const response=await GET(req());assert.equal(response.status,200);const {products}=await response.json();assert.ok(products.length>0);
  const mealIds=recommendShopping(products,initialConditions)!;assert.equal(mealIds.length,initialConditions.meals);
  const body={conditions:initialConditions,mealIds};assert.equal((await POST(req('',body))).status,401);
  for(let i=0;i<2;i++){const user=(await db.query<PublicUser>("INSERT INTO users(name,email) VALUES('장보기 기능 테스트',$1) RETURNING id::text,name,email",[`planner-${randomUUID()}@example.test`])).rows[0];ids.push(user.id);cookies.push(`${SESSION_COOKIE}=${(await createSession(user)).cookies.get(SESSION_COOKIE)!.value}`);}
  assert.equal((await POST(req(cookies[0],body))).status,201);
  assert.deepEqual((await(await GET(req(cookies[0],undefined,true))).json()).plan.mealIds,mealIds);
  assert.equal((await(await GET(req(cookies[1],undefined,true))).json()).plan,null);
  assert.equal((await POST(req(cookies[0],{...body,mealIds:['fake',...mealIds.slice(1)]}))).status,409);
  assert.equal((await POST(req(cookies[0],{...body,conditions:{...initialConditions,budget:1000}}))).status,409);
 }finally{await db.query('DELETE FROM users WHERE id=ANY($1::bigint[])',[ids]);await db.end();}
});
