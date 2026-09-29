import test from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import pg from 'pg';
import {NextRequest,NextResponse} from 'next/server';
import {getPool} from '../lib/db';
import {createSession,sessionUser,deleteSession,SESSION_COOKIE} from '../lib/auth';
import {GET} from '../app/api/admin/members/route';

test('last login is durable, only updated at session creation, and visible only to admins',async()=>{
 assert.ok(process.env.DATABASE_URL);
 const client=new pg.Client({connectionString:process.env.DATABASE_URL});await client.connect();
 const schema=`login_test_${randomBytes(8).toString('hex')}`;
 const pool=getPool(),original=pool.query,adminEmails=process.env.ADMIN_EMAILS;
 try{
  await client.query(`CREATE SCHEMA "${schema}"`);
  await client.query(`SET search_path TO "${schema}"`);
  await client.query(`CREATE TABLE users(id BIGINT PRIMARY KEY,name TEXT,email TEXT,created_at TIMESTAMPTZ DEFAULT NOW());
   CREATE TABLE sessions(token_hash CHAR(64) PRIMARY KEY,user_id BIGINT REFERENCES users(id),expires_at TIMESTAMPTZ,created_at TIMESTAMPTZ DEFAULT NOW());
   INSERT INTO users(id,name,email) VALUES(1,'Admin','admin@example.test'),(2,'Member','member@example.test');`);
  const migration=await readFile(new URL('../db/user-last-login.sql',import.meta.url),'utf8');
  await client.query(migration);await client.query(migration);
  pool.query=client.query.bind(client) as typeof pool.query;
  const user={id:'1',name:'Admin',email:'admin@example.test'};
  assert.equal((await client.query('SELECT last_login_at FROM users WHERE id=1')).rows[0].last_login_at,null);
  const response=await createSession(user),token=response.cookies.get(SESSION_COOKIE)!.value;
  const request=(cookie=token)=>new NextRequest('https://gginiplan.kr/api/admin/members',{headers:{cookie:`${SESSION_COOKIE}=${cookie}`}});
  const stamp=async()=>(await client.query('SELECT last_login_at FROM users WHERE id=1')).rows[0].last_login_at.toISOString();
  const first=await stamp();assert.ok(first);
  await sessionUser(request(),new NextResponse());assert.equal(await stamp(),first);
  process.env.ADMIN_EMAILS='admin@example.test';
  assert.equal((await GET(request('invalid'))).status,403);
  const memberSession=await createSession({id:'2',name:'Member',email:'member@example.test'});
  assert.equal((await GET(request(memberSession.cookies.get(SESSION_COOKIE)!.value))).status,403);
  const listing=await GET(request());assert.equal(listing.status,200);assert.equal(listing.headers.get('Cache-Control'),'no-store');
  assert.equal((await listing.json()).members.find((m:{id:string})=>m.id==='1').last_login_at,first);
  await deleteSession(request());assert.equal(await stamp(),first);assert.equal(await sessionUser(request()),null);
  await createSession(user);assert.ok(await stamp()>=first);
  const count=(await client.query('SELECT COUNT(*)::int AS n FROM sessions')).rows[0].n;
  await assert.rejects(createSession({...user,id:'999'}));
  assert.equal((await client.query('SELECT COUNT(*)::int AS n FROM sessions')).rows[0].n,count);
 }finally{
  pool.query=original;if(adminEmails===undefined)delete process.env.ADMIN_EMAILS;else process.env.ADMIN_EMAILS=adminEmails;
  await client.query('SET search_path TO public');
  await client.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);await client.end();await pool.end();
 }
});
