import assert from 'node:assert/strict';
import {test} from 'node:test';
import {randomUUID} from 'node:crypto';
import {NextRequest} from 'next/server';
import {GET,POST} from '../app/api/food-intake/route';
import {GET as cartGET,PUT as cartPUT} from '../app/api/shopping-progress/route';
import {createSession,SESSION_COOKIE,type PublicUser} from '../lib/auth';
import {getPool} from '../lib/db';
import {planProducts} from '../lib/shopping-plan-catalog';
import {servingNutrition} from '../lib/food-intake';
import {initialConditions} from '../lib/shopping-plan';
const req=(cookie='',body?:unknown,date?:string,origin='http://localhost:3000')=>new NextRequest(`http://localhost:3000/api/food-intake${date?'?date='+date:''}`,{method:body?'POST':'GET',headers:{Cookie:cookie,origin,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});
const cartReq=(cookie:string,body?:unknown)=>new NextRequest('http://localhost:3000/api/shopping-progress?scope=products',{method:body?'PUT':'GET',headers:{Cookie:cookie,origin:'http://localhost:3000','Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});
test('eating and undo are atomic, idempotent, isolated, and use server nutrition snapshots',async()=>{
 const db=getPool(),ids:string[]=[],cookies:string[]=[];
 try{
  assert.equal((await GET(req())).status,401);
  assert.equal((await POST(req('',{action:'eat'}))).status,401);
  for(let i=0;i<2;i++){const user=(await db.query<PublicUser>("INSERT INTO users(name,email) VALUES('섭취 기록 테스트',$1) RETURNING id::text,name,email",[`intake-${randomUUID()}@example.test`])).rows[0];ids.push(user.id);cookies.push(`${SESSION_COOKIE}=${(await createSession(user)).cookies.get(SESSION_COOKIE)!.value}`);}
  const p=(await planProducts()).find(p=>p.servings>=2&&servingNutrition(p).calories!==null)!;assert.ok(p,'real catalog has a verified multi-serving product');
  const stock={[p.id]:{id:p.id,name:p.name,unit:'묶음',url:p.productUrl,ordered:0,owned:1}};
  assert.equal((await cartPUT(cartReq(cookies[0],{stock,version:0}))).status,200);
  const command={action:'eat',id:randomUUID(),version:1,productId:p.id,portions:0.5,calories:99999};
  assert.equal((await POST(req(cookies[0],command))).status,200);
  assert.equal((await POST(req(cookies[0],command))).status,200);
  const first=await(await GET(req(cookies[0]))).json();assert.equal(first.logs.length,1);
  assert.equal(first.logs[0].calories,Math.round(servingNutrition(p).calories!*0.5*10)/10);
  assert.equal(first.logs[0].cost,Math.round(p.price/p.servings*0.5));
  assert.equal(first.version,2);assert.equal((await(await GET(req(cookies[1]))).json()).logs.length,0);
  assert.equal((await POST(req(cookies[1],{action:'undo',id:command.id,version:0}))).status,404);
  assert.equal((await cartPUT(cartReq(cookies[0],{stock,version:1}))).status,409);
  assert.equal((await POST(req(cookies[0],{...command,id:randomUUID()}))).status,409);
  const undo={action:'undo',id:command.id,version:first.version};
  assert.equal((await POST(req(cookies[0],undo))).status,200);
  assert.equal((await POST(req(cookies[0],undo))).status,200);
  const restored=await(await cartGET(cartReq(cookies[0]))).json();assert.equal(restored.stock[p.id].owned,1);assert.equal(restored.version,3);
  assert.equal((await(await GET(req(cookies[0]))).json()).logs.length,0);
  assert.equal((await POST(req(cookies[0],{...command,version:3}))).status,409);
  const concurrent=await Promise.all([POST(req(cookies[0],{...command,id:randomUUID(),version:3})),POST(req(cookies[0],{...command,id:randomUUID(),version:3}))]);
  assert.deepEqual(concurrent.map(r=>r.status).sort(),[200,409]);
  assert.equal((await(await GET(req(cookies[0]))).json()).logs.length,1);
  const before=await(await cartGET(cartReq(cookies[0]))).json();
  assert.equal((await POST(req(cookies[0],{...command,id:randomUUID(),version:before.version,portions:10}))).status,422);
  assert.deepEqual(await(await cartGET(cartReq(cookies[0]))).json(),before);
  assert.equal((await POST(req(cookies[0],{...command,id:randomUUID(),version:before.version},undefined,'https://evil.example'))).status,403);
  assert.equal((await POST(req(cookies[0],{...command,id:randomUUID(),version:before.version,portions:0.3}))).status,400);
  assert.equal((await GET(req(cookies[0],undefined,'2026-02-30'))).status,400);
  // A UTC evening belongs to the following Korean calendar day.
  await db.query("UPDATE food_intake_logs SET created_at='2026-09-17T16:00:00Z' WHERE user_id=$1 AND undone_at IS NULL",[ids[0]]);
  assert.equal((await(await GET(req(cookies[0],undefined,'2026-09-17'))).json()).logs.length,0);
  assert.equal((await(await GET(req(cookies[0],undefined,'2026-09-18'))).json()).logs.length,1);
  const finalStock=await(await cartGET(cartReq(cookies[0]))).json();
  assert.equal((await cartPUT(cartReq(cookies[0],{stock:{},version:finalStock.version,resetConditions:initialConditions}))).status,200);
  assert.deepEqual((await(await cartGET(cartReq(cookies[0]))).json()).stock,{});
  assert.equal((await(await GET(req(cookies[0],undefined,'2026-09-18'))).json()).logs.length,1);
 }finally{await db.query('DELETE FROM users WHERE id=ANY($1::bigint[])',[ids]);await db.end();}
});
