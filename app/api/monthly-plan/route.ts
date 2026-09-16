import {NextRequest,NextResponse} from 'next/server';
import {sessionUser,sameOrigin,authFailure} from '../../../lib/auth';
import {getPool} from '../../../lib/db';
import {catalogItems} from '../../../lib/catalog-db';
import {parseBodyProfile} from '../../../lib/body-profile';
import {parseDiet,recommendMeals} from '../../../lib/meal-plan';
import {validMonth,makeMonth,ingredientBasket,selectedWeek,type DayPlan} from '../../../lib/monthly-plan';
export const runtime='nodejs';
const json=(v:unknown,status=200)=>NextResponse.json(v,{status,headers:{'Cache-Control':'no-store'}});
export async function GET(request:NextRequest){try{
 const user=await sessionUser(request);if(!user)return authFailure('로그인하고 식단을 저장해 주세요.',401);
 const db=getPool(),catalog=await catalogItems();
 if(request.nextUrl.searchParams.get('basket')==='1'){
  const r=await db.query(`SELECT b.month,to_char(b.start_date,'YYYY-MM-DD') AS start,b.owned,p.days FROM meal_ingredient_baskets b JOIN monthly_meal_plans p ON p.user_id=b.user_id AND p.month=b.month WHERE b.user_id=$1`,[user.id]);
  if(!r.rows[0])return json({basket:null});const row=r.rows[0],days=selectedWeek(row.days,row.start);
  return json({basket:{month:row.month,start:row.start,end:days.at(-1)?.date,owned:row.owned,items:ingredientBasket(days,catalog,row.owned)}});
 }
 const month=request.nextUrl.searchParams.get('month');if(!validMonth(month))return authFailure('월을 확인해 주세요.',400);
 const r=await db.query('SELECT days,updated_at AS "updatedAt" FROM monthly_meal_plans WHERE user_id=$1 AND month=$2',[user.id,month]);
 const budget=await db.query('SELECT amount FROM monthly_budgets WHERE user_id=$1 AND month_start=$2::date',[user.id,`${month}-01`]);
 const plan=r.rows[0];return json({plan:plan?{...plan,items:ingredientBasket(plan.days,catalog)}:null,budget:budget.rows[0]?.amount??null});
 }catch{return authFailure('월간 식단을 불러오지 못했어요.',503);}}
export async function POST(request:NextRequest){
 if(!sameOrigin(request))return authFailure('요청을 확인해 주세요.',403);
 try{
 const user=await sessionUser(request);if(!user)return authFailure('로그인이 필요해요.',401);
 let input;try{input=await request.json();}catch{return authFailure('입력을 확인해 주세요.',400);}
 const {month,action}=input??{};if(!validMonth(month))return authFailure('월을 확인해 주세요.',400);
 const db=getPool();
 if(action==='generate'){
  const r=await db.query('SELECT height::float8,weight::float8,age,sex,activity,meals,pregnancy,diet_preferences FROM body_profiles WHERE user_id=$1',[user.id]);
  const profile=parseBodyProfile(r.rows[0]),diet=parseDiet(r.rows[0]?.diet_preferences);
  if(!profile||!diet)return authFailure('마이에서 신체 정보와 식단 취향을 먼저 저장해 주세요.',422);
  const days=makeMonth(month,profile,diet,await catalogItems());if(!days)return authFailure('시간대와 제외 재료 조건에 맞는 메뉴가 부족해요. 마이에서 설정을 조정해 주세요.',422);
  if(input.replace!==true){const existing=await db.query('SELECT 1 FROM monthly_meal_plans WHERE user_id=$1 AND month=$2',[user.id,month]);if(existing.rowCount)return authFailure('이미 식단이 있어요. 다시 만들기를 선택해 주세요.',409);}
  await db.query(`INSERT INTO monthly_meal_plans(user_id,month,profile,diet,days) VALUES($1,$2,$3,$4,$5) ON CONFLICT(user_id,month) DO UPDATE SET profile=EXCLUDED.profile,diet=EXCLUDED.diet,days=EXCLUDED.days,updated_at=NOW()`,[user.id,month,JSON.stringify(profile),JSON.stringify(diet),JSON.stringify(days)]);
 }else if(action==='swap'){
  if(typeof input.date!=='string'||!input.date.startsWith(month+'-')||!Number.isInteger(input.index)||input.index<0||input.index>5)return authFailure('끼니를 확인해 주세요.',400);
  const catalog=await catalogItems(),client=await db.connect();
  try{await client.query('BEGIN');const r=await client.query('SELECT * FROM monthly_meal_plans WHERE user_id=$1 AND month=$2 FOR UPDATE',[user.id,month]);const stored=r.rows[0];
   const days:DayPlan[]=stored?.days??[],day=days.find(d=>d.date===input.date),current=day?.recommendation.meals[input.index];
   if(!current){await client.query('ROLLBACK');return authFailure('저장된 끼니를 찾을 수 없어요.',404);}
   let replacement=null;
   for(let v=0;v<30;v++){const candidate=recommendMeals(stored.profile,stored.diet,v,catalog)?.meals[input.index];if(candidate&&candidate.name!==current.name&&!day!.recommendation.meals.some((m,i)=>i!==input.index&&m.name===candidate.name)){replacement=candidate;break;}}
   if(!replacement){await client.query('ROLLBACK');return authFailure('조건에 맞는 다른 메뉴가 없어요.',422);}
   day!.recommendation.meals[input.index]=replacement;day!.recommendation.total=day!.recommendation.meals.reduce((s,m)=>s+m.kcal,0);day!.recommendation.protein=day!.recommendation.meals.reduce((s,m)=>s+m.protein,0);
   await client.query('UPDATE monthly_meal_plans SET days=$3,updated_at=NOW() WHERE user_id=$1 AND month=$2',[user.id,month,JSON.stringify(days)]);await client.query('COMMIT');
  }catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}
 }else if(action==='basket'){
  if(typeof input.start!=='string'||!/^20\d{2}-\d{2}-\d{2}$/.test(input.start)||!input.start.startsWith(month+'-'))return authFailure('기간을 확인해 주세요.',400);
  const r=await db.query('SELECT days FROM monthly_meal_plans WHERE user_id=$1 AND month=$2',[user.id,month]);if(!r.rows[0]?.days.some((d:DayPlan)=>d.date===input.start))return authFailure('식단이 있는 날짜를 선택해 주세요.',400);
  await db.query(`INSERT INTO meal_ingredient_baskets(user_id,month,start_date) VALUES($1,$2,$3) ON CONFLICT(user_id) DO UPDATE SET month=EXCLUDED.month,start_date=EXCLUDED.start_date,owned='[]'`,[user.id,month,input.start]);
 }else if(action==='owned'){
  if(!Array.isArray(input.owned)||input.owned.length>30||input.owned.some((x:unknown)=>typeof x!=='string'||x.length>30))return authFailure('보유 재료를 확인해 주세요.',400);
  await db.query('UPDATE meal_ingredient_baskets SET owned=$3 WHERE user_id=$1 AND month=$2',[user.id,month,JSON.stringify([...new Set(input.owned)])]);
 }else return authFailure('지원하지 않는 요청이에요.',400);
 return json({ok:true});
 }catch{return authFailure('식단을 저장하지 못했어요. 잠시 후 다시 시도해 주세요.',503);}
}
