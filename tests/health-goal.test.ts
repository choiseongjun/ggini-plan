import {test} from 'node:test';
import assert from 'node:assert/strict';
import {NextRequest} from 'next/server';
import {GET,PUT} from '../app/api/health-goal/route';
import {getPool} from '../lib/db';

test('mode is scoped to the session, validated, and never overwrites nutrition targets',async t=>{
  process.env.DATABASE_URL='postgres://test:test@localhost:1/test';
  const pool=getPool();
  let goal:string|null=null,writes=0;
  t.mock.method(pool,'query',async(sql:string,args?:unknown[])=>{
    if(sql.startsWith('INSERT INTO health_goals')){assert.equal(args?.[0],'qa-user');goal=args?.[1] as string;writes++;return {rows:[]};}
    if(sql.startsWith('SELECT goal')){assert.equal(args?.[0],'qa-user');return {rows:goal?[{goal}]:[]};}
    assert.ok(!sql.includes('body_profiles'),'changing mode must preserve calorie/macro values');
    return {rows:[{id:'qa-user',name:'QA',email:'qa@example.test'}]};
  });
  const request=(body:unknown,auth=true,origin='http://localhost')=>new NextRequest('http://localhost/api/health-goal',{method:'PUT',headers:{origin,'content-type':'application/json',...(auth?{cookie:'kkiniplan_session=test'}:{})},body:JSON.stringify(body)});
  try{
    assert.equal((await PUT(request({goal:'lose'},false))).status,401);
    assert.equal((await PUT(request({goal:'lose'},true,'https://other.test'))).status,403);
    assert.equal((await PUT(request({goal:'invalid'}))).status,400);
    assert.equal(writes,0);
    for(const mode of ['lose','muscle','maintain']){
      assert.equal((await PUT(request({goal:mode,userId:'another-user'}))).status,200);
      const response=await GET(new NextRequest('http://localhost/api/health-goal',{headers:{cookie:'kkiniplan_session=test'}}));
      assert.equal((await response.json()).goal,mode);
    }
  }finally{await pool.end();}
});
