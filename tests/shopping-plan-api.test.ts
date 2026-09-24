import assert from 'node:assert/strict';
import {test} from 'node:test';
import {randomUUID} from 'node:crypto';
import {NextRequest} from 'next/server';
import {GET,POST,PUT} from '../app/api/shopping-plan/route';
import {createSession,SESSION_COOKIE,type PublicUser} from '../lib/auth';
import {getPool} from '../lib/db';
import {initialConditions,recommendShopping} from '../lib/shopping-plan';
import {loadPlanCatalog} from '../lib/plan-service';
import {allowsExcludedFoods} from '../lib/shopping-exclusions';
const req=(cookie='',body?:unknown,saved=false)=>new NextRequest(`http://localhost:3000/api/shopping-plan${saved?'?saved=1':''}`,{method:body?'POST':'GET',headers:{Cookie:cookie,origin:'http://localhost:3000','Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});
test('guest recommendation, authenticated save, account isolation and server validation',async()=>{
 const db=getPool(),ids:string[]=[],cookies:string[]=[];
 try{
  const response=await GET(req());assert.equal(response.status,200);assert.equal((await response.json()).products,undefined);
  const {products}=await loadPlanCatalog();assert.ok(products.length>0);
  const mealIds=recommendShopping(products,initialConditions)!;assert.equal(mealIds.length,initialConditions.meals);
  const body={conditions:{...initialConditions,startDate:'2026-09-17'},mealIds};assert.equal((await POST(req('',body))).status,401);
  for(let i=0;i<2;i++){const user=(await db.query<PublicUser>("INSERT INTO users(name,email) VALUES('장보기 기능 테스트',$1) RETURNING id::text,name,email",[`planner-${randomUUID()}@example.test`])).rows[0];ids.push(user.id);cookies.push(`${SESSION_COOKIE}=${(await createSession(user)).cookies.get(SESSION_COOKIE)!.value}`);}
  assert.equal((await POST(req(cookies[0],body))).status,201);
  assert.deepEqual((await(await GET(req(cookies[0],undefined,true))).json()).plan.mealIds,mealIds);
  const homePlan=(await(await GET(req(cookies[0]))).json()).plan;
  assert.deepEqual(homePlan.mealIds,mealIds);
  assert.equal(homePlan.conditions.startDate,'2026-09-17');
  assert.equal((await(await GET(req(cookies[1]))).json()).plan,null);
  assert.equal((await(await GET(req(cookies[1],undefined,true))).json()).plan,null);
  assert.equal((await PUT(req('',{conditions:initialConditions}))).status,401);
  const preferences={...initialConditions,budget:70000,days:5,slots:['lunch','dinner'],meals:10,owned:['temporary-stock']};
  assert.equal((await PUT(req(cookies[0],{conditions:preferences}))).status,200);
  const stored=(await(await GET(req(cookies[0]))).json()).preferences;
  assert.equal(stored.budget,70000);assert.equal(stored.meals,10);assert.deepEqual(stored.slots,['lunch','dinner']);assert.deepEqual(stored.owned,[]);
  assert.equal((await(await GET(req(cookies[1]))).json()).preferences,null);
  assert.equal((await PUT(req(cookies[0],{conditions:{...preferences,slots:[]}}))).status,400);
  assert.equal((await POST(req(cookies[0],{...body,mealIds:['fake',...mealIds.slice(1)]}))).status,409);
  assert.equal((await POST(req(cookies[0],{...body,conditions:{...initialConditions,budget:1000}}))).status,409);
  await db.query(`INSERT INTO body_profiles(user_id,height,weight,age,sex,activity,meals,pregnancy,diet_preferences) VALUES($1,165,60,28,'female','light',3,false,$2)`,[ids[0],JSON.stringify({style:'balanced',fasting:'none',start:8,excluded:['shrimp']})]);
  const personalized=await(await GET(req(cookies[0]))).json();
  assert.equal(personalized.personalization.hasProfile,true);
  assert.deepEqual(personalized.personalization.excluded,['새우']);
  assert.deepEqual(personalized.excluded,['shrimp']);
  const restoredProduct=(await loadPlanCatalog(ids[0])).products.find(p=>!allowsExcludedFoods(p,['shrimp'])&&!/시리얼|그래놀라/.test(p.name));
  assert.ok(restoredProduct);
  const cleared={...initialConditions,budget:200000,days:1,meals:1,excluded:[]};
  assert.equal((await POST(req(cookies[0],{conditions:cleared,mealIds:[restoredProduct.id]}))).status,201);
  assert.equal((await POST(req(cookies[0],{conditions:{...cleared,excluded:['shrimp']},mealIds:[restoredProduct.id]}))).status,409);
  assert.equal((await POST(req(cookies[0],{conditions:{...cleared,excluded:['invalid']},mealIds:[restoredProduct.id]}))).status,400);
  assert.deepEqual((await(await GET(req(cookies[0],undefined,true))).json()).plan.conditions.excluded,[]);
  // A per-plan choice must not silently clear the profile's default exclusions.
  assert.deepEqual((await(await GET(req(cookies[0]))).json()).excluded,['shrimp']);
  const previousCalories=personalized.personalization.dailyCalories;
  await db.query('UPDATE body_profiles SET weight=80 WHERE user_id=$1',[ids[0]]);
  assert.ok((await(await GET(req(cookies[0]))).json()).personalization.dailyCalories>previousCalories);
  assert.equal((await(await GET(req(cookies[1]))).json()).personalization.hasProfile,false);
 }finally{await db.query('DELETE FROM users WHERE id=ANY($1::bigint[])',[ids]);await db.end();}
});
