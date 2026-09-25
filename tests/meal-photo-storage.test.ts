import assert from 'node:assert/strict';
import {test} from 'node:test';
import sharp from 'sharp';
import {NextRequest} from 'next/server';
import {getPool} from '../lib/db';
import {createSession,SESSION_COOKIE,type PublicUser} from '../lib/auth';
import {logPhotoFood} from '../lib/intake-log';
import {GET} from '../app/api/food-intake/photo/route';

test('diary photos are private, atomic with logs, and removed on undo or account deletion',async()=>{
 const db=getPool(),users:PublicUser[]=[];
 try{
  for(let i=0;i<2;i++)users.push((await db.query<PublicUser>("INSERT INTO users(name,email) VALUES('photo test',$1) RETURNING id::text,name,email",[`photo-${crypto.randomUUID()}@example.test`])).rows[0]);
  const cookies=await Promise.all(users.map(async user=>`${SESSION_COOKIE}=${(await createSession(user)).cookies.get(SESSION_COOKIE)!.value}`));
  const image=await sharp({create:{width:16,height:16,channels:3,background:'#fff'}}).jpeg().toBuffer();
  const id=crypto.randomUUID(),food={name:'사진 테스트',calories:600,protein:20,carbs:80,fat:20};
  assert.equal((await logPhotoFood(users[0].id,id,food,[image,image])).status,200);
  const request=(cookie:string,position=0)=>new NextRequest(`http://localhost:3000/api/food-intake/photo?id=${id}&position=${position}`,{headers:{cookie}});
  const photo=await GET(request(cookies[0],1));assert.equal(photo.status,200);assert.equal(photo.headers.get('Cache-Control'),'private, no-store');assert.deepEqual(Buffer.from(await photo.arrayBuffer()),image);
  assert.equal((await GET(request(cookies[1]))).status,404);assert.equal((await GET(request(''))).status,401);
  assert.equal((await GET(request(cookies[0],2))).status,404);
  await logPhotoFood(users[0].id,id,food,[image]);
  assert.equal((await db.query('SELECT count(*)::int n FROM food_intake_photos WHERE user_id=$1',[users[0].id])).rows[0].n,2);
  const badId=crypto.randomUUID();
  await assert.rejects(()=>logPhotoFood(users[0].id,badId,food,Array(5).fill(image)));
  assert.equal((await db.query('SELECT 1 FROM food_intake_logs WHERE user_id=$1 AND id=$2',[users[0].id,badId])).rowCount,0);
  await db.query('UPDATE food_intake_logs SET undone_at=now() WHERE user_id=$1 AND id=$2',[users[0].id,id]);
  assert.equal((await GET(request(cookies[0]))).status,404);
  assert.equal((await db.query('SELECT count(*)::int n FROM food_intake_photos WHERE user_id=$1',[users[0].id])).rows[0].n,0);
  await logPhotoFood(users[0].id,crypto.randomUUID(),food,[image]);
  await db.query('DELETE FROM users WHERE id=$1',[users[0].id]);
  assert.equal((await db.query('SELECT count(*)::int n FROM food_intake_photos WHERE user_id=$1',[users[0].id])).rows[0].n,0);
 }finally{await db.query('DELETE FROM users WHERE id=ANY($1::bigint[])',[users.map(u=>u.id)]);await db.end();}
});
