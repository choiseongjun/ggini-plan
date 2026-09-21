import assert from 'node:assert/strict';
import {test} from 'node:test';
import {randomUUID} from 'node:crypto';
import {NextRequest} from 'next/server';
import {GET,POST} from '../app/api/shared-plans/route';
import {createSession,SESSION_COOKIE,type PublicUser} from '../lib/auth';
import {getPool} from '../lib/db';
import {planProducts} from '../lib/shopping-plan-catalog';
import {initialConditions,recommendShopping,basketTotal} from '../lib/shopping-plan';
const req=(cookie='',body?:unknown,id='',origin='http://localhost:3000')=>new NextRequest(`http://localhost:3000/api/shared-plans?id=${id}`,{method:body?'POST':'GET',headers:{Cookie:cookie,origin,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});
test('authenticated snapshot sharing, anonymous reads, privacy, replay and personalized adoption',async()=>{
 const db=getPool(),ids:string[]=[],cookies:string[]=[];
 try{
  assert.equal((await POST(req('',{action:'share'}))).status,401);
  assert.equal((await GET(req('',undefined,'bad-id'))).status,404);
  assert.equal((await GET(req('',undefined,randomUUID()))).status,404);
  for(let i=0;i<2;i++){const user=(await db.query<PublicUser>("INSERT INTO users(name,email) VALUES('공유 테스트',$1) RETURNING id::text,name,email",[`share-${randomUUID()}@example.test`])).rows[0];ids.push(user.id);cookies.push(`${SESSION_COOKIE}=${(await createSession(user)).cookies.get(SESSION_COOKIE)!.value}`);}
  const products=await planProducts(),conditions={...initialConditions,days:2,meals:2},mealIds=recommendShopping(products,conditions)!;
  const body={action:'share',conditions:{...conditions,avoid:'private-preference',owned:mealIds,supply:{[mealIds[0]]:5},startDate:'2026-09-17',secret:'private-data'},mealIds};
  assert.equal((await POST(req(cookies[0],body,'','https://evil.example'))).status,403);
  assert.equal((await POST(req(cookies[0],{...body,mealIds:['missing',mealIds[0]]}))).status,400);
  const response=await POST(req(cookies[0],body));assert.equal(response.status,201);
  const {path}=await response.json(),id=path.split('/').at(-1);
  assert.equal((await(await POST(req(cookies[0],body))).json()).path,path);
  const sharedResponse=await GET(req('',undefined,id));assert.equal(sharedResponse.status,200);
  const shared=await sharedResponse.json();
  assert.deepEqual(Object.keys(shared.plan).sort(),['days','meals','people','products','purchases','sideCount','slots','total']);
  assert.equal(shared.plan.total,basketTotal(mealIds,products,[]));
  assert.equal(shared.plan.days,2);assert.equal(shared.plan.meals.length,2);
  const text=JSON.stringify(shared);
  for(const secret of ['private-preference','private-data','userId','supply','owned','startDate','email'])assert.equal(text.includes(secret),false);
  assert.equal((await POST(req('',{action:'adopt',id,budget:50000}))).status,401);
  assert.equal((await POST(req(cookies[1],{action:'adopt',id,budget:1000}))).status,422);
  assert.equal((await db.query('SELECT * FROM shopping_plans WHERE user_id=$1',[ids[1]])).rowCount,0);
  const adopted=await(await POST(req(cookies[1],{action:'adopt',id,budget:50000}))).json();
  assert.equal(adopted.userId,ids[1]);assert.deepEqual(adopted.mealIds,mealIds);assert.equal(adopted.adjusted,false);
  assert.deepEqual(adopted.conditions.owned,[]);assert.equal(adopted.conditions.avoid,'');
  assert.equal((await db.query('SELECT * FROM shopping_plans WHERE user_id=$1',[ids[0]])).rowCount,0);
  const excluded=products.find(p=>p.id===mealIds[0])!.name;
  await db.query('INSERT INTO shopping_preferences(user_id,conditions) VALUES($1,$2)',[ids[1],JSON.stringify({...initialConditions,avoid:excluded})]);
  const adjusted=await POST(req(cookies[1],{action:'adopt',id,budget:1000000}));assert.equal(adjusted.status,200);
  const adjustedBody=await adjusted.json();assert.equal(adjustedBody.adjusted,true);assert.ok(!adjustedBody.mealIds.includes(mealIds[0]));
  assert.deepEqual((await(await GET(req('',undefined,id))).json()).plan,shared.plan);
 }finally{await db.query('DELETE FROM users WHERE id=ANY($1::bigint[])',[ids]);await db.end();}
});
