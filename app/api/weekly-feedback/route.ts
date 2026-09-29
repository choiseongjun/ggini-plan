import {shoppingBudgetLimit} from '../../../lib/shopping-plan';
import {NextRequest,NextResponse} from 'next/server';
import {sessionUser,sameOrigin,authFailure} from '../../../lib/auth';
import {getPool} from '../../../lib/db';
import {loadPlanCatalog} from '../../../lib/plan-service';
import {initialHomeConditions,parseConditions,recommendShopping,validMealIds,basketTotal,mealSchedule,slotLabels,type PlanProduct} from '../../../lib/shopping-plan';
import {servingNutrients} from '../../../lib/serving-nutrients';
import {mealTimeLocal} from '../../../lib/meal-time';
import {feedbackDates,summarizeWeek,feedbackProducts,compareWeeklyPlans,wasRepeated,type FeedbackLog} from '../../../lib/weekly-feedback';
import {dailyNutritionReference} from '../../../lib/daily-nutrition-reference';
import {parseNutritionTarget} from '../../../lib/nutrition-target';
export const runtime='nodejs';
export const maxDuration=60;
const json=(value:unknown,status=200)=>NextResponse.json(value,{status,headers:{'Cache-Control':'no-store'}});
async function context(userId:string){
 const dates=feedbackDates(mealTimeLocal().slice(0,10));
 const [logs,profile]=await Promise.all([
  getPool().query<FeedbackLog>(`SELECT product_id AS "productId",product_name AS name,meal_slot AS "mealSlot",protein::float8,sodium::float8,to_char(COALESCE(eaten_at,created_at) AT TIME ZONE 'Asia/Seoul','YYYY-MM-DD') AS date FROM food_intake_logs WHERE user_id=$1 AND undone_at IS NULL AND COALESCE(eaten_at,created_at)>=($2::date::timestamp AT TIME ZONE 'Asia/Seoul') AND COALESCE(eaten_at,created_at)<(($3::date+1)::timestamp AT TIME ZONE 'Asia/Seoul')`,[userId,dates.from,dates.to]),
  getPool().query("SELECT height::float8,weight::float8,age,sex,activity,meals,pregnancy,nutrition_target,(to_jsonb(body_profiles)->>'birth_year')::int AS birth_year FROM body_profiles WHERE user_id=$1",[userId])]);
 const row=profile.rows[0],reference=dailyNutritionReference(row),target=parseNutritionTarget(row?.nutrition_target);
 return {...dates,...summarizeWeek(logs.rows,{protein:target?Math.round(target.calories*target.proteinRatio/100/4):reference?.protein??null,sodium:reference?.sodiumReduction??null})};
}
export async function GET(request:NextRequest){try{const user=await sessionUser(request);if(!user)return authFailure('로그인이 필요해요.',401);return json(await context(user.id));}catch{return authFailure('주간 피드백을 불러오지 못했어요.',503);}}
export async function POST(request:NextRequest){
 if(!sameOrigin(request))return authFailure('요청을 확인해 주세요.',403);
 try{
  const user=await sessionUser(request);if(!user)return authFailure('로그인이 필요해요.',401);
  const [report,catalog,preferences,latest]=await Promise.all([context(user.id),loadPlanCatalog(user.id),getPool().query('SELECT conditions FROM shopping_preferences WHERE user_id=$1',[user.id]),getPool().query('SELECT conditions FROM shopping_plans WHERE user_id=$1 ORDER BY id DESC LIMIT 1',[user.id])]);
  if(!report.days)return authFailure('한 끼를 기록하면 그 내용을 참고해 다음 식단을 만들 수 있어요.',422);
  if(catalog.personalization.blocked)return authFailure('현재 신체 정보에서는 자동 맞춤 추천을 제공하지 않아요.',422);
  const previous=parseConditions(latest.rows[0]?.conditions)??parseConditions(preferences.rows[0]?.conditions)??initialHomeConditions;
  const slots=previous.slots??['dinner'];
  const conditions=parseConditions({...previous,startDate:report.nextStart,days:7,slots,meals:slots.length*7,mealCountMode:false,owned:[],supply:{},excluded:[...new Set([...(previous.excluded??[]),...catalog.excluded])]});
  if(!conditions)return authFailure('저장한 식단 조건을 확인해 주세요.',422);
  const seed=Number(report.nextStart.replaceAll('-',''));
  const baseline=recommendShopping(catalog.products,conditions,false,[],seed);
  const adjusted=feedbackProducts(catalog.products,report);
  const ids=recommendShopping(adjusted,conditions,false,[],seed);
  if(!baseline||!ids)return authFailure('현재 예산·제외 재료·끼니 구성으로 다음 주 식단을 채우지 못했어요. 홈에서 조건을 조정해 주세요.',422);
  if(!validMealIds(ids,catalog.products,conditions)||basketTotal(ids,catalog.products,[],{},conditions.people)>shoppingBudgetLimit(conditions))return authFailure('조건에 맞는 식단을 만들지 못했어요.',422);
  const map=new Map(catalog.products.map(p=>[p.id,p]));
  const before=baseline.map(id=>map.get(id)!),after=ids.map(id=>map.get(id)!);
  const comparison=compareWeeklyPlans(before,after);
  // Only selected products are returned; saving uses the existing validated adoption endpoint.
  return json({report,conditions,ids,comparison,meals:mealSchedule(conditions).map((item,i)=>({...item,slotLabel:slotLabels[item.slot],name:after[i].name,id:ids[i],product:after[i],image:after[i].productImageUrl??null,nutrition:servingNutrients(after[i])})),products:after.map((p:PlanProduct)=>({id:p.id,name:p.name})),repeatedBefore:before.filter(p=>wasRepeated(p,report.repeated)).length,repeatedAfter:after.filter(p=>wasRepeated(p,report.repeated)).length});
 }catch{return authFailure('다음 주 식단을 만들지 못했어요. 잠시 후 다시 시도해 주세요.',503);}
}
