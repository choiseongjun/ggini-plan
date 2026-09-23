import {NextRequest,NextResponse} from 'next/server';
import {sessionUser,sameOrigin,authFailure} from '../../../../lib/auth';
import {getPool} from '../../../../lib/db';
import {logMeal} from '../../../../lib/intake-log';
import {analyzeMealPhoto,MAX_MEAL_PHOTOS,MealPhotoError} from '../../../../lib/meal-photo-ai';
import {validatedPhoto} from '../../../../lib/nutrition-photo';
import {planProducts} from '../../../../lib/shopping-plan-catalog';
export const runtime='nodejs';
// Catalog lookup + image re-encode + a vision call can exceed the default function limit.
export const maxDuration=60;
const json=(data:unknown,status=200)=>NextResponse.json(data,{status,headers:{'Cache-Control':'no-store'}});
// Each photo is a paid vision call; logs per day are a cheap proxy that also caps retries.
const DAILY_LIMIT=30;

// 📷 먹었어요: analyse the photo against the planned dish, then log the judged portion and visible extras.
export async function POST(request:NextRequest){
 if(!sameOrigin(request))return authFailure('요청을 확인해 주세요.',403);
 try{
  const user=await sessionUser(request);if(!user)return authFailure('로그인하면 사진으로 기록할 수 있어요.',401);
  let form:FormData;try{form=await request.formData();}catch{return authFailure('사진을 확인해 주세요.',400);}
  const id=form.get('id'),productId=form.get('productId');
  if(typeof id!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)||typeof productId!=='string'||productId.length>100)return authFailure('기록 요청을 확인해 주세요.',400);
  const files=form.getAll('photo');
  if(!files.length)return authFailure('사진을 선택해 주세요.',400);
  if(files.length>MAX_MEAL_PHOTOS)return authFailure(`사진은 ${MAX_MEAL_PHOTOS}장까지 올릴 수 있어요.`,400);
  let photos;try{photos=(await Promise.all(files.map(file=>validatedPhoto(file)))).filter(photo=>photo!==null);}catch(e){return authFailure(e instanceof Error?e.message:'사진을 확인해 주세요.',400);}
  const product=(await planProducts()).find(p=>p.id===productId);
  if(!product)return authFailure('메뉴 정보를 확인할 수 없어요.',422);
  const today=(await getPool().query(`SELECT count(*)::int n FROM food_intake_logs WHERE user_id=$1 AND created_at>=(date_trunc('day',NOW() AT TIME ZONE 'Asia/Seoul') AT TIME ZONE 'Asia/Seoul')`,[user.id])).rows[0].n;
  if(today>=DAILY_LIMIT)return authFailure('오늘은 사진 기록을 충분히 했어요. 내일 다시 이용해 주세요.',429);
  let analysis;
  try{analysis=await analyzeMealPhoto({images:photos.map(photo=>photo.bytes),dishName:product.name,ingredients:product.recipe?product.recipe.ingredients.map(i=>i.label):[product.servingNote]});}
  catch(e){return authFailure(e instanceof MealPhotoError?e.message:'사진을 분석하지 못했어요.',502);}
  // Clearly another food or an unreadable photo: don't guess — let the user decide.
  if(analysis.match==='different'||analysis.match==='unclear')return json({logged:false,...analysis});
  const saved=await logMeal(user.id,{id,productId,portions:analysis.portion,extras:analysis.extras});
  if(!saved.ok)return saved;
  return json({logged:true,...analysis,...await saved.json()});
 }catch{return authFailure('사진 기록을 저장하지 못했어요. 다시 시도해 주세요.',503);}
}
