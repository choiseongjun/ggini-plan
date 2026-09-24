import {NextRequest,NextResponse} from 'next/server';
import {sessionUser,sameOrigin,authFailure} from '../../../lib/auth';
import {getPool} from '../../../lib/db';
import {DEFAULT_MEAL_TIMES,parseMealTimes} from '../../../lib/meal-push';
export const runtime='nodejs';
const json=(data:unknown,status=200)=>NextResponse.json(data,{status,headers:{'Cache-Control':'no-store'}});

// 이 기기의 식사 알림 구독 상태·시간. 기기(브라우저)마다 endpoint가 달라서 endpoint로 구분한다.
export async function GET(request:NextRequest){
 try{
  const user=await sessionUser(request);if(!user)return authFailure('로그인이 필요해요.',401);
  const endpoint=request.nextUrl.searchParams.get('endpoint');
  const row=endpoint?(await getPool().query('SELECT times FROM push_subscriptions WHERE endpoint=$1 AND user_id=$2',[endpoint,user.id])).rows[0]:null;
  return json({subscribed:Boolean(row),times:row?.times??DEFAULT_MEAL_TIMES,publicKey:process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY??null});
 }catch{return authFailure('알림 설정을 불러오지 못했어요.',503);}
}

export async function POST(request:NextRequest){
 if(!sameOrigin(request))return authFailure('요청을 확인해 주세요.',403);
 try{
  const user=await sessionUser(request);if(!user)return authFailure('로그인이 필요해요.',401);
  let input;try{input=await request.json();}catch{return authFailure('입력을 확인해 주세요.',400);}
  const sub=input?.subscription,times=parseMealTimes(input?.times);
  if(!sub||typeof sub.endpoint!=='string'||!/^https:\/\//.test(sub.endpoint)||sub.endpoint.length>1000||typeof sub.keys?.p256dh!=='string'||typeof sub.keys?.auth!=='string'||!times)return authFailure('알림 구독 정보를 확인해 주세요.',400);
  // 시간을 바꾸면 오늘 발송 기록도 지워, 바꾼 시간에 다시 받을 수 있게 한다.
  await getPool().query(`INSERT INTO push_subscriptions(endpoint,user_id,keys,times) VALUES($1,$2,$3,$4)
   ON CONFLICT(endpoint) DO UPDATE SET user_id=EXCLUDED.user_id,keys=EXCLUDED.keys,times=EXCLUDED.times,sent='{}'::jsonb,updated_at=NOW()`,
   [sub.endpoint,user.id,JSON.stringify({p256dh:sub.keys.p256dh,auth:sub.keys.auth}),JSON.stringify(times)]);
  return json({subscribed:true,times});
 }catch{return authFailure('알림을 켜지 못했어요.',503);}
}

export async function DELETE(request:NextRequest){
 if(!sameOrigin(request))return authFailure('요청을 확인해 주세요.',403);
 try{
  const user=await sessionUser(request);if(!user)return authFailure('로그인이 필요해요.',401);
  const endpoint=request.nextUrl.searchParams.get('endpoint');if(!endpoint)return authFailure('기기를 확인해 주세요.',400);
  await getPool().query('DELETE FROM push_subscriptions WHERE endpoint=$1 AND user_id=$2',[endpoint,user.id]);
  return json({subscribed:false});
 }catch{return authFailure('알림을 끄지 못했어요.',503);}
}
