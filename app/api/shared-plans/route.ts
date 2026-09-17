import {NextRequest,NextResponse} from 'next/server';
import {randomUUID,createHash} from 'node:crypto';
import {sessionUser,sameOrigin,authFailure} from '../../../lib/auth';
import {getPool} from '../../../lib/db';
import {planProducts} from '../../../lib/shopping-plan-catalog';
import {sharedPlanSnapshot,validShareId,type SharedPlan} from '../../../lib/shared-plan';
import {initialConditions,parseConditions,validMealIds,basketTotal,recommendShopping} from '../../../lib/shopping-plan';
import {personalizeProducts} from '../../../lib/shopping-personalization';
import {parseStock} from '../../../lib/shopping-progress';
import {emptyDashboard} from '../../../lib/dashboard';
export const runtime='nodejs';
const json=(data:unknown,status=200)=>NextResponse.json(data,{status,headers:{'Cache-Control':'no-store','X-Robots-Tag':'noindex, nofollow'}});
export async function GET(request:NextRequest){
 const id=request.nextUrl.searchParams.get('id');
 if(!validShareId(id))return authFailure('공유 식단을 찾을 수 없어요.',404);
 try{
  const row=(await getPool().query('SELECT snapshot FROM shared_shopping_plans WHERE id=$1',[id])).rows[0];
  return row?json({plan:row.snapshot}):authFailure('공유 식단을 찾을 수 없어요.',404);
 }catch{return authFailure('공유 식단을 불러오지 못했어요. 다시 시도해 주세요.',503);}
}
export async function POST(request:NextRequest){
 if(!sameOrigin(request))return authFailure('요청을 확인해 주세요.',403);
 try{
  const user=await sessionUser(request);if(!user)return authFailure('로그인하면 식단을 공유하거나 가져올 수 있어요.',401);
  let input;try{input=await request.json();}catch{return authFailure('입력을 확인해 주세요.',400);}
  if(input?.action==='adopt'){
   if(!validShareId(input.id)||!Number.isSafeInteger(input.budget)||input.budget<1000||input.budget>1000000)return authFailure('식단과 예산을 확인해 주세요.',400);
   const row=(await getPool().query('SELECT snapshot FROM shared_shopping_plans WHERE id=$1',[input.id])).rows[0];
   if(!row)return authFailure('공유 식단을 찾을 수 없어요.',404);
   const shared=row.snapshot as SharedPlan;
   const [profile,preferences,progress,catalog]=await Promise.all([
    getPool().query('SELECT height::float8,weight::float8,age,sex,activity,meals,pregnancy,diet_preferences FROM body_profiles WHERE user_id=$1',[user.id]),
    getPool().query('SELECT conditions FROM shopping_preferences WHERE user_id=$1',[user.id]),
    getPool().query("SELECT stock FROM shopping_progress WHERE user_id=$1 AND scope='products'",[user.id]),planProducts(),
   ]);
   const body=profile.rows[0],personalized=personalizeProducts(catalog,body,body?.diet_preferences);
   if(personalized.personalization.blocked)return authFailure('현재 신체 정보에서는 자동 맞춤 추천을 제공하지 않아요.',422);
   const stock=parseStock(progress.rows[0]?.stock??{})??{};
   const conditions=parseConditions({...initialConditions,...parseConditions(preferences.rows[0]?.conditions),budget:input.budget,days:shared.days,slots:shared.slots,meals:shared.days*shared.slots.length,owned:[],supply:Object.fromEntries(Object.values(stock).map(i=>[i.id,i.owned+i.ordered])),startDate:emptyDashboard().today});
   if(!conditions)return authFailure('식단 조건을 확인해 주세요.',400);
   const original=shared.meals.map(m=>m.productId),products=personalized.products;
   const same=validMealIds(original,products,conditions)&&basketTotal(original,products,[],conditions.supply)<=conditions.budget;
   const mealIds=same?original:recommendShopping(products,conditions);
   if(!mealIds)return authFailure('내 예산·제외 재료 조건에 맞는 식단을 만들지 못했어요. 예산을 조정하거나 마이에서 취향을 확인해 주세요.',422);
   await getPool().query('INSERT INTO shopping_plans(user_id,conditions,meal_ids) VALUES($1,$2,$3)',[user.id,JSON.stringify(conditions),JSON.stringify(mealIds)]);
   return json({userId:user.id,conditions,mealIds,adjusted:!same});
  }
  if(input?.action!=='share')return authFailure('요청을 확인해 주세요.',400);
  const snapshot=sharedPlanSnapshot(input.conditions,input.mealIds,await planProducts());
  if(!snapshot)return authFailure('상품 정보가 변경됐어요. 추천 식단을 다시 확인해 주세요.',400);
  const encoded=JSON.stringify(snapshot),fingerprint=createHash('sha256').update(encoded).digest('hex');
  const result=await getPool().query('INSERT INTO shared_shopping_plans(id,user_id,fingerprint,snapshot) VALUES($1,$2,$3,$4) ON CONFLICT(user_id,fingerprint) DO UPDATE SET fingerprint=EXCLUDED.fingerprint RETURNING id',[randomUUID(),user.id,fingerprint,encoded]);
  return json({path:`/share/${result.rows[0].id}`},201);
 }catch{return authFailure('식단을 저장하지 못했어요. 잠시 후 다시 시도해 주세요.',503);}
}
