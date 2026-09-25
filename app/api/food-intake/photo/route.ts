import sharp from 'sharp';
import {NextRequest,NextResponse} from 'next/server';
import {sessionUser,sameOrigin,authFailure} from '../../../../lib/auth';
import {getPool} from '../../../../lib/db';
import {logMeal,logReference,logPhotoFood} from '../../../../lib/intake-log';
import {analyzeMealPhoto,MAX_MEAL_PHOTOS,MealPhotoError} from '../../../../lib/meal-photo-ai';
import {validatedPhoto} from '../../../../lib/nutrition-photo';
import {planProducts} from '../../../../lib/shopping-plan-catalog';
import {foodReferenceByCode} from '../../../../lib/food-reference';
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
  const id=form.get('id'),productId=form.get('productId'),referenceCode=form.get('referenceCode');
  if(typeof id!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)||(referenceCode!==null?(typeof referenceCode!=='string'||referenceCode.length>60):(productId!==null&&(typeof productId!=='string'||productId.length>100))))return authFailure('기록 요청을 확인해 주세요.',400);
  const files=form.getAll('photo');
  if(!files.length)return authFailure('사진을 선택해 주세요.',400);
  if(files.length>MAX_MEAL_PHOTOS)return authFailure(`사진은 ${MAX_MEAL_PHOTOS}장까지 올릴 수 있어요.`,400);
  let photos;try{photos=(await Promise.all(files.map(file=>validatedPhoto(file)))).filter(photo=>photo!==null);}catch(e){return authFailure(e instanceof Error?e.message:'사진을 확인해 주세요.',400);}
  const reference=typeof referenceCode==='string'?await foodReferenceByCode(referenceCode):null;
  const product=referenceCode===null&&productId!==null?(await planProducts()).find(p=>p.id===productId):null;
  if((productId!==null||referenceCode!==null)&&!product&&!reference)return authFailure('메뉴 정보를 확인할 수 없어요.',422);
  const today=(await getPool().query(`SELECT count(*)::int n FROM food_intake_logs WHERE user_id=$1 AND created_at>=(date_trunc('day',NOW() AT TIME ZONE 'Asia/Seoul') AT TIME ZONE 'Asia/Seoul')`,[user.id])).rows[0].n;
  if(today>=DAILY_LIMIT)return authFailure('오늘은 사진 기록을 충분히 했어요. 내일 다시 이용해 주세요.',429);
  let analysis;
  try{analysis=await analyzeMealPhoto({images:photos.map(photo=>photo.bytes),dishName:reference?`${reference.name} (1회 제공량 ${reference.servingAmount}${reference.servingUnit})`:product?.name??'지정 메뉴 없음',ingredients:reference?[`1인분 기준 ${reference.servingAmount}${reference.servingUnit}`]:product?.recipe?product.recipe.ingredients.map(i=>i.label):product?[product.servingNote]:[]});}
  catch(e){return authFailure(e instanceof MealPhotoError?e.message:'사진을 분석하지 못했어요.',502);}
  const diaryPhotos=analysis.match==='unclear'?[]:await Promise.all(photos.map(photo=>sharp(photo.bytes,{limitInputPixels:25_000_000}).rotate().resize({width:1024,height:1024,fit:'inside',withoutEnlargement:true}).jpeg({quality:80}).toBuffer()));
  // Different food uses its own estimated nutrition, never the planned dish values.
  if(analysis.match!=='unclear'&&analysis.food&&(analysis.match==='different'||(!product&&!reference))){
   const saved=await logPhotoFood(user.id,id,analysis.food,diaryPhotos);
   if(!saved.ok)return saved;
   return json({logged:true,...analysis,portion:1,extras:[],note:`${analysis.food.name} · 사진으로 추정한 영양정보예요. 양과 조리법에 따라 달라질 수 있어요.`,...await saved.json()});
  }
  if(!product&&!reference||analysis.match==='different'||analysis.match==='unclear')return json({logged:false,...analysis});
  // Reference photos record the selected food only; other dishes can be added separately.
  if(reference){analysis.extras=[];analysis.note='선택한 음식의 양을 추정했어요. 함께 먹은 다른 음식은 따로 기록해 주세요.';}
  const saved=reference?await logReference(user.id,{id,referenceCode,portions:analysis.portion},diaryPhotos):await logMeal(user.id,{id,productId,portions:analysis.portion,extras:analysis.extras},diaryPhotos);
  if(!saved.ok)return saved;
  return json({logged:true,...analysis,...await saved.json()});
 }catch{return authFailure('사진 기록을 저장하지 못했어요. 다시 시도해 주세요.',503);}
}

// Authenticate every read; a copied photo URL does not grant access to another account.
export async function GET(request:NextRequest){
 try{
  const user=await sessionUser(request);if(!user)return authFailure('로그인이 필요해요.',401);
  const id=request.nextUrl.searchParams.get('id'),position=request.nextUrl.searchParams.get('position')??'0';
  if(!id||!/^[0-9a-f-]{36}$/i.test(id)||! /^[0-3]$/.test(position))return new Response(null,{status:404});
  const row=(await getPool().query('SELECT p.image FROM food_intake_photos p JOIN food_intake_logs l ON l.user_id=p.user_id AND l.id=p.log_id WHERE p.user_id=$1 AND p.log_id=$2 AND p.position=$3 AND l.undone_at IS NULL',[user.id,id,Number(position)])).rows[0];
  if(!row)return new Response(null,{status:404});
  return new Response(new Uint8Array(row.image),{headers:{'Content-Type':'image/jpeg','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});
 }catch{return new Response(null,{status:503});}
}
