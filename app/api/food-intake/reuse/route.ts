import {NextRequest,NextResponse} from 'next/server';
import {sessionUser,sameOrigin,authFailure} from '../../../../lib/auth';
import {getPool} from '../../../../lib/db';
import {insertEntries,savedIntake} from '../../../../lib/intake-log';
import {validPortions} from '../../../../lib/food-intake';
import {rescaleIntake} from '../../../../lib/intake-edit';
const uuid=(v:unknown):v is string=>typeof v==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
const json=(data:unknown)=>NextResponse.json(data,{headers:{'Cache-Control':'no-store'}});
export async function GET(request:NextRequest){
 try{
  const user=await sessionUser(request);if(!user)return authFailure('로그인이 필요해요.',401);
  const result=await getPool().query(`SELECT COALESCE(request_id,id)::text AS id,max(COALESCE(eaten_at,created_at)) AS date,
   json_agg(json_build_object('id',id::text,'name',product_name,'portions',portions::float8) ORDER BY id) AS items
   FROM food_intake_logs WHERE user_id=$1 AND undone_at IS NULL
   GROUP BY COALESCE(request_id,id) HAVING count(*)<=10 ORDER BY max(COALESCE(eaten_at,created_at)) DESC LIMIT 8`,[user.id]);
  return json({ownerId:String(user.id),meals:result.rows});
 }catch{return authFailure('최근 식사를 불러오지 못했어요.',503);}
}
export async function POST(request:NextRequest){
 if(!sameOrigin(request))return authFailure('요청을 확인해 주세요.',403);
 try{
  const user=await sessionUser(request);if(!user)return authFailure('로그인이 필요해요.',401);
  let input;try{input=await request.json();}catch{return authFailure('입력을 확인해 주세요.',400);}
  if(!input||!uuid(input.id))return authFailure('저장 요청을 확인해 주세요.',400);
  // Older clients omit owner. Persistent requests must not cross account changes.
  if(input.owner!==undefined&&input.owner!==String(user.id))return authFailure('기록을 시작한 계정으로 다시 로그인해 주세요.',403);
  // A committed retry must not depend on the original meal still existing.
  const prior=await savedIntake(user.id,input.id);
  if(prior)return prior.deleted?authFailure('이미 삭제한 기록이에요. 새 식사로 다시 기록해 주세요.',409):json(prior);
  if(!uuid(input.source)||!Array.isArray(input.items)||!input.items.length||input.items.length>10||!input.items.every((v:{id?:unknown;portions?:unknown})=>v&&uuid(v.id)&&validPortions(v.portions))||new Set(input.items.map((v:{id:string})=>v.id)).size!==input.items.length)return authFailure('음식과 먹은 양을 확인해 주세요.',400);
  const source=await getPool().query(`SELECT id::text,product_id,product_name,portions::float8,calories::float8,protein::float8,carbs::float8,fat::float8,sugar::float8,sodium::float8 FROM food_intake_logs WHERE user_id=$1 AND COALESCE(request_id::text,id::text)=$2 AND undone_at IS NULL`,[user.id,input.source]);
  if(input.items.some((item:{id:string})=>!source.rows.some(row=>row.id===item.id)))return authFailure('원래 식사를 찾지 못했어요. 다시 불러와 주세요.',404);
  const rows=input.items.map((item:{id:string;portions:number},i:number)=>{
   const row=source.rows.find(row=>row.id===item.id)!;
   const scale=(value:number|null)=>rescaleIntake(value,row.portions,item.portions);
   return {id:i?crypto.randomUUID():input.id,productId:row.product_id,name:row.product_name,portions:item.portions,calories:scale(row.calories),protein:scale(row.protein),carbs:scale(row.carbs),fat:scale(row.fat),sugar:scale(row.sugar),sodium:scale(row.sodium),cost:null};
  });
  // Reuse confirmed nutrient snapshots, never a client-provided nutrient value or old photo.
  return await insertEntries(user.id,input.id,rows,[],input.eatenAt,input.mealSlot);
 }catch{return authFailure('저장 결과를 확인하지 못했어요. 같은 요청으로 다시 확인해 주세요.',503);}
}
