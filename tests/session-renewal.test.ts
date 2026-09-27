import assert from 'node:assert/strict';
import {test} from 'node:test';
import {NextRequest} from 'next/server';
import {getPool} from '../lib/db';
import {createSession,deleteSession,SESSION_COOKIE,type PublicUser} from '../lib/auth';
import {GET} from '../app/api/auth/me/route';

test('active sessions renew both cookie and database; expired and logged-out sessions stay invalid',async()=>{
 const db=getPool();let user:PublicUser|undefined;
 try{
  user=(await db.query<PublicUser>("INSERT INTO users(name,email) VALUES('session test',$1) RETURNING id::text,name,email",[`session-${crypto.randomUUID()}@example.test`])).rows[0];
  const initial=await createSession(user);
  const cookie=initial.cookies.get(SESSION_COOKIE)!;
  assert.equal(cookie.maxAge,365*86400);
  const request=new NextRequest('http://localhost:3000/api/auth/me',{headers:{cookie:`${SESSION_COOKIE}=${cookie.value}`}});
  await db.query("UPDATE sessions SET expires_at=NOW()+INTERVAL '1 minute' WHERE user_id=$1",[user.id]);
  const refreshed=await GET(request);
  assert.equal((await refreshed.json()).user.id,user.id);
  assert.equal(refreshed.cookies.get(SESSION_COOKIE)?.maxAge,365*86400);
  assert.equal(refreshed.cookies.get(SESSION_COOKIE)?.httpOnly,true);
  assert.equal(refreshed.headers.get('Cache-Control'),'no-store');
  const remaining=await db.query("SELECT expires_at>NOW()+INTERVAL '364 days' AS renewed FROM sessions WHERE user_id=$1",[user.id]);
  assert.equal(remaining.rows[0].renewed,true);
  await db.query("UPDATE sessions SET expires_at=NOW()-INTERVAL '1 minute' WHERE user_id=$1",[user.id]);
  const expired=await GET(request);
  assert.equal((await expired.json()).user,null);
  assert.equal(expired.cookies.get(SESSION_COOKIE),undefined);
  await deleteSession(request);
  const revoked=await GET(request);
  assert.equal((await revoked.json()).user,null);
  assert.equal(revoked.cookies.get(SESSION_COOKIE),undefined);
 }finally{
  if(user)await db.query('DELETE FROM users WHERE id=$1',[user.id]);
  await db.end();
 }
});
