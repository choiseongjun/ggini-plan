import {NextRequest} from 'next/server';
import {createHash} from 'node:crypto';
import {getPool} from '../../../../lib/db';
import {sessionUser,sameOrigin} from '../../../../lib/auth';
import {addDays,emptyDashboard} from '../../../../lib/dashboard';
import {estimateMealCosts,sumMealCosts,type CostMeal} from '../../../../lib/intake-cost-estimate';
export const runtime='nodejs';
export const maxDuration=60;
const json=(body:unknown,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store'}});
async function handle(request:NextRequest,generate:boolean){
 if(generate&&!sameOrigin(request))return json({error:'요청을 확인해 주세요.'},403);
 const user=await sessionUser(request);if(!user)return json({error:'로그인이 필요해요.'},401);
 const date=request.nextUrl.searchParams.get('date')??emptyDashboard().today;
 if(!/^20\d{2}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(Date.parse(date))||new Date(date).toISOString().slice(0,10)!==date)return json({error:'날짜를 확인해 주세요.'},400);
 const weekday=new Date(`${date}T00:00:00Z`).getUTCDay(),from=addDays(date,-((weekday+6)%7)),to=addDays(from,6);
 try{
  const db=getPool();
  const {rows}=await db.query<CostMeal>(`SELECT id::text,product_name AS name,portions::float8,calories::float8,cost::float8 FROM food_intake_logs WHERE user_id=$1 AND undone_at IS NULL AND created_at>=($2::date::timestamp AT TIME ZONE 'Asia/Seoul') AND created_at<(($3::date+1)::timestamp AT TIME ZONE 'Asia/Seoul') ORDER BY id`,[user.id,from,to]);
  const fingerprint=createHash('sha256').update(JSON.stringify({v:1,from,rows})).digest('hex');
  const missing=rows.filter(row=>row.cost===null);
  const cached=await db.query('SELECT result FROM intake_cost_estimates WHERE user_id=$1 AND fingerprint=$2',[user.id,fingerprint]);
  if(cached.rows[0])return json({...cached.rows[0].result,from,to});
  if(!generate||!missing.length)return json({...sumMealCosts(rows),from,to});
  if(missing.length>80)return json({error:'추정할 음식이 많아요. 이번 주 기록을 확인해 주세요.'},400);
  const client=await db.connect();
  try{
   await client.query('BEGIN');
   const lock=await client.query('SELECT pg_try_advisory_xact_lock(hashtext($1)) AS locked',[`intake-cost:${user.id}`]);
   if(!lock.rows[0].locked){await client.query('ROLLBACK');return json({error:'식비를 계산 중이에요. 잠시 후 확인해 주세요.'},409);}
   const again=await client.query('SELECT result FROM intake_cost_estimates WHERE user_id=$1 AND fingerprint=$2',[user.id,fingerprint]);
   if(again.rows[0]){await client.query('COMMIT');return json({...again.rows[0].result,from,to});}
   const result=sumMealCosts(rows,await estimateMealCosts(missing));
   await client.query('INSERT INTO intake_cost_estimates(user_id,fingerprint,result) VALUES($1,$2,$3) ON CONFLICT DO NOTHING',[user.id,fingerprint,JSON.stringify(result)]);
   await client.query('COMMIT');return json({...result,from,to});
  }catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
 }catch{return json({error:'예상 식비를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.'},503);}
}
export async function GET(request:NextRequest){return handle(request,false);}
export async function POST(request:NextRequest){return handle(request,true);}
