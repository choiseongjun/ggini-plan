import assert from 'node:assert/strict';
import {test} from 'node:test';
import {NextRequest} from 'next/server';
import {GET,POST,PATCH} from '../app/api/food-intake/route';
import {POST as photoPOST} from '../app/api/food-intake/photo/route';
import {getPool} from '../lib/db';
import {createSession,SESSION_COOKIE,type PublicUser} from '../lib/auth';
import {logPhotoFood} from '../lib/intake-log';

test('eating times save, move, sort and remain isolated without changing nutrition or creation time',async()=>{
 const db=getPool(),users:PublicUser[]=[];
 try{
  for(let i=0;i<2;i++)users.push((await db.query<PublicUser>("INSERT INTO users(name,email) VALUES('meal time test',$1) RETURNING id::text,name,email",[`meal-time-${crypto.randomUUID()}@example.test`])).rows[0]);
  const cookies=await Promise.all(users.map(async user=>`${SESSION_COOKIE}=${(await createSession(user)).cookies.get(SESSION_COOKIE)!.value}`));
  const req=(method:string,body?:unknown,query='',user=0)=>new NextRequest(`http://localhost:3000/api/food-intake${query}`,{method,headers:{cookie:cookies[user],origin:'http://localhost:3000','content-type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});
  const first=crypto.randomUUID(),second=crypto.randomUUID();
  for(const [id,eatenAt] of [[first,'2026-01-02T07:00:00+09:00'],[second,'2026-01-02T15:30:00+09:00']]){
   assert.equal((await POST(req('POST',{action:'log',id,version:0,referenceCode:'manual:프로틴',portions:1,eatenAt}))).status,200);
  }
  let day=await(await GET(req('GET',undefined,'?date=2026-01-02'))).json();
  assert.deepEqual(day.logs.map((log:{id:string})=>log.id),[first,second]);
  assert.equal(day.logs[0].eatenAt,'2026-01-01T22:00:00.000Z');
  const originalCreated=day.logs[0].createdAt;
  assert.notEqual(originalCreated,day.logs[0].eatenAt);
  assert.equal((await PATCH(req('PATCH',{id:first,version:0,eatenAt:'2026-01-01T23:00:00+09:00'},'',1))).status,404);
  assert.equal((await PATCH(req('PATCH',{id:first,version:0,eatenAt:'2026-01-01T23:00:00+09:00'}))).status,200);
  day=await(await GET(req('GET',undefined,'?date=2026-01-01'))).json();
  assert.equal(day.logs[0].id,first);assert.equal(day.logs[0].createdAt,originalCreated);assert.equal(day.logs[0].portions,1);
  assert.equal((await(await GET(req('GET',undefined,'?date=2026-01-02'))).json()).logs.length,1);
  for(const eatenAt of ['2099-01-01T00:00:00Z','2026-02-30T00:00:00Z',null])assert.equal((await PATCH(req('PATCH',{id:first,version:0,eatenAt}))).status,400);
  const photoId=crypto.randomUUID();
  assert.equal((await logPhotoFood(users[0].id,photoId,{name:'다른 음식',calories:450,protein:20,carbs:50,fat:10},[],'2026-01-02T00:10:00+09:00')).status,200);
  assert.equal((await PATCH(req('PATCH',{id:photoId,version:0,eatenAt:'2026-01-01T00:10:00+09:00'}))).status,200);
  const photo=(await(await GET(req('GET',undefined,'?date=2026-01-01'))).json()).logs.find((log:{id:string})=>log.id===photoId);
  assert.equal(photo.calories,450);assert.equal(photo.protein,20);
  const range=await(await GET(req('GET',undefined,'?from=2026-01-01&to=2026-01-02'))).json();
  assert.equal(range.logs.length,3);assert.deepEqual(range.logs.map((log:{date:string})=>log.date),['2026-01-01','2026-01-01','2026-01-02']);
  await db.query('UPDATE food_intake_logs SET eaten_at=NULL,created_at=$3 WHERE user_id=$1 AND id=$2',[users[0].id,first,'2025-12-31T23:50:00+09:00']);
  const legacy=(await(await GET(req('GET',undefined,'?date=2025-12-31'))).json()).logs[0];assert.equal(legacy.eatenAt,legacy.createdAt);
  const form=new FormData();form.set('id',crypto.randomUUID());form.set('eatenAt','2099-01-01T00:00:00Z');
  assert.equal((await photoPOST(new NextRequest('http://localhost:3000/api/food-intake/photo',{method:'POST',headers:{cookie:cookies[0],origin:'http://localhost:3000'},body:form}))).status,400);
 }finally{await db.query('DELETE FROM users WHERE id=ANY($1::bigint[])',[users.map(user=>user.id)]);await db.end();}
});
