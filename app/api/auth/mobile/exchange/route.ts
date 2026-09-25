import {NextRequest} from 'next/server';
import {authFailure,createSession} from '../../../../../lib/auth';
import {appOrigin} from '../../../../../lib/google-auth';
import {consumeMobileCode} from '../../../../../lib/mobile-login';
export const runtime='nodejs';
export async function POST(request:NextRequest){
 try{
  if(request.headers.get('origin')!==appOrigin())return authFailure('요청을 확인해 주세요.',403);
  const input=await request.json().catch(()=>null);
  const user=await consumeMobileCode(input?.code,input?.verifier);
  if(!user)return authFailure('앱 로그인 연결이 만료됐어요. 다시 시작해 주세요.',401);
  return await createSession(user);
 }catch{return authFailure('앱 로그인 연결에 실패했어요.',503);}
}
