import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {NextRequest} from 'next/server';
import {GET,POST} from '../app/api/food-intake/estimated-cost/route';
import {createSession,SESSION_COOKIE,type PublicUser} from '../lib/auth';
import {getPool} from '../lib/db';
test('weekly costs are private, cached and invalidated when portions change',async()=>{
 const db=getPool();let userId:string|undefined;const original=globalThis.fetch;let calls=0;
 try{
  assert.equal((await GET(new NextRequest('http://localhost:3000/api/food-intake/estimated-cost'))).status,401);
  const user=(await db.query<PublicUser>('INSERT INTO users(name,email) VALUES($1,$2) RETURNING id::text,name,email',['식비 테스트',`cost-${randomUUID()}@example.test`])).rows[0];userId=user.id;
  const session=await createSession(user),headers={cookie:`${SESSION_COOKIE}=${session.cookies.get(SESSION_COOKIE)!.value}`,origin:'http://localhost:3000'};
  const id=randomUUID();await db.query("INSERT INTO food_intake_logs(user_id,id,product_id,product_name,portions,packs,calories,cost,stock_item,created_at) VALUES($1,$2,'test','콜라',1,1,140,NULL,'{}','2026-09-21 00:00:00+09')",[user.id,id]);
  const req=(method='GET',date='2026-09-26')=>new NextRequest(`http://localhost:3000/api/food-intake/estimated-cost?date=${date}`,{method,headers});
  globalThis.fetch=async()=>{calls++;return Response.json({output:[{content:[{type:'output_text',text:JSON.stringify({items:[{id,low:1000,high:1500}]})}]}]});};
  assert.equal((await GET(req('GET','2026-02-30'))).status,400);
  const initial=await (await GET(req())).json();assert.equal(initial.missing,1);assert.equal(calls,0);assert.equal(initial.from,'2026-09-21');
  assert.equal((await (await POST(req('POST'))).json()).high,1500);assert.equal(calls,1);
  assert.equal((await (await POST(req('POST'))).json()).aiCount,1);assert.equal(calls,1);
  await db.query('UPDATE food_intake_logs SET portions=2 WHERE user_id=$1 AND id=$2',[user.id,id]);
  assert.equal((await (await GET(req())).json()).missing,1);
  await db.query('UPDATE food_intake_logs SET undone_at=now() WHERE user_id=$1 AND id=$2',[user.id,id]);
  assert.equal((await (await GET(req())).json()).count,0);
 }finally{globalThis.fetch=original;if(userId)await db.query('DELETE FROM users WHERE id=$1',[userId]);await db.end();}
});
