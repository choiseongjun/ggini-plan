import {NextRequest,NextResponse} from 'next/server';
import {sessionUser,authFailure} from '../../../../../lib/auth';
import {appOrigin} from '../../../../../lib/google-auth';
import {issueMobileCode,mobileSecretValid} from '../../../../../lib/mobile-login';
export const runtime='nodejs';
export async function POST(request:NextRequest){
 try{
  if(request.headers.get('origin')!==appOrigin())return authFailure('요청을 확인해 주세요.',403);
  const user=await sessionUser(request);if(!user)return authFailure('로그인이 필요해요.',401);
  const input=await request.json().catch(()=>null);
  if(!mobileSecretValid(input?.challenge))return authFailure('앱에서 로그인을 다시 시작해 주세요.',400);
  const code=await issueMobileCode(user.id,input.challenge);
  return NextResponse.json({redirect:`gginiplan://auth?code=${code}`},{headers:{'Cache-Control':'no-store'}});
 }catch{return authFailure('앱 로그인 연결에 실패했어요. 다시 시도해 주세요.',503);}
}
