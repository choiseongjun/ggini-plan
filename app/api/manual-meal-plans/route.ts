import {parsePhotoFood} from '../../../lib/meal-photo-ai';
import {NextRequest,NextResponse} from 'next/server';
import {sessionUser,sameOrigin,authFailure} from '../../../lib/auth';
import {getPool} from '../../../lib/db';
import {validPlanDate} from '../../../lib/daily-plan';
import {validMealSlot} from '../../../lib/meal-time';
const json=(data:unknown)=>NextResponse.json(data,{headers:{'Cache-Control':'no-store'}});
const uuid=(v:unknown):v is string=>typeof v==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
export async function GET(request:NextRequest){
 try{const user=await sessionUser(request);if(!user)return authFailure('로그인이 필요해요.',401);
 const rows=await getPool().query("SELECT id,name,to_char(day,'YYYY-MM-DD') AS day,slot,nutrition,EXISTS(SELECT 1 FROM food_intake_logs l WHERE l.user_id=manual_meal_plans.user_id AND l.id=manual_meal_plans.id AND l.undone_at IS NULL) AS eaten FROM manual_meal_plans WHERE user_id=$1 ORDER BY day DESC,created_at DESC LIMIT 100",[user.id]);return json({meals:rows.rows});
 }catch{return authFailure('직접 입력한 메뉴를 불러오지 못했어요.',503);}
}
export async function POST(request:NextRequest){
 if(!sameOrigin(request))return authFailure('요청을 확인해 주세요.',403);
 try{const user=await sessionUser(request);if(!user)return authFailure('로그인하면 메뉴를 저장할 수 있어요.',401);
 const raw=await request.text();if(raw.length>2000)return authFailure('입력이 너무 길어요.',400);
 let v;try{v=JSON.parse(raw);}catch{return authFailure('입력을 확인해 주세요.',400);}
 if(!uuid(v?.id)||typeof v?.name!=='string'||!v.name.trim()||v.name.trim().length>80||!validPlanDate(v.day)||!validMealSlot(v.slot))return authFailure('메뉴 이름·날짜·끼니를 확인해 주세요.',400);
 const nutrition=v.nutrition==null?null:parsePhotoFood({...v.nutrition,name:v.name.trim()});if(v.nutrition!=null&&!nutrition)return authFailure('영양 추정치를 확인해 주세요.',400);
 await getPool().query('INSERT INTO manual_meal_plans(user_id,id,name,day,slot,nutrition) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(user_id,id) DO NOTHING',[user.id,v.id,v.name.trim(),v.day,v.slot,nutrition?JSON.stringify(nutrition):null]);return json({saved:true});
 }catch{return authFailure('메뉴를 저장하지 못했어요. 다시 시도해 주세요.',503);}
}
export async function DELETE(request:NextRequest){
 if(!sameOrigin(request))return authFailure('요청을 확인해 주세요.',403);
 try{const user=await sessionUser(request);if(!user)return authFailure('로그인이 필요해요.',401);
 const id=request.nextUrl.searchParams.get('id');if(!uuid(id))return authFailure('메뉴를 확인해 주세요.',400);
 await getPool().query('DELETE FROM manual_meal_plans WHERE user_id=$1 AND id=$2',[user.id,id]);return json({deleted:true});
 }catch{return authFailure('메뉴를 삭제하지 못했어요.',503);}
}
