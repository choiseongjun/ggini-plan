import assert from 'node:assert/strict';
import {test} from 'node:test';
import {randomBytes,createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import pg from 'pg';
import {NextRequest} from 'next/server';
import {POST} from '../app/api/push/device/route';
import {getPool} from '../lib/db';
import {SESSION_COOKIE,deleteSession} from '../lib/auth';
import {claimNativeDelivery} from '../lib/native-push-claim';
import {dueNativeSlots,nativeInput,parseNativeTimes} from '../lib/native-push-input';

test('Korean meal time windows and untrusted registration input',()=>{
 assert.deepEqual(dueNativeSlots({lunch:'12:00'},new Date('2026-09-25T03:00:00Z')),[{slot:'lunch',day:'2026-09-25'}]);
 assert.equal(dueNativeSlots({lunch:'12:00'},new Date('2026-09-25T02:59:00Z')).length,0);
 assert.equal(dueNativeSlots({lunch:'12:00'},new Date('2026-09-25T04:00:00Z')).length,0);
 assert.equal(parseNativeTimes({lunch:'24:00'}),null);
 assert.equal(parseNativeTimes({ad:'12:00'}),null);
 assert.equal(nativeInput({deviceId:'bad',action:'sync'}),null);
});

test('device/session lifecycle and atomic delivery claims in an isolated schema',async()=>{
 assert.ok(process.env.DATABASE_URL,'Provide a database connection; tests use only a temporary schema.');
 const base=process.env.DATABASE_URL!,schema=`ggini_push_test_${randomBytes(8).toString('hex')}`;
 const admin=new pg.Client({connectionString:base});await admin.connect();
 const url=new URL(base);url.searchParams.set('options',`-csearch_path=${schema}`);
 let pool:ReturnType<typeof getPool>|undefined;
 try{
  await admin.query(`CREATE SCHEMA "${schema}"`);
  await admin.query(`SET search_path TO "${schema}"`);
  await admin.query('CREATE TABLE users(id BIGINT PRIMARY KEY,name TEXT,email TEXT);CREATE TABLE sessions(token_hash CHAR(64) PRIMARY KEY,user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,expires_at TIMESTAMPTZ)');
  await admin.query(await readFile(new URL('../db/native-push.sql',import.meta.url),'utf8'));
  await admin.query("INSERT INTO users VALUES(1,'test one','one@example.test'),(2,'test two','two@example.test')");
  const session='test-session',hash=createHash('sha256').update(session).digest('hex');
  await admin.query("INSERT INTO sessions VALUES($1,1,NOW()+INTERVAL '1 day')",[hash]);
  process.env.DATABASE_URL=url.toString();pool=getPool();
  // Poolers may discard startup search_path options. Keep all test queries on this isolated connection.
  pool.query=admin.query.bind(admin) as typeof pool.query;
  const deviceId='a'.repeat(64),token='test-token:'.padEnd(160,'x');
  const request=(input:unknown,origin='https://gginiplan.kr',cookie=session)=>new NextRequest('https://gginiplan.kr/api/push/device',{method:'POST',headers:{origin,'content-type':'application/json',cookie:`${SESSION_COOKIE}=${cookie}`},body:JSON.stringify(input)});
  const sync={deviceId,expectedUserId:'1',action:'sync',permissionGranted:true,token};
  assert.equal((await POST(request(sync,'https://attacker.test'))).status,403);
  assert.equal((await POST(request(sync,'https://gginiplan.kr','invalid'))).status,401);
  assert.equal((await POST(request({...sync,expectedUserId:'2'}))).status,409);
  let response=await POST(request(sync));assert.equal(response.status,200);assert.equal((await response.json()).subscribed,true);
  await POST(request({...sync,action:'settings',times:{dinner:'19:00'},enabled:false}));
  response=await POST(request({...sync,token:token+'rotated'}));
  const settings=await response.json();assert.equal(settings.subscribed,false);assert.deepEqual(settings.times,{dinner:'19:00'});
  assert.equal((await pool.query('SELECT token FROM native_push_devices')).rows[0].token,token+'rotated');
  await POST(request({...sync,action:'settings',times:{lunch:'12:00'},enabled:true}));
  assert.deepEqual((await Promise.all([claimNativeDelivery(deviceId,'2026-09-25','lunch'),claimNativeDelivery(deviceId,'2026-09-25','lunch')])).sort(),[false,true]);
  await pool.query("UPDATE native_push_deliveries SET state='failed',updated_at=NOW()-INTERVAL '6 minutes'");
  assert.equal(await claimNativeDelivery(deviceId,'2026-09-25','lunch'),true);
  await pool.query("UPDATE native_push_deliveries SET state='sent'");
  assert.equal(await claimNativeDelivery(deviceId,'2026-09-25','lunch'),false);
  await deleteSession(request({}));
  assert.equal((await pool.query('SELECT session_hash FROM native_push_devices')).rows[0].session_hash,null);
  assert.equal((await POST(request(sync))).status,401);
  await pool.query('DELETE FROM users WHERE id=1');
  assert.equal((await pool.query('SELECT * FROM native_push_devices')).rowCount,0);
  assert.equal((await pool.query('SELECT * FROM native_push_deliveries')).rowCount,0);
 }finally{
  if(pool)await pool.end();process.env.DATABASE_URL=base;
  assert.match(schema,/^ggini_push_test_[a-f0-9]{16}$/);
  await admin.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);await admin.end();
 }
});
