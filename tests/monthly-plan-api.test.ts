import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {NextRequest} from 'next/server';
import {GET,POST} from '../app/api/monthly-plan/route';
import {POST as daily} from '../app/api/meal-plans/route';
import {getPool} from '../lib/db';
import {createSession,SESSION_COOKIE,type PublicUser} from '../lib/auth';
import {defaultDiet} from '../lib/meal-plan';
const req=(cookie='',body?:unknown,query='month=2028-02')=>new NextRequest(`http://localhost:3000/api/monthly-plan?${query}`,{method:body?'POST':'GET',headers:{cookie,origin:'http://localhost:3000','content-type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});
test('monthly generation, account isolation, swap and persisted ingredient basket',async()=>{
 const db=getPool(),ids:string[]=[],cookies:string[]=[];
 try{
  assert.equal((await GET(req())).status,401);
  for(let i=0;i<2;i++){const u=(await db.query<PublicUser>("INSERT INTO users(name,email) VALUES('월간 기능 테스트',$1) RETURNING id::text,name,email",[`monthly-${randomUUID()}@example.test`])).rows[0];ids.push(u.id);cookies.push(`${SESSION_COOKIE}=${(await createSession(u)).cookies.get(SESSION_COOKIE)!.value}`);}
  assert.equal((await POST(req(cookies[0],{month:'2028-02',action:'generate'}))).status,422);
  assert.equal((await daily(req(cookies[0],{profile:{height:165,weight:60,age:28,sex:'female',activity:'light',meals:3,pregnancy:false},diet:defaultDiet}))).status,201);
  const current=new Date(Date.now()+9*3600000).toISOString().slice(0,7);
  assert.ok((await(await GET(req(cookies[0],undefined,`month=${current}`))).json()).plan.days.length>=28);
  assert.equal((await POST(req(cookies[0],{month:'2028-02',action:'ensure'}))).status,200);

  const before=(await(await GET(req(cookies[0]))).json()).plan;assert.equal(before.days.length,29);
  assert.equal((await(await GET(req(cookies[1]))).json()).plan,null);
  assert.equal((await POST(req(cookies[0],{month:'2028-02',action:'swap',date:'2028-02-01',index:0}))).status,200);
  const after=(await(await GET(req(cookies[0]))).json()).plan;
  assert.notEqual(before.days[0].recommendation.meals[0].name,after.days[0].recommendation.meals[0].name);
  assert.deepEqual(before.days[0].recommendation.meals[1],after.days[0].recommendation.meals[1]);
  assert.equal((await POST(req(cookies[0],{month:'2028-02',action:'ensure'}))).status,200);
  assert.deepEqual((await(await GET(req(cookies[0]))).json()).plan.days,after.days);
  assert.equal((await POST(req(cookies[0],{month:'2028-02',action:'basket',start:'2028-02-26'}))).status,200);
  assert.equal((await POST(req(cookies[0],{month:'2028-02',action:'owned',owned:['oil']}))).status,200);
  const basket=(await(await GET(req(cookies[0],undefined,'basket=1'))).json()).basket;
  assert.equal(basket.end,'2028-02-29');assert.ok(basket.items.some((i:{food:string})=>i.food==='oil'));assert.deepEqual(basket.owned,['oil']);
  assert.equal((await(await GET(req(cookies[1],undefined,'basket=1'))).json()).basket,null);
  assert.equal((await POST(req(cookies[0],{month:'2028-02',action:'basket',start:'2028-02-30'}))).status,400);
 }finally{await db.query('DELETE FROM users WHERE id=ANY($1::bigint[])',[ids]);await db.end();}
});
