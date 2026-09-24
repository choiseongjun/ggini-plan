import {NextRequest,NextResponse} from 'next/server';
import {sessionUser,sameOrigin,authFailure} from '../../../../lib/auth';
import {sendTestReminder} from '../../../../lib/meal-push';
export const runtime='nodejs';

// 이 기기로 테스트 알림 한 번 보내기(알림 설정 화면의 버튼).
export async function POST(request:NextRequest){
 if(!sameOrigin(request))return authFailure('요청을 확인해 주세요.',403);
 try{
  const user=await sessionUser(request);if(!user)return authFailure('로그인이 필요해요.',401);
  let input;try{input=await request.json();}catch{return authFailure('입력을 확인해 주세요.',400);}
  if(typeof input?.endpoint!=='string'||input.endpoint.length>1000)return authFailure('기기를 확인해 주세요.',400);
  const result=await sendTestReminder(user.id,input.endpoint);
  return result.ok?NextResponse.json(result,{headers:{'Cache-Control':'no-store'}}):authFailure(result.error??'보내지 못했어요.',409);
 }catch{return authFailure('테스트 알림을 보내지 못했어요.',503);}
}
