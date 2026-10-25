import {NextRequest,NextResponse} from 'next/server';
import {appOrigin,GoogleAuthError} from '../../../../../lib/google-auth';
import {authFailure,createSession} from '../../../../../lib/auth';
import {consumeKakaoAttempt,exchangeKakaoCode,kakaoUser,kakaoReturnPath,KakaoAuthError,KAKAO_COOKIE,KAKAO_PATH} from '../../../../../lib/kakao-auth';
import type {KakaoAuthErrorCode} from '../../../../../lib/auth-messages';
export const runtime='nodejs';
export const maxDuration=60;
function finish(response:NextResponse,origin:string){
 response.cookies.set(KAKAO_COOKIE,'',{httpOnly:true,sameSite:'lax',secure:origin.startsWith('https:'),path:KAKAO_PATH,maxAge:0});
 response.headers.set('Cache-Control','no-store');response.headers.set('Referrer-Policy','no-referrer');return response;
}
export async function GET(request:NextRequest){
 let origin:string;try{origin=appOrigin();}catch{return authFailure('카카오 로그인 설정을 확인해 주세요.',503);}
 let challenge:string|null=null;
 try{
  const params=request.nextUrl.searchParams;
  const attempt=await consumeKakaoAttempt(params.get('state'),request.cookies.get(KAKAO_COOKIE)?.value);challenge=attempt.mobile_challenge;
  if(params.has('error'))throw new KakaoAuthError(params.get('error')==='access_denied'?'kakao_cancelled':'kakao_failed');
  const identity=await exchangeKakaoCode(params.get('code')??'');
  const user=await kakaoUser(identity,attempt.consent);
  return finish(await createSession(user,NextResponse.redirect(new URL(kakaoReturnPath(challenge),origin),303)),origin);
 }catch(e){
  const code:KakaoAuthErrorCode=e instanceof KakaoAuthError?e.code:e instanceof GoogleAuthError&&e.code==='google_consent_required'?'kakao_consent_required':'kakao_failed';
  return finish(NextResponse.redirect(new URL(kakaoReturnPath(challenge,code),origin),303),origin);
 }
}
