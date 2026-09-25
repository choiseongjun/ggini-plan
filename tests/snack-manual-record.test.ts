import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {NextRequest} from 'next/server';
import {POST,GET} from '../app/api/food-intake/route';
import {GET as recentGET} from '../app/api/food-reference/route';
import {createSession,SESSION_COOKIE,type PublicUser} from '../lib/auth';
import {getPool} from '../lib/db';
test('manual cola can be saved and immediately read in records and recents',async()=>{
 const db=getPool();let userId:string|undefined;
 try{
  const user=(await db.query<PublicUser>('INSERT INTO users(name,email) VALUES($1,$2) RETURNING id::text,name,email',['간식 테스트',`snack-${randomUUID()}@example.test`])).rows[0];userId=user.id;
  const session=await createSession(user);
  const headers={cookie:`${SESSION_COOKIE}=${session.cookies.get(SESSION_COOKIE)!.value}`,origin:'http://localhost:3000','Content-Type':'application/json'};
  const response=await POST(new NextRequest('http://localhost:3000/api/food-intake',{method:'POST',headers,body:JSON.stringify({action:'log',id:randomUUID(),version:0,referenceCode:'manual:콜라',portions:1})}));
  assert.equal(response.status,200);
  const recent=await (await recentGET(new NextRequest('http://localhost:3000/api/food-reference?recent=1',{headers}))).json();
  assert.equal(recent.items[0].name,'콜라');assert.equal(recent.items[0].kcal,null);
  const records=await (await GET(new NextRequest('http://localhost:3000/api/food-intake',{headers}))).json();
  assert.ok(records.logs.some((log:{productId:string})=>log.productId==='ref:manual:콜라'));
 }finally{if(userId)await db.query('DELETE FROM users WHERE id=$1',[userId]);await db.end();}
});
