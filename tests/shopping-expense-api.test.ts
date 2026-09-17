import assert from 'node:assert/strict';
import {test} from 'node:test';
import {randomUUID} from 'node:crypto';
import {NextRequest} from 'next/server';
import {GET,PUT} from '../app/api/shopping-progress/route';
import {GET as dashboard} from '../app/api/dashboard/route';
import {createSession,SESSION_COOKIE,type PublicUser} from '../lib/auth';
import {getPool} from '../lib/db';
import {emptyDashboard} from '../lib/dashboard';
const req=(cookie:string,body?:unknown)=>new NextRequest('http://localhost:3000/api/shopping-progress?scope=products',{method:body?'PUT':'GET',headers:{Cookie:cookie,origin:'http://localhost:3000','Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});
test('purchase expenses are atomic, additive, replay-safe and independent of receiving stock',async()=>{
 const db=getPool();let user:PublicUser|undefined;
 try{
  user=(await db.query<PublicUser>("INSERT INTO users(name,email) VALUES('식비 연결 테스트',$1) RETURNING id::text,name,email",[`expense-${randomUUID()}@example.test`])).rows[0];
  const cookie=`${SESSION_COOKIE}=${(await createSession(user)).cookies.get(SESSION_COOKIE)!.value}`,date=emptyDashboard().today;
  const rice={id:'rice',name:'밥',unit:'묶음',url:null,ordered:2,owned:0};
  const expense={id:randomUUID(),date,amount:9000,action:'order',itemIds:['rice']};
  const first={stock:{rice},version:0,expense};
  await db.query("INSERT INTO daily_expenses(user_id,spent_on,category,amount) VALUES($1,$2,'food',3000)",[user.id,date]);
  assert.equal((await PUT(req('',first))).status,401);
  const responses=await Promise.all([PUT(req(cookie,first)),PUT(req(cookie,first))]);
  assert.ok(responses.every(r=>r.status===200));
  const total=async()=>Number((await db.query("SELECT amount FROM daily_expenses WHERE user_id=$1 AND spent_on=$2 AND category='food'",[user!.id,date])).rows[0].amount);
  assert.equal(await total(),12000);
  assert.equal((await PUT(req(cookie,{...first,expense:{...expense,amount:10000}}))).status,409);
  const received={rice:{...rice,ordered:0,owned:2}};
  assert.equal((await PUT(req(cookie,{stock:received,version:1}))).status,200);
  assert.equal(await total(),12000);
  assert.equal((await PUT(req(cookie,first))).status,200); // replay after receiving
  assert.deepEqual((await(await GET(req(cookie))).json()).stock,received);
  const duplicate={...expense,id:randomUUID(),action:'backfill'};
  assert.equal((await PUT(req(cookie,{stock:received,version:2,expense:duplicate}))).status,409);
  const oldStock={...received,soup:{id:'soup',name:'국',unit:'묶음',url:null,ordered:0,owned:1}};
  assert.equal((await PUT(req(cookie,{stock:oldStock,version:2}))).status,200); // already had it
  assert.equal(await total(),12000);
  const backfill={id:randomUUID(),date,amount:5000,action:'backfill',itemIds:['soup']};
  const repair={stock:oldStock,version:3,expense:backfill};
  assert.equal((await PUT(req(cookie,repair))).status,200);
  assert.equal((await PUT(req(cookie,repair))).status,200);
  assert.equal(await total(),17000);
  assert.deepEqual((await(await GET(req(cookie))).json()).stock,oldStock);
  const buy={stock:{...oldStock,rice:{...received.rice,owned:3}},version:4,expense:{...expense,id:randomUUID(),action:'buy',amount:4000}};
  assert.equal((await PUT(req(cookie,buy))).status,200);
  assert.equal(await total(),21000);
  assert.equal((await PUT(req(cookie,{...buy,expense:{...buy.expense,id:randomUUID()}}))).status,400);
  const tooMuch={stock:{...buy.stock,rice:{...buy.stock.rice,owned:4}},version:5,expense:{...expense,id:randomUUID(),action:'buy',amount:10000000}};
  assert.equal((await PUT(req(cookie,tooMuch))).status,422);
  assert.equal((await(await GET(req(cookie))).json()).version,5);
  assert.equal(await total(),21000);
  assert.equal((await db.query('SELECT id FROM shopping_expenses WHERE user_id=$1 AND id=$2',[user.id,tooMuch.expense.id])).rowCount,0);
  const data=await(await dashboard(req(cookie))).json();
  assert.equal(data.expenses.find((e:{date:string;category:string})=>e.date===date&&e.category==='food').amount,21000);
  assert.equal(data.monthlyFoodSpent,21000);
  assert.equal(data.purchases.length,3);
  assert.ok(data.purchases.some((p:{action:string;amount:number;names:string[];date:string})=>p.action==='backfill'&&p.amount===5000&&p.names[0]==='국'&&p.date===date));
  assert.ok(data.purchases.some((p:{action:string;amount:number;names:string[]})=>p.action==='order'&&p.amount===9000&&p.names[0]==='밥'));
 }finally{if(user)await db.query('DELETE FROM users WHERE id=$1',[user.id]);await db.end();}
});
