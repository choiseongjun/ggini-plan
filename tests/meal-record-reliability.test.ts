import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync} from 'node:fs';
import {Pool} from 'pg';
import {NextRequest} from 'next/server';
import {mealGroups,mealSlotLabels} from '../lib/meal-time';
import {logPhotoFood,savedIntake} from '../lib/intake-log';
import {createSession,SESSION_COOKIE} from '../lib/auth';
import {GET as intakeGET,PATCH as intakePATCH} from '../app/api/food-intake/route';
import {POST as photoPOST} from '../app/api/food-intake/photo/route';

test('explicit meal categories override clocks and keep snacks distinct',()=>{
 const logs=[{createdAt:'2026-01-01T11:00:00Z',mealSlot:'breakfast' as const},{createdAt:'2026-01-01T11:00:00Z',mealSlot:'snack' as const}];
 assert.deepEqual(mealGroups(logs).map(group=>group.period),[mealSlotLabels.breakfast,mealSlotLabels.snack]);
 assert.equal(mealGroups([{createdAt:'2026-01-01T03:00:00Z'}])[0].period,'점심');
});

test('photo retries return stored nutrition and IDs without another photo analysis or duplicate record',async()=>{
 // Temporary tables shadow public tables on this single dedicated connection.
 const pool=new Pool({connectionString:process.env.DATABASE_URL,max:1});
 const globalDb=globalThis as typeof globalThis & {kkiniplanPool?:Pool;kkiniplanDatabaseUrl?:string};
 globalDb.kkiniplanPool=pool;globalDb.kkiniplanDatabaseUrl=process.env.DATABASE_URL;
 try{
  const sources=await pool.query("SELECT c.relname,n.nspname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE c.oid IN ('users'::regclass,'sessions'::regclass,'food_intake_logs'::regclass,'food_intake_photos'::regclass,'shopping_progress'::regclass)");
  for(const row of sources.rows){const schema='\"'+row.nspname.replaceAll('\"','\"\"')+'\"';await pool.query(`CREATE TEMP TABLE ${row.relname} (LIKE ${schema}.${row.relname} INCLUDING DEFAULTS INCLUDING CONSTRAINTS INCLUDING INDEXES)`);}
  await pool.query(readFileSync('db/food-intake-meal-slot.sql','utf8').split('CREATE INDEX')[0]);
  const user={id:'987654321',name:'temporary',email:'temporary@example.test'};
  await pool.query('INSERT INTO users(id,name,email) VALUES($1,$2,$3)',[user.id,user.name,user.email]);
  const cookie=(await createSession(user)).cookies.get(SESSION_COOKIE)!;
  const id=crypto.randomUUID(),food={name:'테스트 식사',calories:500,protein:25,carbs:50,fat:20,sugar:4,sodium:700};
  const time='2026-01-01T10:00:00Z';
  const responses=await Promise.all([logPhotoFood(user.id,id,food,[],time,'snack'),logPhotoFood(user.id,id,food,[],time,'snack')]);
  const records=await Promise.all(responses.map(r=>r.json()));
  assert.deepEqual(records[0].ids,[id]);assert.deepEqual(records[1].ids,[id]);
  assert.equal(records[0].mealSlot,'snack');assert.equal(records[1].nutrition.sugar,4);
  assert.equal((await pool.query('SELECT count(*)::int n FROM food_intake_logs')).rows[0].n,1);
  const form=new FormData();form.set('id',id);
  const request=()=>new NextRequest('http://localhost:3000/api/food-intake/photo',{method:'POST',headers:{cookie:`${SESSION_COOKIE}=${cookie.value}`,origin:'http://localhost:3000'},body:form});
  // No images supplied: replay must finish before image validation or a paid AI call.
  const replay=await photoPOST(request());assert.equal(replay.status,200);
  const data=await replay.json();assert.equal(data.logged,true);assert.equal(data.replayed,true);assert.deepEqual(data.ids,[id]);
  assert.equal(data.nutrition.protein,25);
  const headers={cookie:`${SESSION_COOKIE}=${cookie.value}`,origin:'http://localhost:3000','content-type':'application/json'};
  const range=await intakeGET(new NextRequest('http://localhost:3000/api/food-intake?from=2026-01-01&to=2026-01-01',{headers}));
  assert.equal((await range.json()).logs[0].mealSlot,'snack');
  const edit=await intakePATCH(new NextRequest('http://localhost:3000/api/food-intake',{method:'PATCH',headers,body:JSON.stringify({id,version:0,mealSlot:'breakfast'})}));
  assert.equal(edit.status,200);
  assert.equal((await savedIntake(user.id,id))?.mealSlot,'breakfast');

  assert.equal(await savedIntake('987654322',id),null);
  assert.equal((await logPhotoFood(user.id,crypto.randomUUID(),food,[],time,'invalid')).status,400);
  await pool.query('UPDATE food_intake_logs SET undone_at=NOW() WHERE id=$1',[id]);
  assert.equal((await photoPOST(request())).status,409);
 }finally{await pool.end();delete globalDb.kkiniplanPool;delete globalDb.kkiniplanDatabaseUrl;}
});
