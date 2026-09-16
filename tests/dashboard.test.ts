import assert from 'node:assert/strict';
import {test} from 'node:test';
import {randomBytes} from 'node:crypto';
import {NextRequest} from 'next/server';
import {GET,PUT} from '../app/api/dashboard/route';
import {getPool} from '../lib/db';
import {createSession,SESSION_COOKIE,type PublicUser} from '../lib/auth';
import {catalogItems} from '../lib/catalog-db';
const req=(cookie='',body?:unknown)=>new NextRequest('http://localhost:3000/api/dashboard',{method:body===undefined?'GET':'PUT',headers:{Cookie:cookie,origin:'http://localhost:3000','Content-Type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)})});
test('dashboard stores real budgets/expenses, validates dates, isolates accounts and includes database-only catalog rows',async()=>{
 const db=getPool();const ids:string[]=[];const cookies:string[]=[];
 try{
  const guest=await(await GET(req())).json();assert.equal(guest.budget,null);assert.deepEqual(guest.plans,[]);assert.deepEqual(guest.expenses,[]);
  assert.equal((await PUT(req('',{action:'budget',amount:70000}))).status,401);
  for(let i=0;i<2;i++){const u=(await db.query<PublicUser>("INSERT INTO users(name,email) VALUES('DB 바인딩 테스트',$1) RETURNING id::text,name,email",[`dash-${randomBytes(8).toString('hex')}@example.test`])).rows[0];ids.push(u.id);cookies.push(`${SESSION_COOKIE}=${(await createSession(u)).cookies.get(SESSION_COOKIE)!.value}`);}
  assert.equal((await PUT(req(cookies[0],{action:'budget',amount:70000}))).status,200);
  assert.equal((await PUT(req(cookies[0],{action:'expense',date:guest.today,category:'food',amount:12500}))).status,200);
  assert.equal((await PUT(req(cookies[0],{action:'expense',date:guest.today,category:'food',amount:9000}))).status,200);
  assert.equal((await PUT(req(cookies[0],{action:'expense',date:'2026-02-30',category:'food',amount:1}))).status,400);
  assert.equal((await PUT(req(cookies[0],{action:'expense',date:guest.today,category:'unknown',amount:1}))).status,400);
  assert.equal((await PUT(req(cookies[0],{action:'monthlyBudget',amount:300000}))).status,200);
  assert.equal((await PUT(req(cookies[0],{action:'monthlyBudget',amount:0}))).status,400);
  const actual=await(await GET(req(cookies[0]))).json();assert.equal(actual.budget,70000);assert.equal(actual.monthlyBudget,300000);assert.equal(actual.monthlyFoodSpent,9000);assert.equal(actual.expenses.length,1);assert.equal(actual.expenses[0].amount,9000);
  const other=await(await GET(req(cookies[1]))).json();assert.equal(other.budget,null);assert.equal(other.monthlyBudget,null);assert.deepEqual(other.expenses,[]);
  const catalog=await catalogItems();const count=(await db.query('SELECT count(*)::int AS n FROM catalog_items')).rows[0].n;assert.equal(catalog.length,count);assert.ok(catalog.some(p=>p.category==='meal_kit'));assert.ok(catalog.every(p=>p.productUrl?.startsWith('https://')));
 }finally{await db.query('DELETE FROM users WHERE id=ANY($1::bigint[])',[ids]);await db.end();}
});
