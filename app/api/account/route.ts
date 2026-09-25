import {NextRequest,NextResponse} from 'next/server';
import {compare} from 'bcryptjs';
import {sessionUser,authFailure,SESSION_COOKIE} from '../../../lib/auth';
import {appOrigin} from '../../../lib/google-auth';
import {firebaseAdminAuth,firebaseGoogleIdentity} from '../../../lib/firebase-server';
import {getPool} from '../../../lib/db';
import {deleteAccount} from '../../../lib/delete-account';
export const runtime='nodejs';
export const maxDuration=60;
export async function GET(request:NextRequest){
 try{
  const user=await sessionUser(request);if(!user)return authFailure('로그인이 필요해요.',401);
  const google=(await getPool().query("SELECT 1 FROM oauth_accounts WHERE user_id=$1 AND provider='google'",[user.id])).rowCount;
  return NextResponse.json({user,method:google?'google':'password'},{headers:{'Cache-Control':'no-store'}});
 }catch{return authFailure('계정 정보를 확인하지 못했어요.',503);}
}
export async function DELETE(request:NextRequest){
 try{
  if(request.headers.get('origin')!==appOrigin())return authFailure('요청을 확인해 주세요.',403);
  const user=await sessionUser(request);if(!user)return authFailure('로그인이 필요해요.',401);
  const input=await request.json().catch(()=>null);
  if(input?.confirmation!=='회원 탈퇴'||input?.userId!==user.id)return authFailure('계정과 확인 문구를 확인해 주세요.',400);
  const google=(await getPool().query("SELECT provider_subject FROM oauth_accounts WHERE user_id=$1 AND provider='google'",[user.id])).rows[0];
  let removeIdentity=async()=>{};
  if(google){
   if(typeof input.idToken!=='string'||input.idToken.length>16384)return authFailure('구글로 본인 확인을 다시 해주세요.',401);
   let identity;
   try{identity=firebaseGoogleIdentity(await firebaseAdminAuth().verifyIdToken(input.idToken));}catch{return authFailure('구글 본인 확인이 만료됐어요.',401);}
   if(identity.subject!==google.provider_subject)return authFailure('탈퇴할 계정과 같은 구글 계정을 선택해 주세요.',403);
   const key=process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
   if(!key)return authFailure('인증 정보 삭제 설정을 확인해야 합니다.',503);
   removeIdentity=async()=>{
    const result=await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:delete?key=${encodeURIComponent(key)}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({idToken:input.idToken}),signal:AbortSignal.timeout(15000)});
    if(!result.ok)throw new Error('구글 인증 정보 삭제에 실패했어요. 다시 본인 확인해 주세요.');
   };
  }else{
   if(typeof input.password!=='string'||input.password.length>200)return authFailure('비밀번호를 확인해 주세요.',401);
   const account=(await getPool().query('SELECT password_hash FROM users WHERE id=$1',[user.id])).rows[0];
   if(!account?.password_hash||!await compare(input.password,account.password_hash))return authFailure('비밀번호가 일치하지 않아요.',401);
  }
  await deleteAccount(user.id,removeIdentity);
  const response=NextResponse.json({deleted:true},{headers:{'Cache-Control':'no-store','Clear-Site-Data':'"cache", "storage"'}});
  response.cookies.set(SESSION_COOKIE,'',{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',path:'/',maxAge:0});
  return response;
 }catch{return authFailure('탈퇴 처리를 완료하지 못했어요. 다시 시도하거나 문의해 주세요. 일부 사진은 먼저 삭제되었을 수 있습니다.',503);}
}
