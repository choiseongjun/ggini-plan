import test from 'node:test';
import assert from 'node:assert/strict';
import pg from 'pg';
import {readFileSync} from 'node:fs';
import {getPool} from '../lib/db';
import {reservePhotoAnalysis} from '../lib/photo-analysis-quota';
test('database quota serializes simultaneous requests and caps user/global totals',{skip:!process.env.DATABASE_URL},async()=>{
 const original=process.env.DATABASE_URL!;
 const schema=`photo_quota_test_${Date.now()}`;
 const admin=new pg.Client({connectionString:original});await admin.connect();
 try{
  await admin.query(`CREATE SCHEMA ${schema}`);
  await admin.query(`SET search_path TO ${schema}`);
  await admin.query('CREATE TABLE users(id bigint primary key); INSERT INTO users VALUES(1),(2)');
  await admin.query(readFileSync('db/photo-analysis.sql','utf8'));
  const url=new URL(original);url.searchParams.set('options',`-c search_path=${schema}`);process.env.DATABASE_URL=url.toString();
  const replies=await Promise.all([reservePhotoAnalysis('1'),reservePhotoAnalysis('1'),reservePhotoAnalysis('1')]);
  assert.equal(replies.filter(x=>x===null).length,2);assert.equal(replies.filter(x=>x?.includes('1분')).length,1);
  await admin.query("UPDATE photo_analysis_requests SET created_at=now()-interval '2 minutes'; INSERT INTO photo_analysis_requests(user_id,created_at) SELECT 1,now()-interval '2 minutes' FROM generate_series(1,3)");
  assert.match((await reservePhotoAnalysis('1'))!,/5회/);
  await admin.query("INSERT INTO photo_analysis_requests(user_id,created_at) SELECT 2,now()-interval '2 minutes' FROM generate_series(1,35)");
  await admin.query('INSERT INTO users VALUES(3)');
  assert.match((await reservePhotoAnalysis('3'))!,/서비스의 무료/);
 }finally{
  await getPool().end();process.env.DATABASE_URL=original;
  await admin.query('SET search_path TO public');await admin.query(`DROP SCHEMA ${schema} CASCADE`);await admin.end();
 }
});
