import {NextRequest,NextResponse} from 'next/server';
import {sameOrigin,sessionUser,authFailure} from '../../../../lib/auth';
import {validatedPhoto} from '../../../../lib/nutrition-photo';
import {analyzeMealPhoto,MealPhotoError} from '../../../../lib/meal-photo-ai';
import {getPool} from '../../../../lib/db';
export const runtime='nodejs';
export const maxDuration=60;
export async function POST(request:NextRequest){
 if(!sameOrigin(request))return authFailure('요청을 확인해 주세요.',403);
 try{
 const user=await sessionUser(request);if(!user)return authFailure('로그인 후 사진을 분석할 수 있어요.',401);
 if(Number(request.headers.get('content-length'))>9*1024*1024)return authFailure('사진은 8MB 이하로 선택해 주세요.',413);
 const form=await request.formData();if(form.get('consent')!=='yes')return authFailure('AI 사진 분석 안내를 확인해 주세요.',400);
 let photo;try{photo=await validatedPhoto(form.get('photo'));}catch(e){return authFailure((e as Error).message,400);}if(!photo)return authFailure('사진을 선택해 주세요.',400);
 const quota=await getPool().query("INSERT INTO plan_photo_usage(user_id,day,attempts) VALUES($1,(NOW() AT TIME ZONE 'Asia/Seoul')::date,1) ON CONFLICT(user_id,day) DO UPDATE SET attempts=plan_photo_usage.attempts+1 WHERE plan_photo_usage.attempts<30 RETURNING attempts",[user.id]);
 if(!quota.rowCount)return authFailure('오늘의 식단 사진 분석 횟수를 모두 사용했어요. 직접 입력은 계속 사용할 수 있어요.',429);
 const result=await analyzeMealPhoto({images:[photo.bytes],dishName:'지정 메뉴 없음',ingredients:[],purpose:'plan'});
 if(!result.food||result.match==='unclear')return authFailure('음식을 알아보지 못했어요. 다른 사진이나 직접 입력을 이용해 주세요.',422);
 return NextResponse.json({food:result.food},{headers:{'Cache-Control':'no-store'}});
 }catch(e){return authFailure(e instanceof MealPhotoError?e.message:'사진을 분석하지 못했어요. 다시 시도해 주세요.',502);}
}
