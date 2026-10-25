import {NextRequest,NextResponse} from 'next/server';
import {appOrigin} from '../../../../lib/google-auth';
import {authFailure} from '../../../../lib/auth';
import {beginKakaoLogin,KakaoAuthError,KAKAO_COOKIE,KAKAO_PATH} from '../../../../lib/kakao-auth';
import {kakaoAuthErrors} from '../../../../lib/auth-messages';
export const runtime='nodejs';
export async function POST(request:NextRequest){
 try{
  const origin=appOrigin();
  if(request.headers.get('origin')!==origin||request.nextUrl.origin!==origin)return authFailure('로그인을 시작한 주소를 확인해 주세요.',403);
  const input=await request.json().catch(()=>null);
  if(!input||typeof input!=='object')return authFailure('로그인 요청을 확인해 주세요.',400);
  const flow=await beginKakaoLogin(input.consent,input.challenge);
  const response=NextResponse.json({url:flow.url},{headers:{'Cache-Control':'no-store'}});
  response.cookies.set(KAKAO_COOKIE,flow.state,{httpOnly:true,sameSite:'lax',secure:origin.startsWith('https:'),path:KAKAO_PATH,maxAge:600});
  return response;
 }catch(e){return authFailure(kakaoAuthErrors[e instanceof KakaoAuthError?e.code:'kakao_failed'],503);}
}
