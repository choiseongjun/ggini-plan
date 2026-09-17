import assert from 'node:assert/strict';
import {test} from 'node:test';
import {randomUUID} from 'node:crypto';
import {NextRequest} from 'next/server';
import {POST} from '../app/api/reset-data/route';
import {GET as getPlan} from '../app/api/shopping-plan/route';
import {PUT as updateStock} from '../app/api/shopping-progress/route';
import {sessionUser,createSession,SESSION_COOKIE,type PublicUser} from '../lib/auth';
import {getPool} from '../lib/db';
import {initialConditions} from '../lib/shopping-plan';
const req=(cookie:string,body:unknown,origin='http://localhost:3000')=>new NextRequest('http://localhost:3000/api/reset-data',{method:'POST',headers:{Cookie:cookie,origin,'Content-Type':'application/json'},body:JSON.stringify(body)});
test('explicit reset clears personal records and links, preserves login and other accounts, rejects stale stock writes',async()=>{
 const db=getPool(),users:PublicUser[]=[],cookies:string[]=[];
 try{
  for(let i=0;i<2;i++){
   const user=(await db.query<PublicUser>("INSERT INTO users(name,email) VALUES('초기화 테스트',$1) RETURNING id::text,name,email",[`reset-${randomUUID()}@example.test`])).rows[0];users.push(user);cookies.push(`${SESSION_COOKIE}=${(await createSession(user)).cookies.get(SESSION_COOKIE)!.value}`);
   await db.query("INSERT INTO shopping_progress(user_id,scope,stock,version) VALUES($1,'products',$2,4)",[user.id,JSON.stringify({rice:{id:'rice',name:'밥',unit:'묶음',url:null,owned:1,ordered:2}})]);
   await db.query('INSERT INTO shopping_plans(user_id,conditions,meal_ids) VALUES($1,$2,\'["rice"]\')',[user.id,JSON.stringify(initialConditions)]);
   await db.query('INSERT INTO shopping_preferences(user_id,conditions) VALUES($1,$2)',[user.id,JSON.stringify(initialConditions)]);
   await db.query("INSERT INTO daily_expenses(user_id,spent_on,category,amount) VALUES($1,CURRENT_DATE,'food',10000)",[user.id]);
   await db.query("INSERT INTO body_profiles(user_id,height,weight,age,sex,activity,meals,pregnancy) VALUES($1,170,65,30,'male','light',3,false)",[user.id]);
   await db.query('INSERT INTO shared_shopping_plans(id,user_id,fingerprint,snapshot) VALUES($1,$2,$3,\'{}\')',[randomUUID(),user.id,randomUUID()]);
   await db.query("INSERT INTO food_intake_logs(user_id,id,product_id,product_name,portions,packs,stock_item,cost) VALUES($1,$2,'rice','밥',1,1,'{}',5000)",[user.id,randomUUID()]);
   await db.query("INSERT INTO shopping_expenses(user_id,id,scope,payload) VALUES($1,$2,'products','{}')",[user.id,randomUUID()]);
  }
  const payload={userId:users[0].id,confirmation:'전체 초기화'};
  assert.equal((await POST(req('',payload))).status,401);
  assert.equal((await POST(req(cookies[0],payload,'https://other.example'))).status,403);
  assert.equal((await POST(req(cookies[0],{...payload,userId:users[1].id}))).status,400);
  assert.equal((await POST(req(cookies[0],{...payload,confirmation:''}))).status,400);
  assert.equal((await POST(req(cookies[0],payload))).status,200);
  for(const table of ['food_intake_logs','shopping_expenses','shopping_plans','shopping_preferences','body_profiles','daily_expenses','shared_shopping_plans']){
   assert.equal((await db.query(`SELECT count(*)::int AS n FROM ${table} WHERE user_id=$1`,[users[0].id])).rows[0].n,0);
   assert.equal((await db.query(`SELECT count(*)::int AS n FROM ${table} WHERE user_id=$1`,[users[1].id])).rows[0].n,1);
  }
  assert.equal((await sessionUser(req(cookies[0],payload)))?.id,users[0].id);
  const stock=(await db.query("SELECT stock,version FROM shopping_progress WHERE user_id=$1 AND scope='products'",[users[0].id])).rows[0];assert.deepEqual(stock.stock,{});assert.equal(stock.version,5);
  const stale=new NextRequest('http://localhost:3000/api/shopping-progress?scope=products',{method:'PUT',headers:{Cookie:cookies[0],origin:'http://localhost:3000','Content-Type':'application/json'},body:JSON.stringify({stock:{},version:4})});
  assert.equal((await updateStock(stale)).status,409);
  const plan=await(await getPlan(new NextRequest('http://localhost:3000/api/shopping-plan',{headers:{Cookie:cookies[0]}}))).json();assert.equal(plan.plan,null);assert.equal(plan.preferences,null);assert.ok(plan.resetAt);assert.deepEqual(plan.excluded,[]);
 }finally{await db.query('DELETE FROM users WHERE id=ANY($1::bigint[])',[users.map(u=>u.id)]);await db.end();}
});
