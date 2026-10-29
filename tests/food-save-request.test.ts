import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID,randomBytes,createHash} from 'node:crypto';
import {NextRequest} from 'next/server';
import {getPool} from '../lib/db';
import {GET,POST} from '../app/api/saved-foods/route';
import {GET as listRequests,POST as requestFood} from '../app/api/submissions/route';
import {PUT as reviewFood} from '../app/api/admin/submissions/route';
import {GET as photo} from '../app/api/submissions/photo/route';
import {emptySubmission,validateSubmission} from '../lib/submissions';
test('food request needs only a name, rejects unsafe links',()=>{
 assert.equal(validateSubmission({...emptySubmission,kind:'food',name:'음식'}).kind,'food');
 assert.throws(()=>validateSubmission({...emptySubmission,kind:'food',name:'음식',productUrl:'javascript:alert(1)'}));
});
test('saved menus isolate accounts, remain outside intake, and food requests stay private after approval',async()=>{
 const db=getPool(),ids:string[]=[],cookies:string[]=[],before=process.env.ADMIN_EMAILS;
 const req=(path:string,who=-1,body?:unknown)=>new NextRequest('http://localhost:3000'+path,{method:body?'POST':'GET',headers:{...(who>=0?{cookie:cookies[who]}:{}),...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});
 try{
  const schema=(await db.query('SELECT current_schema() AS s')).rows[0].s;assert.equal(schema,'kkiniplan');
  for(let i=0;i<2;i++){const email=`food-choice-${randomUUID()}@example.test`;const u=(await db.query("INSERT INTO users(name,email) VALUES('기능 검증 전용',$1) RETURNING id::text",[email])).rows[0];ids.push(u.id);const token=randomBytes(32).toString('hex');cookies.push(`kkiniplan_session=${token}`);await db.query("INSERT INTO sessions(token_hash,user_id,expires_at) VALUES($1,$2,NOW()+INTERVAL '1 hour')",[createHash('sha256').update(token).digest('hex'),u.id]);if(i===1)process.env.ADMIN_EMAILS=email;}
  const code=(await db.query('SELECT food_code FROM food_pages LIMIT 1')).rows[0].food_code;
  assert.equal((await POST(req('/api/saved-foods',-1,{code,action:'save'}))).status,401);
  for(let i=0;i<2;i++)assert.equal((await POST(req('/api/saved-foods',0,{code,action:'save'}))).status,200);
  assert.equal((await (await GET(req('/api/saved-foods',0))).json()).items.length,1);
  assert.equal((await (await GET(req('/api/saved-foods',1))).json()).items.length,0);
  await POST(req('/api/saved-foods',1,{code,action:'remove'}));
  assert.equal((await (await GET(req('/api/saved-foods',0))).json()).items.length,1);
  assert.equal((await db.query('SELECT count(*)::int AS n FROM food_intake_logs WHERE user_id=$1',[ids[0]])).rows[0].n,0);
  const payload={...emptySubmission,kind:'food',name:'검증 전용 음식',foodCode:code};const form=new FormData();form.set('payload',JSON.stringify(payload));
  const response=await requestFood(new NextRequest('http://localhost:3000/api/submissions',{method:'POST',headers:{cookie:cookies[0]},body:form}));assert.equal(response.status,201);const id=(await response.json()).id;
  const item=(await (await listRequests(req('/api/submissions?mine=1',0))).json()).items.find((x:{id:string})=>x.id===id);assert.equal(item.payload.foodCode,'');
  const review=async(foodCode:string)=>reviewFood(new NextRequest('http://localhost:3000/api/admin/submissions',{method:'PUT',headers:{cookie:cookies[1],'Content-Type':'application/json'},body:JSON.stringify({id,version:1,status:'approved',payload:{...payload,foodCode}})}));
  assert.equal((await review('missing-code')).status,400);assert.equal((await review(code)).status,200);
  assert.ok(!(await (await listRequests(req('/api/submissions'))).json()).items.some((x:{id:string})=>x.id===id));
  await db.query("UPDATE submissions SET photo_path='private-fixture' WHERE id=$1",[id]);
  assert.equal((await photo(req(`/api/submissions/photo?id=${id}`))).status,404);
  assert.equal((await POST(req('/api/saved-foods',0,{code,action:'remove'}))).status,200);
  assert.equal((await (await GET(req('/api/saved-foods',0))).json()).items.length,0);
 }finally{if(before===undefined)delete process.env.ADMIN_EMAILS;else process.env.ADMIN_EMAILS=before;await db.query('DELETE FROM users WHERE id=ANY($1::bigint[])',[ids]);await db.end();}
});
